from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import csv
import io
import re
import urllib.parse
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="Opportunity Pricing Engine")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Admin password
ADMIN_PASSWORD = "Amr123"

# ==================== MODELS ====================

class RoleModel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    hourly_rate: float
    monthly_salary: float = 0
    social_insurance: float = 0  # Calculated from salary
    end_of_service: float = 0    # Calculated from salary
    medical_insurance: float = 0  # Calculated from salary
    total_monthly_cost: float = 0  # Salary + benefits
    department: str = ""
    description: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RoleCreate(BaseModel):
    name: str
    hourly_rate: float
    monthly_salary: float = 0
    department: str = ""
    description: str = ""

class HRConfigModel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "hr_config"
    # Legacy fields kept optional for backward compatibility (not used anymore - Total Monthly comes from Sheet)
    social_insurance_percent: float = 0
    medical_insurance_percent: float = 0
    end_of_service_divisor: float = 0
    # Seconded/Per-Project markup percentage
    seconded_markup_percent: float = 20  # Default 20% increase for seconded employees
    # Active fields - Google Sheets Integration
    google_sheets_enabled: bool = False
    google_sheets_url: str = ""
    google_sheets_tab: str = "Average Emp. Salary"  # Tab name in sheet
    google_sheets_products_tab: str = "Products Pricing"  # New field
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class HRConfigUpdate(BaseModel):
    # Legacy fields - optional, defaults to 0 (not used anymore)
    social_insurance_percent: Optional[float] = 0
    medical_insurance_percent: Optional[float] = 0
    end_of_service_divisor: Optional[float] = 0
    # Seconded markup
    seconded_markup_percent: float = 20
    # Active fields
    google_sheets_enabled: bool = False
    google_sheets_url: str = ""
    google_sheets_tab: str = "Average Emp. Salary"
    google_sheets_products_tab: str = "Products Pricing"

# Google Sheets cache
sheets_cache = {
    "data": None,
    "timestamp": None,
    "url": None
}
CACHE_TTL_SECONDS = 300  # 5 minutes cache


def _extract_spreadsheet_id(sheet_url: str) -> str:
    parts = sheet_url.split("/d/")
    if len(parts) < 2:
        raise ValueError("Invalid Google Sheets URL format")
    return parts[1].split("/")[0].split("#")[0].split("?")[0]


def _extract_spreadsheet_gid(sheet_url: str) -> Optional[str]:
    match = re.search(r"[#?&]gid=(\d+)", sheet_url)
    return match.group(1) if match else None


def _hr_config_from_env() -> Dict[str, Any]:
    sheet_url = os.environ.get("GOOGLE_SHEETS_URL", "").strip()
    enabled_raw = os.environ.get("GOOGLE_SHEETS_ENABLED", "").strip().lower()
    enabled = enabled_raw in ("1", "true", "yes")
    if sheet_url and enabled_raw == "":
        enabled = True
    return {
        "id": "hr_config",
        "google_sheets_enabled": enabled,
        "google_sheets_url": sheet_url,
        "google_sheets_tab": os.environ.get("GOOGLE_SHEETS_TAB", "Average Emp. Salary"),
        "google_sheets_products_tab": os.environ.get(
            "GOOGLE_SHEETS_PRODUCTS_TAB", "Products Pricing"
        ),
    }


async def _get_hr_config() -> Dict[str, Any]:
    try:
        config = await db.hr_config.find_one({}, {"_id": 0})
        if config:
            return config
    except Exception as exc:
        logger.warning("Could not read hr_config from database: %s", exc)
    return _hr_config_from_env()


async def _fetch_google_sheet_csv(
    sheet_url: str, tab_name: str = "", gid: str = ""
) -> str:
    sheet_id = _extract_spreadsheet_id(sheet_url)
    gid = (gid or _extract_spreadsheet_gid(sheet_url) or "").strip()
    tab_name = (tab_name or "").strip()

    urls: List[str] = []
    if tab_name:
        encoded_tab = urllib.parse.quote(tab_name)
        urls.append(
            f"https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq?tqx=out:csv&sheet={encoded_tab}"
        )
    if gid:
        urls.append(
            f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv&gid={gid}"
        )
    if not urls:
        urls.append(
            f"https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq?tqx=out:csv"
        )

    last_error: Optional[Exception] = None
    async with httpx.AsyncClient() as client:
        for csv_url in urls:
            try:
                response = await client.get(csv_url, follow_redirects=True, timeout=30)
                response.raise_for_status()
                if response.text and response.text.strip():
                    return response.text
            except Exception as exc:
                last_error = exc
    raise last_error or RuntimeError("Failed to fetch Google Sheet")


def _parse_average_salary_rows(content: str) -> List[Dict[str, Any]]:
    all_rows = list(csv.reader(io.StringIO(content)))
    data_rows = all_rows[5:] if len(all_rows) > 5 else all_rows

    roles_data: List[Dict[str, Any]] = []
    for row in data_rows:
        if not row or len(row) < 4:
            continue

        role_name = (row[0] or "").strip()
        department = (row[1] or "").strip() if len(row) > 1 else ""
        hourly_rate_str = (row[2] or "").strip() if len(row) > 2 else "0"
        total_monthly_str = (row[3] or "").strip() if len(row) > 3 else "0"

        if not role_name or role_name.lower().startswith("job title"):
            continue

        try:
            hourly_rate = float(
                "".join(c for c in hourly_rate_str if c.isdigit() or c == ".") or "0"
            )
            total_monthly = float(
                "".join(c for c in total_monthly_str if c.isdigit() or c == ".") or "0"
            )
        except (ValueError, TypeError):
            hourly_rate = 0
            total_monthly = 0

        roles_data.append(
            {
                "role_name": role_name,
                "department": department,
                "hourly_rate": round(hourly_rate, 2),
                "total_monthly": round(total_monthly, 2),
            }
        )

    return roles_data


def _stable_role_id(role_name: str) -> str:
    normalized = (role_name or "").strip()
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"sheet-role:{normalized}"))


def _map_sheet_rows_to_api_roles(
    sheet_rows: List[Dict[str, Any]], mongo_name_to_id: Dict[str, str]
) -> List[Dict[str, Any]]:
    api_roles: List[Dict[str, Any]] = []
    for row in sheet_rows:
        role_name = (row.get("role_name") or "").strip()
        if not role_name:
            continue

        total_monthly = float(row.get("total_monthly") or 0)
        hourly_rate = float(row.get("hourly_rate") or 0)
        if hourly_rate == 0 and total_monthly > 0:
            hourly_rate = round(total_monthly / 176, 2)

        api_roles.append(
            {
                "id": mongo_name_to_id.get(role_name) or _stable_role_id(role_name),
                "name": role_name,
                "department": (row.get("department") or "").strip(),
                "hourly_rate": hourly_rate,
                "monthly_salary": total_monthly,
                "total_monthly_cost": total_monthly,
                "social_insurance": 0,
                "medical_insurance": 0,
                "end_of_service": 0,
                "description": "",
                "source": "google_sheet",
            }
        )
    return api_roles


# ==================== SALES DASHBOARD DATA ====================

SALES_DASHBOARD_SHEET_ID = "1tmeFdbc887Bn7UpsWFLvZpGYnC8huGe8qBetSWYkQYA"
SALES_DASHBOARD_TABS = {
    "intake": {"sheet": "Intake_Record", "header_row": 2, "data_row": 3},
    "qualification": {"sheet": "Opportunities_Qualification", "header_row": 2, "data_row": 3},
    "pipeline": {"sheet": "BDsMastersheet", "header_row": 0, "data_row": 1},
    "validation": {"sheet": "Lists_Validation", "header_row": 0, "data_row": 1},
}

sales_dashboard_cache = {
    "data": None,
    "timestamp": None,
}


def _clean_sales_header(header: str) -> str:
    header = (header or "").replace("\r", " ").replace("\n", " ").strip()
    header = re.sub(r"^[xyz]\s+", "", header, flags=re.IGNORECASE).strip()
    if "/" in header:
        header = header.split("/")[-1].strip()
    header = re.sub(r"\s+", " ", header)
    return header


def _cell(row: List[str], index: int) -> str:
    return row[index].strip() if index < len(row) and row[index] is not None else ""


def _parse_sales_number(value: Any) -> float:
    if value is None:
        return 0.0
    text = str(value).strip()
    if not text:
        return 0.0
    text = text.replace(",", "").replace("SAR", "").replace("%", "")
    text = re.sub(r"[^\d.\-]", "", text)
    try:
        return float(text) if text else 0.0
    except ValueError:
        return 0.0


def _extract_products_pricing_rows(content: str) -> List[Dict[str, Any]]:
    parsed_rows: List[Dict[str, Any]] = []
    reader = csv.reader(io.StringIO(content))
    current_section_name = ""
    current_product_name = ""

    for row in reader:
        cells = [(cell or "").strip() for cell in row]
        if not any(cells):
            continue

        # Section usually appears in column B (index 1)
        if len(cells) > 1 and cells[1]:
            section_candidate = re.sub(r"\s+", " ", cells[1]).strip()
            compact_section = re.sub(r"[^a-zA-Z]", "", section_candidate).lower()
            if "section" in compact_section:
                current_section_name = section_candidate
            elif len(section_candidate) > 4 and not re.search(r"(tiny|standard|big|mega|نطاق)", section_candidate, re.IGNORECASE):
                # Fallback for sheets where section header is plain text without explicit "section"
                current_section_name = section_candidate

        # Product title usually appears in column C (index 2)
        if len(cells) > 2 and cells[2]:
            product_candidate = re.sub(r"\s+", " ", cells[2]).strip()
            if not re.search(r"\b(tiny|standard|big|mega)\b", product_candidate, re.IGNORECASE):
                current_product_name = product_candidate

        size_idx = -1
        size_value = ""
        for idx, cell in enumerate(cells):
            match = re.search(r"\b(tiny|standard|big|mega)\b", cell, re.IGNORECASE)
            if match:
                size_idx = idx
                size_value = match.group(1).lower()
                break

        if size_idx == -1 or not current_product_name:
            continue

        roles: List[Dict[str, Any]] = []
        i = size_idx + 1
        while i < len(cells) - 1:
            role_name = re.sub(r"\s+", " ", cells[i]).strip()
            raw_hours = (cells[i + 1] or "").replace(",", "").strip()

            if role_name:
                try:
                    hours = float(raw_hours) if raw_hours else 0.0
                except ValueError:
                    hours = 0.0
                normalized_role = re.sub(r"\s+", " ", role_name).strip().lower()
                if hours > 0 and "sar" not in normalized_role and role_name != "0":
                    roles.append({"role_name": role_name, "hours": round(hours, 2)})
            i += 2

        if roles:
            parsed_rows.append({
                "section_name": current_section_name or "General",
                "product_name": current_product_name,
                "size": size_value,
                "roles": roles,
            })

    return parsed_rows


def _derive_section_from_product_name(product_name: str) -> str:
    text = re.sub(r"\s+", " ", (product_name or "")).strip()
    if not text:
        return "General"
    if ":" in text:
        left = text.split(":", 1)[0].strip()
        if left:
            return left
    if "-" in text:
        left = text.split("-", 1)[0].strip()
        if left and len(left) > 3:
            return left
    words = [w for w in text.split(" ") if w]
    if words:
        return " ".join(words[:3]).strip()
    return "General"


def _normalize_probability(value: Any) -> float:
    probability = _parse_sales_number(value)
    if probability > 1:
        probability = probability / 100
    return max(0.0, min(probability, 1.0))


def _is_blank_sales_row(row: List[str]) -> bool:
    return not any((cell or "").strip() for cell in row)


def _normalize_sales_rows(kind: str, rows: List[List[str]], header_row: int, data_row: int) -> List[Dict[str, Any]]:
    headers = rows[header_row] if len(rows) > header_row else []
    normalized = []

    for row_number, row in enumerate(rows[data_row:], start=data_row + 1):
        if _is_blank_sales_row(row):
            continue

        raw = {}
        for index, value in enumerate(row):
            if index >= len(headers):
                continue
            header = _clean_sales_header(headers[index])
            if header:
                raw[header] = value.strip() if value is not None else ""

        if kind == "intake":
            record = {
                "row_number": row_number,
                "intake_id": _cell(row, 0),
                "creation_date": _cell(row, 1),
                "created_by": _cell(row, 2),
                "received_date": _cell(row, 3),
                "portfolio_name": _cell(row, 4),
                "entry_type": _cell(row, 5),
                "lifecycle_stage": _cell(row, 6),
                "source_category": _cell(row, 7),
                "referral_name": _cell(row, 8),
                "organization_name": _cell(row, 9),
                "person_name": _cell(row, 10),
                "job_title": _cell(row, 11),
                "email": _cell(row, 12),
                "mobile": _cell(row, 13),
                "country": _cell(row, 14),
                "followup_status": _cell(row, 15),
                "next_followup_date": _cell(row, 16),
                "next_action": _cell(row, 17),
                "current_outcome": _cell(row, 18),
                "notes": _cell(row, 19),
                "converted_date": _cell(row, 20),
                "raw": raw,
            }
            if record["intake_id"]:
                normalized.append(record)

        elif kind == "qualification":
            record = {
                "row_number": row_number,
                "opportunity_id": _cell(row, 0),
                "intake_id": _cell(row, 1),
                "creation_date": _cell(row, 2),
                "created_by": _cell(row, 3),
                "portfolio_name": _cell(row, 4),
                "opportunity_source": _cell(row, 5),
                "opportunity_type": _cell(row, 6),
                "person_name": _cell(row, 7),
                "email": _cell(row, 8),
                "mobile": _cell(row, 9),
                "doc_no": _cell(row, 10),
                "customer_segment": _cell(row, 11),
                "occasion": _cell(row, 12),
                "industry": _cell(row, 13),
                "organization_name": _cell(row, 14),
                "opportunity_name": _cell(row, 15),
                "project_services": _cell(row, 16),
                "scope": _cell(row, 17),
                "creative_proposal_required": _cell(row, 18),
                "customer_due_date": _cell(row, 19),
                "qualification_status": _cell(row, 22),
                "priority": _cell(row, 23),
                "bd_rep": _cell(row, 24) or _cell(row, 31),
                "proposal_deadline": _cell(row, 25) or _cell(row, 26),
                "notes": _cell(row, 27),
                "disqualification_reason": _cell(row, 29),
                "disqualification_reason_description": _cell(row, 30),
                "assign_opportunity_to_team": _cell(row, 32),
                "bd_rep_email": _cell(row, 33),
                "data_audit": _cell(row, 37),
                "raw": raw,
            }
            if record["opportunity_id"] or record["intake_id"]:
                normalized.append(record)

        elif kind == "pipeline":
            probability = _normalize_probability(_cell(row, 23))
            expected_revenue = _parse_sales_number(_cell(row, 22))
            service_cost = _parse_sales_number(_cell(row, 29))
            actual_revenue = _parse_sales_number(_cell(row, 39))
            record = {
                "row_number": row_number,
                "opportunity_id": _cell(row, 0),
                "bd_rep": _cell(row, 1),
                "qualification_date": _cell(row, 2),
                "opportunity_source": _cell(row, 3),
                "person_name": _cell(row, 4),
                "email": _cell(row, 5),
                "mobile": _cell(row, 6),
                "doc_no": _cell(row, 7),
                "package_link": _cell(row, 8),
                "customer_segment": _cell(row, 9),
                "occasion": _cell(row, 10),
                "industry": _cell(row, 11),
                "organization_name": _cell(row, 12),
                "opportunity_name": _cell(row, 13),
                "project_services": _cell(row, 14),
                "scope": _cell(row, 15),
                "creative_proposal_required": _cell(row, 16),
                "due_date": _cell(row, 17),
                "proposal_deadline": _cell(row, 18),
                "award_date": _cell(row, 19),
                "notes": _cell(row, 20),
                "opportunity_description": _cell(row, 21),
                "expected_revenue": expected_revenue,
                "probability": probability,
                "opportunity_stage": _cell(row, 24),
                "proposal_status": _cell(row, 25),
                "completed_progress": _cell(row, 26),
                "approval_status": _cell(row, 27),
                "approval_comments": _cell(row, 28),
                "service_cost": service_cost,
                "proposed_project_price": _parse_sales_number(_cell(row, 30)),
                "expected_profit_margin": _parse_sales_number(_cell(row, 31)),
                "submission_date": _cell(row, 32),
                "work_done_today": _cell(row, 33),
                "planned_next_action": _cell(row, 34),
                "next_step_date": _cell(row, 35),
                "support_needed": _cell(row, 36),
                "close_date": _cell(row, 37),
                "win_reason": _cell(row, 38),
                "actual_revenue": actual_revenue,
                "lost_reason": _cell(row, 40) or _cell(row, 41),
                "lost_reason_description": _cell(row, 41),
                "competing_company": _cell(row, 42),
                "competitor_price": _parse_sales_number(_cell(row, 43)),
                "blocked_by": _cell(row, 44),
                "days_on_opportunity": _parse_sales_number(_cell(row, 45)),
                "last_update_date": _cell(row, 46),
                "portfolio_name": _cell(row, 47),
                "weighted_revenue": round(expected_revenue * probability, 2),
                "raw": raw,
            }
            if record["opportunity_id"]:
                normalized.append(record)

        elif kind == "validation":
            normalized.append(raw)

    return normalized


async def _fetch_sales_dashboard_sheet(kind: str, config: Dict[str, Any]) -> List[Dict[str, Any]]:
    encoded_sheet = urllib.parse.quote(config["sheet"])
    url = (
        f"https://docs.google.com/spreadsheets/d/{SALES_DASHBOARD_SHEET_ID}/gviz/tq"
        f"?tqx=out:csv&sheet={encoded_sheet}"
    )
    async with httpx.AsyncClient() as http_client:
        response = await http_client.get(url, follow_redirects=True, timeout=30)
        response.raise_for_status()

    rows = list(csv.reader(io.StringIO(response.text)))
    return _normalize_sales_rows(kind, rows, config["header_row"], config["data_row"])


def _unique_sorted(values: List[str]) -> List[str]:
    cleaned = sorted({value.strip() for value in values if value and value.strip()})
    return cleaned


@api_router.get("/sales-dashboard/data", response_model=Dict)
async def get_sales_dashboard_data(force_refresh: bool = False):
    current_time = datetime.now(timezone.utc)
    if (
        not force_refresh
        and sales_dashboard_cache["data"] is not None
        and sales_dashboard_cache["timestamp"] is not None
        and (current_time - sales_dashboard_cache["timestamp"]).total_seconds() < CACHE_TTL_SECONDS
    ):
        return sales_dashboard_cache["data"]

    try:
        data = {}
        for kind, config in SALES_DASHBOARD_TABS.items():
            data[kind] = await _fetch_sales_dashboard_sheet(kind, config)

        options = {
            "portfolio_names": _unique_sorted(
                [r.get("portfolio_name", "") for r in data["intake"]]
                + [r.get("portfolio_name", "") for r in data["qualification"]]
                + [r.get("portfolio_name", "") for r in data["pipeline"]]
            ),
            "bd_reps": _unique_sorted(
                [r.get("bd_rep", "") for r in data["qualification"]]
                + [r.get("bd_rep", "") for r in data["pipeline"]]
            ),
            "opportunity_stages": _unique_sorted([r.get("opportunity_stage", "") for r in data["pipeline"]]),
            "source_categories": _unique_sorted(
                [r.get("source_category", "") for r in data["intake"]]
                + [r.get("opportunity_source", "") for r in data["qualification"]]
                + [r.get("opportunity_source", "") for r in data["pipeline"]]
            ),
            "customer_segments": _unique_sorted(
                [r.get("customer_segment", "") for r in data["qualification"]]
                + [r.get("customer_segment", "") for r in data["pipeline"]]
            ),
            "industries": _unique_sorted(
                [r.get("industry", "") for r in data["qualification"]]
                + [r.get("industry", "") for r in data["pipeline"]]
            ),
            "priorities": _unique_sorted([r.get("priority", "") for r in data["qualification"]]),
        }

        payload = {
            **data,
            "options": options,
            "source": "google_sheet",
            "sheet_id": SALES_DASHBOARD_SHEET_ID,
            "fetched_at": current_time.isoformat(),
            "counts": {
                "intake": len(data["intake"]),
                "qualification": len(data["qualification"]),
                "pipeline": len(data["pipeline"]),
                "validation": len(data["validation"]),
            },
        }
        sales_dashboard_cache["data"] = payload
        sales_dashboard_cache["timestamp"] = current_time
        return payload
    except httpx.HTTPError as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch sales dashboard sheet: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to prepare sales dashboard data: {str(e)}")

# ==================== PRICING GUIDELINES MODELS ====================

class PricingGuidelineModel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: str = "general"  # general, branding, campaign, digital, consulting, staffing
    deal_size: str = "standard"  # tiny, standard, big, mega
    deal_size_min: float = 0
    deal_size_max: float = 0
    min_margin: float = 15
    target_margin: float = 30
    premium_margin: float = 45
    min_internal_margin: float = 25
    min_vendor_margin: float = 10
    description: str = ""
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PricingGuidelineCreate(BaseModel):
    name: str
    category: str = "general"
    deal_size: str = "standard"
    deal_size_min: float = 0
    deal_size_max: float = 0
    min_margin: float = 15
    target_margin: float = 30
    premium_margin: float = 45
    min_internal_margin: float = 25
    min_vendor_margin: float = 10
    description: str = ""
    is_active: bool = True

# ==================== RISK CONFIGURATION MODELS ====================

class RiskLevelConfig(BaseModel):
    level: str  # none, low, medium, high
    multiplier: float = 1.0
    description: str = ""

class RiskConfigModel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "risk_config"
    # Risk level multipliers
    levels: Dict[str, float] = {
        "none": 1.0,
        "low": 1.05,
        "medium": 1.15,
        "high": 1.30
    }
    # Weights for risk factors
    complexity_weight: float = 0.4
    rush_weight: float = 0.35
    execution_weight: float = 0.25
    # Risk impact mode: "cost", "margin", "buffer"
    impact_mode: str = "buffer"
    # How risk affects pricing
    apply_to_internal: bool = True
    apply_to_vendor: bool = True
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RiskConfigUpdate(BaseModel):
    levels: Dict[str, float] = {
        "none": 1.0,
        "low": 1.05,
        "medium": 1.15,
        "high": 1.30
    }
    complexity_weight: float = 0.4
    rush_weight: float = 0.35
    execution_weight: float = 0.25
    impact_mode: str = "buffer"
    apply_to_internal: bool = True
    apply_to_vendor: bool = True

# ==================== RISK INPUT MODELS ====================

class RiskFactorsInput(BaseModel):
    complexity: str = "none"  # none, low, medium, high
    rush: str = "none"
    execution: str = "none"
    custom_multiplier: float = 0  # If > 0, overrides calculated risk

class ProductTemplateModel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    default_roles: List[Dict[str, Any]] = []  # [{role_id, default_hours}]
    avg_deal_size: float = 0
    standard_cm_percent: float = 30
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductTemplateCreate(BaseModel):
    name: str
    description: str = ""
    default_roles: List[Dict[str, Any]] = []
    avg_deal_size: float = 0
    standard_cm_percent: float = 30

class ScopeTemplateModel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    scope_type: str = "standard"  # standard, staffing
    default_products: List[str] = []  # product template IDs
    default_roles: List[Dict[str, Any]] = []  # Direct roles with hours (new format)
    default_vendors: List[Dict[str, Any]] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ScopeTemplateCreate(BaseModel):
    name: str
    description: str = ""
    scope_type: str = "standard"
    default_products: List[str] = []
    default_roles: List[Dict[str, Any]] = []  # Direct roles with hours
    default_vendors: List[Dict[str, Any]] = []

class VendorServiceModel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: str = ""
    default_markup_percent: float = 15
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class VendorServiceCreate(BaseModel):
    name: str
    category: str = ""
    default_markup_percent: float = 15

class PaymentTermModel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    advance_percent: float = 0
    payment_days: int = 30
    interest_rate: float = 0.08
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PaymentTermCreate(BaseModel):
    name: str
    advance_percent: float = 0
    payment_days: int = 30
    interest_rate: float = 0.08

class OverheadRateModel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    total_company_overhead: float = 500000
    total_billable_hours: float = 20000
    rate_per_hour: float = 25
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OverheadRateUpdate(BaseModel):
    total_company_overhead: float
    total_billable_hours: float

class SalesIncentiveModel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = "Default"
    percent: float = 5
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== INCENTIVE RULES MODELS ====================

class IncentiveRuleModel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    deal_size: str  # tiny, standard, big, mega
    role: str  # sales_rep, sales_manager
    # Phase-based incentives
    order_percent: float = 0  # Percentage on order/booking
    collection_percent: float = 0  # Percentage on collection
    order_fixed: float = 0  # Fixed amount on order (SAR)
    collection_fixed: float = 0  # Fixed amount on collection (SAR)
    max_cap: float = 0  # Maximum cap in SAR (0 = no cap)
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class IncentiveRuleCreate(BaseModel):
    deal_size: str
    role: str
    order_percent: float = 0
    collection_percent: float = 0
    order_fixed: float = 0
    collection_fixed: float = 0
    max_cap: float = 0
    is_active: bool = True

class IncentiveRuleUpdate(BaseModel):
    deal_size: str = ""
    role: str = ""
    order_percent: float = 0
    collection_percent: float = 0
    order_fixed: float = 0
    collection_fixed: float = 0
    max_cap: float = 0
    is_active: bool = True

class IncentiveMultipliersModel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "incentive_multipliers"
    existing_customer_multiplier: float = 0.9  # 10% discount for existing customers
    referral_multiplier: float = 0.5  # 50% discount for referrals
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class IncentiveMultipliersUpdate(BaseModel):
    existing_customer_multiplier: float = 0.9
    referral_multiplier: float = 0.5

class DealSizeRangeModel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "deal_size_ranges"
    tiny_min: float = 0
    tiny_max: float = 200000
    standard_min: float = 200000
    standard_max: float = 500000
    big_min: float = 500000
    big_max: float = 2000000
    mega_min: float = 2000000
    mega_max: float = 999999999
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RiskMultiplierModel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    level: str
    multiplier: float = 1.0
    description: str = ""

class RiskMultiplierCreate(BaseModel):
    level: str
    multiplier: float = 1.0
    description: str = ""

# Opportunity & Calculation Models
class TeamMemberInput(BaseModel):
    role_id: str
    role_name: str = ""
    quantity: int = 1  # Number of team members with this role
    hours: float = 0
    utilization_percent: float = 0
    duration_months: int = 1
    hourly_rate: float = 0
    monthly_salary: float = 0
    calc_mode: str = "hours"  # "hours" or "utilization"
    employee_type: str = "internal"  # "internal" or "seconded"
    # Seconded employee fields
    custom_salary: float = 0
    custom_allowance: float = 0
    admin_fee_percent: float = 0

class VendorInput(BaseModel):
    service_id: str = ""
    service_name: str
    quantity: int = 1  # Number of units
    unit_cost: float = 0  # Cost per unit
    cost: float = 0  # Total cost (legacy, will be quantity * unit_cost if not provided)
    unit: str = ""  # Unit type (e.g., "per day", "per session")
    markup_percent: float = 15

class ProductInput(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    template_id: str = ""
    team_members: List[TeamMemberInput] = []
    description: str = ""

class StaffingInput(BaseModel):
    role_id: str
    role_name: str = ""
    monthly_salary: float
    duration_months: int = 1
    allowance: float = 0
    admin_fee_percent: float = 10
    margin_percent: float = 20

class ScopeInput(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    template_id: str = ""
    scope_type: str = "standard"
    products: List[ProductInput] = []
    vendors: List[VendorInput] = []
    staffing: List[StaffingInput] = []
    tools_cost: float = 0
    extras_cost: float = 0

class OpportunityInput(BaseModel):
    client: str
    opportunity_name: str
    sales_owner: str = ""
    payment_term_id: str = ""
    risk_level: str = "Low"
    target_margin_percent: float = 30
    scopes: List[ScopeInput] = []

class OpportunityModel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client: str
    opportunity_name: str
    sales_owner: str = ""
    payment_term_id: str = ""
    risk_level: str = "Low"
    target_margin_percent: float = 30
    scopes: List[Dict[str, Any]] = []
    calculations: Dict[str, Any] = {}
    status: str = "draft"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SimpleCalculationInput(BaseModel):
    team_members: List[TeamMemberInput] = []
    vendors: List[VendorInput] = []
    target_margin_percent: float = 30
    internal_margin_percent: float = 30
    vendor_margin_percent: float = 15
    use_split_margins: bool = False
    # Risk factors
    internal_risk: RiskFactorsInput = RiskFactorsInput()
    vendor_risk: RiskFactorsInput = RiskFactorsInput()
    # Incentive inputs
    client_type: str = "new"  # "new" or "existing"
    lead_source: str = "direct"  # "direct" or "referral"

class ThemeSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "theme_settings"
    primary_color: str = "#0F172A"
    brand_color: str = "#4F46E5"
    success_color: str = "#10B981"
    warning_color: str = "#F59E0B"
    destructive_color: str = "#EF4444"
    logo_url: str = ""
    company_name: str = "OPE"
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ThemeSettingsUpdate(BaseModel):
    primary_color: str = "#0F172A"
    brand_color: str = "#4F46E5"
    success_color: str = "#10B981"
    warning_color: str = "#F59E0B"
    destructive_color: str = "#EF4444"
    logo_url: str = ""
    company_name: str = "OPE"

# ==================== ADMIN AUTH ====================

async def verify_admin(x_admin_password: str = Header(None)):
    if x_admin_password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid admin password")
    return True

# ==================== HELPER FUNCTIONS ====================

def serialize_doc(doc):
    """Remove MongoDB _id and convert datetime"""
    if doc is None:
        return None
    if '_id' in doc:
        del doc['_id']
    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
    return doc

async def get_overhead_rate():
    """Calculate overhead rate from settings"""
    overhead = await db.overhead_rates.find_one({}, {"_id": 0})
    if not overhead:
        return 25.0  # default
    if overhead.get('total_billable_hours', 0) > 0:
        return overhead['total_company_overhead'] / overhead['total_billable_hours']
    return 25.0

async def get_sales_incentive_percent():
    """Get sales incentive percentage"""
    incentive = await db.sales_incentives.find_one({}, {"_id": 0})
    return incentive.get('percent', 5) if incentive else 5

async def get_risk_config():
    """Get risk configuration"""
    config = await db.risk_config.find_one({}, {"_id": 0})
    if not config:
        config = RiskConfigModel().model_dump()
    return config

async def calculate_risk_multiplier(risk_input: RiskFactorsInput):
    """Calculate risk multiplier from risk factors"""
    if risk_input.custom_multiplier > 0:
        return risk_input.custom_multiplier
    
    config = await get_risk_config()
    levels = config.get('levels', {"none": 1.0, "low": 1.05, "medium": 1.15, "high": 1.30})
    
    # Get multipliers for each factor
    complexity_mult = levels.get(risk_input.complexity, 1.0)
    rush_mult = levels.get(risk_input.rush, 1.0)
    execution_mult = levels.get(risk_input.execution, 1.0)
    
    # Weighted combination
    w_complexity = config.get('complexity_weight', 0.4)
    w_rush = config.get('rush_weight', 0.35)
    w_execution = config.get('execution_weight', 0.25)
    
    # Calculate weighted risk multiplier
    weighted_risk = (
        (complexity_mult - 1) * w_complexity +
        (rush_mult - 1) * w_rush +
        (execution_mult - 1) * w_execution
    )
    
    return 1 + weighted_risk

def get_risk_level(multiplier: float) -> str:
    """Convert risk multiplier to level"""
    if multiplier <= 1.0:
        return "None"
    elif multiplier <= 1.08:
        return "Low"
    elif multiplier <= 1.20:
        return "Medium"
    else:
        return "High"

async def get_pricing_guidelines():
    """Get all pricing guidelines"""
    guidelines = await db.pricing_guidelines.find({}, {"_id": 0}).to_list(100)
    return guidelines

async def get_applicable_guideline(category: str, deal_size: float):
    """Get the most applicable pricing guideline"""
    guidelines = await db.pricing_guidelines.find(
        {"is_active": True},
        {"_id": 0}
    ).to_list(100)
    
    # Find best match
    best_match = None
    for g in guidelines:
        if g.get('category') == category or g.get('category') == 'general':
            if g.get('deal_size_min', 0) <= deal_size <= g.get('deal_size_max', float('inf')):
                if best_match is None or g.get('category') == category:
                    best_match = g
    
    return best_match

async def get_deal_size_category(selling_price: float) -> str:
    """Determine deal size category based on selling price"""
    ranges = await db.deal_size_ranges.find_one({}, {"_id": 0})
    if not ranges:
        # Default ranges
        ranges = {
            "tiny_min": 0, "tiny_max": 200000,
            "standard_min": 200000, "standard_max": 500000,
            "big_min": 500000, "big_max": 2000000,
            "mega_min": 2000000, "mega_max": 999999999
        }
    
    if selling_price < ranges.get('tiny_max', 200000):
        return "tiny"
    elif selling_price < ranges.get('standard_max', 500000):
        return "standard"
    elif selling_price < ranges.get('big_max', 2000000):
        return "big"
    else:
        return "mega"

async def get_incentive_rules():
    """Get all active incentive rules"""
    rules = await db.incentive_rules.find({"is_active": True}, {"_id": 0}).to_list(100)
    return rules

async def get_incentive_multipliers():
    """Get incentive multipliers configuration"""
    multipliers = await db.incentive_multipliers.find_one({}, {"_id": 0})
    if not multipliers:
        multipliers = {
            "existing_customer_multiplier": 0.9,
            "referral_multiplier": 0.5
        }
    return multipliers

async def calculate_incentives(selling_price: float, deal_size: str, client_type: str, lead_source: str):
    """
    Calculate incentives per role based on rules with Order/Collection phases.
    Returns a dict with incentives breakdown for sales_rep and sales_manager.
    """
    rules = await get_incentive_rules()
    multipliers = await get_incentive_multipliers()
    
    # Get multiplier based on client type and lead source
    client_multiplier = 1.0
    if client_type == "existing":
        client_multiplier *= multipliers.get('existing_customer_multiplier', 0.9)
    if lead_source == "referral":
        client_multiplier *= multipliers.get('referral_multiplier', 0.5)
    
    result = {
        "sales_rep": None,
        "sales_manager": None,
        "total_incentive": 0,
        "total_order_incentive": 0,
        "total_collection_incentive": 0,
        "total_percent": 0,
        "client_multiplier": client_multiplier,
        "client_type": client_type,
        "lead_source": lead_source,
        "deal_size": deal_size
    }
    
    for role in ["sales_rep", "sales_manager"]:
        # Find matching rule
        rule = None
        for r in rules:
            if r.get('deal_size') == deal_size and r.get('role') == role:
                rule = r
                break
        
        if rule:
            # Order phase calculation
            order_percent = rule.get('order_percent', 0) or rule.get('base_percent', 0) or 0
            order_fixed = rule.get('order_fixed', 0) or 0
            order_value = (selling_price * (order_percent / 100) * client_multiplier) + order_fixed
            
            # Collection phase calculation
            collection_percent = rule.get('collection_percent', 0) or 0
            collection_fixed = rule.get('collection_fixed', 0) or 0
            collection_value = (selling_price * (collection_percent / 100) * client_multiplier) + collection_fixed
            
            total_value = order_value + collection_value
            cap = rule.get('max_cap', 0)
            
            # Apply cap if defined
            if cap > 0 and total_value > cap:
                capped_value = cap
                # Proportionally reduce order/collection values
                ratio = cap / total_value if total_value > 0 else 0
                order_capped = order_value * ratio
                collection_capped = collection_value * ratio
            else:
                capped_value = total_value
                order_capped = order_value
                collection_capped = collection_value
            
            result[role] = {
                "order_percent": order_percent,
                "order_fixed": order_fixed,
                "order_value": round(order_value, 2),
                "order_capped": round(order_capped, 2),
                "collection_percent": collection_percent,
                "collection_fixed": collection_fixed,
                "collection_value": round(collection_value, 2),
                "collection_capped": round(collection_capped, 2),
                "total_value": round(total_value, 2),
                "capped_value": round(capped_value, 2),
                "cap": cap,
                "cap_applied": cap > 0 and total_value > cap
            }
            result["total_incentive"] += capped_value
            result["total_order_incentive"] += order_capped
            result["total_collection_incentive"] += collection_capped
        else:
            # No rule found, use 0
            result[role] = {
                "order_percent": 0,
                "order_fixed": 0,
                "order_value": 0,
                "order_capped": 0,
                "collection_percent": 0,
                "collection_fixed": 0,
                "collection_value": 0,
                "collection_capped": 0,
                "total_value": 0,
                "capped_value": 0,
                "cap": 0,
                "cap_applied": False
            }
    
    result["total_incentive"] = round(result["total_incentive"], 2)
    result["total_order_incentive"] = round(result["total_order_incentive"], 2)
    result["total_collection_incentive"] = round(result["total_collection_incentive"], 2)
    result["total_percent"] = round((result["total_incentive"] / selling_price * 100) if selling_price > 0 else 0, 4)
    
    return result

# ==================== CALCULATION ENGINE ====================

async def calculate_simple(data: SimpleCalculationInput):
    """Calculate pricing for simple mode with split margins, risk factors, and dynamic incentives"""
    overhead_rate = await get_overhead_rate()
    risk_config = await get_risk_config()
    
    # Get HR config for benefit calculations
    hr_config = await db.hr_config.find_one({}, {"_id": 0})
    if not hr_config:
        hr_config = {"social_insurance_percent": 12, "medical_insurance_percent": 3, "end_of_service_divisor": 2}
    
    # Calculate risk multipliers
    internal_risk_mult = await calculate_risk_multiplier(data.internal_risk)
    vendor_risk_mult = await calculate_risk_multiplier(data.vendor_risk)
    
    # Internal labor cost
    internal_labor_cost = 0
    total_hours = 0
    
    for member in data.team_members:
        member_cost = 0
        member_hours = 0
        
        if member.employee_type == 'seconded':
            role = await db.roles.find_one({"id": member.role_id}, {"_id": 0})
            role_monthly_cost = 0
            if role:
                role_monthly_cost = (
                    role.get('total_monthly_cost')
                    or role.get('monthly_salary')
                    or 0
                )

            base_salary = member.custom_salary or role_monthly_cost or member.monthly_salary or 0
            base_cost = base_salary + (member.custom_allowance or 0)
            default_seconded_markup = hr_config.get('seconded_markup_percent', 20)
            admin_fee_percent = member.admin_fee_percent if member.admin_fee_percent > 0 else default_seconded_markup
            with_admin_fee = base_cost * (1 + admin_fee_percent / 100)
            utilization = (member.utilization_percent or 100) / 100
            duration = member.duration_months or 1
            member_cost = with_admin_fee * utilization * duration
            member_hours = 176 * utilization * duration
        elif member.calc_mode == 'utilization':
            role = await db.roles.find_one({"id": member.role_id}, {"_id": 0})
            if role:
                salary = role.get('monthly_salary', 0)
                social_ins = salary * hr_config['social_insurance_percent'] / 100
                medical_ins = salary * hr_config['medical_insurance_percent'] / 100
                eos = salary / hr_config['end_of_service_divisor'] if hr_config['end_of_service_divisor'] > 0 else 0
                monthly_cost = salary + social_ins + medical_ins + eos
            else:
                monthly_cost = member.monthly_salary or 0
            
            utilization = (member.utilization_percent or 0) / 100
            duration = member.duration_months or 1
            member_cost = monthly_cost * utilization * duration
            member_hours = 176 * utilization * duration
        else:
            member_hours = member.hours if member.hours > 0 else 0
            member_cost = member_hours * (member.hourly_rate or 0)
        
        # Apply quantity multiplier
        quantity = getattr(member, 'quantity', 1) or 1
        member_cost *= quantity
        member_hours *= quantity
        
        internal_labor_cost += member_cost
        total_hours += member_hours
    
    # Vendor costs (with quantity support)
    vendor_cost = 0
    for v in data.vendors:
        qty = getattr(v, 'quantity', 1) or 1
        unit_cost = getattr(v, 'unit_cost', 0) or v.cost or 0
        vendor_cost += unit_cost * qty
    
    vendor_revenue = 0
    for v in data.vendors:
        qty = getattr(v, 'quantity', 1) or 1
        unit_cost = getattr(v, 'unit_cost', 0) or v.cost or 0
        total_cost = unit_cost * qty
        vendor_revenue += total_cost * (1 + v.markup_percent / 100)
    
    vendor_markup_revenue = vendor_revenue - vendor_cost
    
    # Overhead
    overhead_cost = total_hours * overhead_rate
    
    # Apply risk based on config mode
    internal_base_cost = internal_labor_cost + overhead_cost
    risk_impact_mode = risk_config.get('impact_mode', 'buffer')
    
    if risk_impact_mode == 'cost':
        # Risk increases the base cost
        if risk_config.get('apply_to_internal', True):
            internal_base_cost *= internal_risk_mult
        if risk_config.get('apply_to_vendor', True):
            vendor_cost *= vendor_risk_mult
    
    # Total COGS
    cogs = internal_labor_cost + vendor_cost + overhead_cost
    
    # ==================== NEW INCENTIVE CALCULATION ====================
    # Step 1: Estimate initial selling price to determine deal size
    margin_percent = data.target_margin_percent / 100
    
    # Estimate selling price (without incentive for deal size detection)
    estimated_price = cogs / (1 - margin_percent) if (1 - margin_percent) > 0 else cogs * 2
    
    # Step 2: Get deal size category
    deal_size = await get_deal_size_category(estimated_price)
    
    # Step 3: Get incentive rules for this deal size
    incentive_rules = await get_incentive_rules()
    multipliers = await get_incentive_multipliers()
    
    # Calculate client/lead multiplier
    client_multiplier = 1.0
    if data.client_type == "existing":
        client_multiplier *= multipliers.get('existing_customer_multiplier', 0.9)
    if data.lead_source == "referral":
        client_multiplier *= multipliers.get('referral_multiplier', 0.5)
    
    # Get base percentages for each role
    sales_rep_base = 0
    sales_rep_cap = 0
    sales_rep_order = 0
    sales_rep_collection = 0
    sales_manager_base = 0
    sales_manager_cap = 0
    sales_manager_order = 0
    sales_manager_collection = 0
    
    for rule in incentive_rules:
        if rule.get('deal_size') == deal_size:
            if rule.get('role') == 'sales_rep':
                sales_rep_order = rule.get('order_percent', 0) or rule.get('base_percent', 0) or 0
                sales_rep_collection = rule.get('collection_percent', 0) or 0
                sales_rep_base = sales_rep_order + sales_rep_collection
                sales_rep_cap = rule.get('max_cap', 0)
            elif rule.get('role') == 'sales_manager':
                sales_manager_order = rule.get('order_percent', 0) or rule.get('base_percent', 0) or 0
                sales_manager_collection = rule.get('collection_percent', 0) or 0
                sales_manager_base = sales_manager_order + sales_manager_collection
                sales_manager_cap = rule.get('max_cap', 0)
    
    # Apply multiplier to get adjusted percentages
    sales_rep_adjusted = sales_rep_base * client_multiplier
    sales_manager_adjusted = sales_manager_base * client_multiplier
    total_incentive_percent = (sales_rep_adjusted + sales_manager_adjusted) / 100
    
    # ==================== SELLING PRICE CALCULATION ====================
    # Formula: Selling_Price_Final = COGS / (1 - Target_Margin% - Total_Incentive_%)
    
    if data.use_split_margins:
        # SPLIT MARGIN LOGIC
        internal_margin = data.internal_margin_percent / 100
        vendor_margin = data.vendor_margin_percent / 100
        
        # Apply risk as margin buffer
        if risk_impact_mode == 'margin':
            internal_margin *= internal_risk_mult
            vendor_margin *= vendor_risk_mult
        
        # Internal selling price (includes incentive in divisor)
        divisor = 1 - internal_margin - total_incentive_percent
        if divisor > 0:
            internal_selling = internal_base_cost / divisor
        else:
            internal_selling = internal_base_cost * 2
        
        # Vendor selling price (if no markup applied, use vendor margin)
        has_markup = any(v.markup_percent > 0 for v in data.vendors)
        if has_markup:
            vendor_selling = vendor_revenue
        else:
            if (1 - vendor_margin) > 0:
                vendor_selling = vendor_cost / (1 - vendor_margin)
            else:
                vendor_selling = vendor_cost * 1.5
        
        # Apply risk buffer to price
        if risk_impact_mode == 'buffer':
            internal_selling *= internal_risk_mult
            vendor_selling *= vendor_risk_mult
        
        total_selling_price = internal_selling + vendor_selling
        
        # Calculate actual margins achieved
        internal_margin_achieved = ((internal_selling - internal_base_cost) / internal_selling * 100) if internal_selling > 0 else 0
        vendor_margin_achieved = ((vendor_selling - vendor_cost) / vendor_selling * 100) if vendor_selling > 0 else 0
    else:
        # UNIFIED MARGIN LOGIC
        if risk_impact_mode == 'margin':
            margin_percent *= max(internal_risk_mult, vendor_risk_mult)
        
        # Calculate selling price with incentive in divisor
        divisor = 1 - margin_percent - total_incentive_percent
        if divisor > 0:
            internal_selling = internal_base_cost / divisor
        else:
            internal_selling = internal_base_cost * 2
        
        total_selling_price = internal_selling + vendor_revenue
        
        if risk_impact_mode == 'buffer':
            avg_risk = (internal_risk_mult + vendor_risk_mult) / 2
            total_selling_price *= avg_risk
        
        internal_margin_achieved = data.target_margin_percent
        vendor_margin_achieved = (vendor_markup_revenue / vendor_revenue * 100) if vendor_revenue > 0 else 0
    
    # ==================== CALCULATE ACTUAL INCENTIVE VALUES ====================
    # Step 3: Calculate incentive values from final selling price
    sales_rep_value = total_selling_price * (sales_rep_adjusted / 100)
    sales_manager_value = total_selling_price * (sales_manager_adjusted / 100)
    
    # Step 4: Apply caps
    sales_rep_capped = min(sales_rep_value, sales_rep_cap) if sales_rep_cap > 0 else sales_rep_value
    sales_manager_capped = min(sales_manager_value, sales_manager_cap) if sales_manager_cap > 0 else sales_manager_value
    
    total_incentive = sales_rep_capped + sales_manager_capped
    effective_incentive_percent = (total_incentive / total_selling_price * 100) if total_selling_price > 0 else 0
    
    # ==================== CONTRIBUTION MARGIN ====================
    # Step 4: Contribution_Margin = Selling_Price_Final - COGS - Total_Incentive
    contribution_margin = total_selling_price - cogs - total_incentive
    contribution_margin_percent = (contribution_margin / total_selling_price * 100) if total_selling_price > 0 else 0
    
    # Blended margin
    total_cost = internal_base_cost + vendor_cost
    blended_margin = ((total_selling_price - total_cost) / total_selling_price * 100) if total_selling_price > 0 else 0
    
    # Combined risk score
    total_risk_mult = (internal_risk_mult + vendor_risk_mult) / 2
    risk_level = get_risk_level(total_risk_mult)
    risk_impact_percent = (total_risk_mult - 1) * 100
    
    # ==================== WARNINGS ====================
    warnings = []
    
    # Margin warnings
    guidelines = await db.pricing_guidelines.find_one({"category": "general", "is_active": True}, {"_id": 0})
    if guidelines:
        if contribution_margin_percent < guidelines.get('min_margin', 15):
            warnings.append({
                "type": "margin_low", 
                "message": f"هامش الربح {contribution_margin_percent:.1f}% أقل من الحد الأدنى {guidelines.get('min_margin', 15)}%", 
                "severity": "error"
            })
        elif contribution_margin_percent < guidelines.get('target_margin', 30):
            warnings.append({
                "type": "margin_below_target", 
                "message": f"هامش الربح {contribution_margin_percent:.1f}% أقل من الهدف {guidelines.get('target_margin', 30)}%", 
                "severity": "warning"
            })
    
    # Contribution margin negative warning
    if contribution_margin < 0:
        warnings.append({
            "type": "negative_margin",
            "message": "⚠️ هامش الربح سلبي! السعر منخفض جداً",
            "severity": "error"
        })
    
    # Risk warnings
    if total_risk_mult > 1.20:
        warnings.append({"type": "risk_high", "message": f"مخاطر المشروع عالية ({risk_level})", "severity": "warning"})
    
    if vendor_margin_achieved < 10 and vendor_cost > 0:
        warnings.append({"type": "vendor_margin_low", "message": f"هامش المورد {vendor_margin_achieved:.1f}% منخفض", "severity": "warning"})
    
    # No matching rule warning
    if sales_rep_base == 0 and sales_manager_base == 0:
        warnings.append({
            "type": "no_incentive_rule",
            "message": f"لا توجد قاعدة حوافز لحجم الصفقة '{deal_size}'",
            "severity": "warning"
        })
    
    return {
        "internal_labor_cost": round(internal_labor_cost, 2),
        "vendor_cost": round(vendor_cost, 2),
        "vendor_revenue": round(vendor_revenue, 2),
        "vendor_markup_revenue": round(vendor_markup_revenue, 2),
        "overhead_cost": round(overhead_cost, 2),
        "total_hours": round(total_hours, 2),
        "cogs": round(cogs, 2),
        "selling_price": round(total_selling_price, 2),
        # Incentive breakdown
        "incentive_breakdown": {
            "deal_size": deal_size,
            "client_type": data.client_type,
            "lead_source": data.lead_source,
            "client_multiplier": round(client_multiplier, 2),
            "sales_rep": {
                "base_percent": sales_rep_base,
                "order_percent": sales_rep_order,
                "collection_percent": sales_rep_collection,
                "adjusted_percent": round(sales_rep_adjusted, 2),
                "value": round(sales_rep_value, 2),
                "capped_value": round(sales_rep_capped, 2),
                "cap": sales_rep_cap,
                "cap_applied": sales_rep_cap > 0 and sales_rep_value > sales_rep_cap
            },
            "sales_manager": {
                "base_percent": sales_manager_base,
                "order_percent": sales_manager_order,
                "collection_percent": sales_manager_collection,
                "adjusted_percent": round(sales_manager_adjusted, 2),
                "value": round(sales_manager_value, 2),
                "capped_value": round(sales_manager_capped, 2),
                "cap": sales_manager_cap,
                "cap_applied": sales_manager_cap > 0 and sales_manager_value > sales_manager_cap
            },
            "total_incentive": round(total_incentive, 2),
            "effective_percent": round(effective_incentive_percent, 2)
        },
        "sales_incentive": round(total_incentive, 2),
        "sales_incentive_percent": round(effective_incentive_percent, 2),
        "contribution_margin": round(contribution_margin, 2),
        "contribution_margin_percent": round(contribution_margin_percent, 2),
        "total_profit": round(contribution_margin, 2),
        "overhead_rate": round(overhead_rate, 2),
        # Split margins
        "internal_margin_percent": round(internal_margin_achieved, 2),
        "vendor_margin_percent": round(vendor_margin_achieved, 2),
        "blended_margin_percent": round(blended_margin, 2),
        # Risk metrics
        "internal_risk_multiplier": round(internal_risk_mult, 3),
        "vendor_risk_multiplier": round(vendor_risk_mult, 3),
        "total_risk_multiplier": round(total_risk_mult, 3),
        "risk_level": risk_level,
        "risk_impact_percent": round(risk_impact_percent, 2),
        # Warnings
        "warnings": warnings
    }

async def calculate_opportunity(data: OpportunityInput):
    """Calculate full opportunity pricing"""
    overhead_rate = await get_overhead_rate()
    sales_incentive_percent = await get_sales_incentive_percent()
    
    # Get payment term
    payment_term = None
    if data.payment_term_id:
        payment_term = await db.payment_terms.find_one({"id": data.payment_term_id}, {"_id": 0})
    
    # Get risk multiplier
    risk_multiplier = 1.0
    risk_doc = await db.risk_multipliers.find_one({"level": data.risk_level}, {"_id": 0})
    if risk_doc:
        risk_multiplier = risk_doc.get('multiplier', 1.0)
    
    total_internal_labor = 0
    total_vendor_cost = 0
    total_vendor_revenue = 0
    total_hours = 0
    total_tools = 0
    total_extras = 0
    total_staffing_cost = 0
    total_staffing_revenue = 0
    scope_calculations = []
    
    for scope in data.scopes:
        scope_labor = 0
        scope_hours = 0
        scope_vendor_cost = 0
        scope_vendor_revenue = 0
        product_calculations = []
        
        # Products
        for product in scope.products:
            product_labor = 0
            product_hours = 0
            for member in product.team_members:
                hours = member.hours if member.hours > 0 else (member.utilization_percent / 100) * 176
                cost = hours * member.hourly_rate
                product_labor += cost
                product_hours += hours
            
            # Get product template for deal intelligence
            deal_status = "Healthy"
            avg_deal_size = 0
            standard_cm = 30
            if product.template_id:
                template = await db.product_templates.find_one({"id": product.template_id}, {"_id": 0})
                if template:
                    avg_deal_size = template.get('avg_deal_size', 0)
                    standard_cm = template.get('standard_cm_percent', 30)
            
            product_calculations.append({
                "id": product.id,
                "name": product.name,
                "labor_cost": round(product_labor, 2),
                "hours": round(product_hours, 2),
                "avg_deal_size": avg_deal_size,
                "standard_cm_percent": standard_cm,
                "deal_status": deal_status
            })
            
            scope_labor += product_labor
            scope_hours += product_hours
        
        # Vendors
        for vendor in scope.vendors:
            scope_vendor_cost += vendor.cost
            scope_vendor_revenue += vendor.cost * (1 + vendor.markup_percent / 100)
        
        # Staffing
        staffing_calculations = []
        for staff in scope.staffing:
            staff_cost = (staff.monthly_salary + staff.allowance) * staff.duration_months
            staff_admin_fee = staff_cost * (staff.admin_fee_percent / 100)
            staff_total_cost = staff_cost + staff_admin_fee
            staff_revenue = staff_total_cost * (1 + staff.margin_percent / 100)
            
            staffing_calculations.append({
                "role_name": staff.role_name,
                "base_cost": round(staff_cost, 2),
                "admin_fee": round(staff_admin_fee, 2),
                "total_cost": round(staff_total_cost, 2),
                "revenue": round(staff_revenue, 2),
                "profit": round(staff_revenue - staff_total_cost, 2)
            })
            
            total_staffing_cost += staff_total_cost
            total_staffing_revenue += staff_revenue
        
        scope_overhead = scope_hours * overhead_rate
        
        scope_calculations.append({
            "id": scope.id,
            "name": scope.name,
            "scope_type": scope.scope_type,
            "labor_cost": round(scope_labor, 2),
            "hours": round(scope_hours, 2),
            "vendor_cost": round(scope_vendor_cost, 2),
            "vendor_revenue": round(scope_vendor_revenue, 2),
            "tools_cost": scope.tools_cost,
            "extras_cost": scope.extras_cost,
            "overhead_cost": round(scope_overhead, 2),
            "products": product_calculations,
            "staffing": staffing_calculations
        })
        
        total_internal_labor += scope_labor
        total_hours += scope_hours
        total_vendor_cost += scope_vendor_cost
        total_vendor_revenue += scope_vendor_revenue
        total_tools += scope.tools_cost
        total_extras += scope.extras_cost
    
    # Total overhead
    total_overhead = total_hours * overhead_rate
    
    # Total COGS (excluding staffing which has separate pricing)
    cogs = total_internal_labor + total_vendor_cost + total_overhead + total_tools + total_extras + total_staffing_cost
    
    # Apply risk multiplier to COGS
    cogs_with_risk = cogs * risk_multiplier
    
    # Calculate selling price
    margin_percent = data.target_margin_percent / 100
    sales_percent = sales_incentive_percent / 100
    
    if (1 - margin_percent - sales_percent) > 0:
        internal_selling_base = (total_internal_labor + total_overhead + total_tools + total_extras) / (1 - margin_percent - sales_percent)
    else:
        internal_selling_base = (total_internal_labor + total_overhead + total_tools + total_extras) * 2
    
    # Apply risk multiplier
    internal_selling_base *= risk_multiplier
    
    total_selling_price = internal_selling_base + total_vendor_revenue + total_staffing_revenue
    
    # Sales incentive
    sales_incentive = total_selling_price * sales_percent
    
    # Financing impact
    financing_cost = 0
    if payment_term:
        advance_percent = payment_term.get('advance_percent', 0) / 100
        advance_payment = total_selling_price * advance_percent
        remaining_cost = cogs_with_risk - advance_payment
        if remaining_cost > 0:
            payment_days = payment_term.get('payment_days', 30)
            interest_rate = payment_term.get('interest_rate', 0.08)
            financing_cost = remaining_cost * interest_rate * payment_days / 365
    
    # Margins
    contribution_margin = total_selling_price - cogs_with_risk - sales_incentive
    contribution_margin_percent = (contribution_margin / total_selling_price * 100) if total_selling_price > 0 else 0
    
    operating_margin = contribution_margin - financing_cost
    operating_margin_percent = (operating_margin / total_selling_price * 100) if total_selling_price > 0 else 0
    
    net_profit = operating_margin
    net_profit_percent = (net_profit / total_selling_price * 100) if total_selling_price > 0 else 0
    
    # Deal intelligence for each product
    for scope_calc in scope_calculations:
        for product_calc in scope_calc['products']:
            product_revenue_share = (product_calc['labor_cost'] / total_internal_labor * internal_selling_base) if total_internal_labor > 0 else 0
            product_cm = (product_revenue_share - product_calc['labor_cost']) / product_revenue_share * 100 if product_revenue_share > 0 else 0
            
            # Compare with standard
            if product_calc['avg_deal_size'] > 0 and product_revenue_share < product_calc['avg_deal_size'] * 0.7:
                product_calc['deal_status'] = "Underpriced"
            elif product_cm < product_calc['standard_cm_percent'] * 0.8:
                product_calc['deal_status'] = "Risk"
            else:
                product_calc['deal_status'] = "Healthy"
            
            product_calc['estimated_revenue'] = round(product_revenue_share, 2)
            product_calc['estimated_cm_percent'] = round(product_cm, 2)
    
    return {
        "scopes": scope_calculations,
        "summary": {
            "total_revenue": round(total_selling_price, 2),
            "internal_labor_cost": round(total_internal_labor, 2),
            "vendor_cost": round(total_vendor_cost, 2),
            "vendor_revenue": round(total_vendor_revenue, 2),
            "vendor_markup": round(total_vendor_revenue - total_vendor_cost, 2),
            "staffing_cost": round(total_staffing_cost, 2),
            "staffing_revenue": round(total_staffing_revenue, 2),
            "staffing_profit": round(total_staffing_revenue - total_staffing_cost, 2),
            "overhead_cost": round(total_overhead, 2),
            "tools_cost": round(total_tools, 2),
            "extras_cost": round(total_extras, 2),
            "total_hours": round(total_hours, 2),
            "cogs": round(cogs, 2),
            "cogs_with_risk": round(cogs_with_risk, 2),
            "risk_multiplier": risk_multiplier,
            "sales_incentive": round(sales_incentive, 2),
            "financing_cost": round(financing_cost, 2),
            "contribution_margin": round(contribution_margin, 2),
            "contribution_margin_percent": round(contribution_margin_percent, 2),
            "operating_margin": round(operating_margin, 2),
            "operating_margin_percent": round(operating_margin_percent, 2),
            "net_profit": round(net_profit, 2),
            "net_profit_percent": round(net_profit_percent, 2),
            "overhead_rate": round(overhead_rate, 2),
            "sales_incentive_percent": sales_incentive_percent
        }
    }

# ==================== API ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "Opportunity Pricing Engine API", "version": "1.0.0"}

# ---------- ROLES ----------
@api_router.get("/roles", response_model=List[Dict])
async def get_roles(force_refresh: bool = False):
    hr_config = await _get_hr_config()
    if hr_config.get("google_sheets_enabled") and hr_config.get("google_sheets_url", "").strip():
        sheets_result = await fetch_roles_from_sheet(force_refresh=force_refresh)
        if sheets_result.get("status") == "success" and sheets_result.get("data"):
            mongo_roles = await db.roles.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)
            name_to_id = {
                (r.get("name") or "").strip(): r.get("id")
                for r in mongo_roles
                if r.get("name")
            }
            return _map_sheet_rows_to_api_roles(sheets_result["data"], name_to_id)

    if not hr_config:
        hr_config = {"social_insurance_percent": 12, "medical_insurance_percent": 3, "end_of_service_divisor": 2}

    roles = await db.roles.find({}, {"_id": 0}).to_list(1000)

    for role in roles:
        salary = role.get("monthly_salary", 0)
        role["social_insurance"] = round(
            salary * hr_config.get("social_insurance_percent", 0) / 100, 2
        )
        role["medical_insurance"] = round(
            salary * hr_config.get("medical_insurance_percent", 0) / 100, 2
        )
        divisor = hr_config.get("end_of_service_divisor", 0)
        role["end_of_service"] = (
            round(salary / divisor, 2) if divisor > 0 else 0
        )
        if not role.get("total_monthly_cost"):
            role["total_monthly_cost"] = round(
                salary
                + role["social_insurance"]
                + role["medical_insurance"]
                + role["end_of_service"],
                2,
            )

    return roles

@api_router.post("/roles", response_model=Dict)
async def create_role(role: RoleCreate, _: bool = Depends(verify_admin)):
    role_obj = RoleModel(**role.model_dump())
    doc = role_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.roles.insert_one(doc)
    return serialize_doc(doc)

# Quick create role (no admin auth required for inline creation)
class QuickRoleCreate(BaseModel):
    name: str
    hourly_rate: float = 0
    monthly_salary: float = 0

@api_router.post("/roles/quick", response_model=Dict)
async def quick_create_role(role: QuickRoleCreate):
    role_obj = RoleModel(**role.model_dump())
    doc = role_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.roles.insert_one(doc)
    return serialize_doc(doc)

@api_router.put("/roles/{role_id}", response_model=Dict)
async def update_role(role_id: str, role: RoleCreate, _: bool = Depends(verify_admin)):
    update_data = role.model_dump()
    result = await db.roles.update_one({"id": role_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Role not found")
    updated = await db.roles.find_one({"id": role_id}, {"_id": 0})
    return updated

@api_router.delete("/roles/{role_id}")
async def delete_role(role_id: str, _: bool = Depends(verify_admin)):
    result = await db.roles.delete_one({"id": role_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Role not found")
    return {"status": "deleted"}

# ---------- PRODUCT TEMPLATES ----------
@api_router.get("/product-templates", response_model=List[Dict])
async def get_product_templates():
    templates = await db.product_templates.find({}, {"_id": 0}).to_list(1000)
    return templates

@api_router.post("/product-templates", response_model=Dict)
async def create_product_template(template: ProductTemplateCreate, _: bool = Depends(verify_admin)):
    template_obj = ProductTemplateModel(**template.model_dump())
    doc = template_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.product_templates.insert_one(doc)
    return serialize_doc(doc)

@api_router.put("/product-templates/{template_id}", response_model=Dict)
async def update_product_template(template_id: str, template: ProductTemplateCreate, _: bool = Depends(verify_admin)):
    update_data = template.model_dump()
    result = await db.product_templates.update_one({"id": template_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    updated = await db.product_templates.find_one({"id": template_id}, {"_id": 0})
    return updated

@api_router.delete("/product-templates/{template_id}")
async def delete_product_template(template_id: str, _: bool = Depends(verify_admin)):
    result = await db.product_templates.delete_one({"id": template_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"status": "deleted"}

# ---------- SCOPE TEMPLATES ----------
@api_router.get("/scope-templates", response_model=List[Dict])
async def get_scope_templates():
    templates = await db.scope_templates.find({}, {"_id": 0}).to_list(1000)
    return templates

@api_router.post("/scope-templates", response_model=Dict)
async def create_scope_template(template: ScopeTemplateCreate, _: bool = Depends(verify_admin)):
    template_obj = ScopeTemplateModel(**template.model_dump())
    doc = template_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.scope_templates.insert_one(doc)
    return serialize_doc(doc)

@api_router.put("/scope-templates/{template_id}", response_model=Dict)
async def update_scope_template(template_id: str, template: ScopeTemplateCreate, _: bool = Depends(verify_admin)):
    update_data = template.model_dump()
    result = await db.scope_templates.update_one({"id": template_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    updated = await db.scope_templates.find_one({"id": template_id}, {"_id": 0})
    return updated

@api_router.delete("/scope-templates/{template_id}")
async def delete_scope_template(template_id: str, _: bool = Depends(verify_admin)):
    result = await db.scope_templates.delete_one({"id": template_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"status": "deleted"}

# ---------- VENDOR SERVICES ----------
@api_router.get("/vendor-services", response_model=List[Dict])
async def get_vendor_services():
    services = await db.vendor_services.find({}, {"_id": 0}).to_list(1000)
    return services

@api_router.post("/vendor-services", response_model=Dict)
async def create_vendor_service(service: VendorServiceCreate, _: bool = Depends(verify_admin)):
    service_obj = VendorServiceModel(**service.model_dump())
    doc = service_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.vendor_services.insert_one(doc)
    return serialize_doc(doc)

# Quick create vendor service (no admin auth required for inline creation)
class QuickVendorCreate(BaseModel):
    name: str
    category: str = ""
    default_markup_percent: float = 15

@api_router.post("/vendor-services/quick", response_model=Dict)
async def quick_create_vendor_service(service: QuickVendorCreate):
    service_obj = VendorServiceModel(**service.model_dump())
    doc = service_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.vendor_services.insert_one(doc)
    return serialize_doc(doc)

@api_router.put("/vendor-services/{service_id}", response_model=Dict)
async def update_vendor_service(service_id: str, service: VendorServiceCreate, _: bool = Depends(verify_admin)):
    update_data = service.model_dump()
    result = await db.vendor_services.update_one({"id": service_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    updated = await db.vendor_services.find_one({"id": service_id}, {"_id": 0})
    return updated

@api_router.delete("/vendor-services/{service_id}")
async def delete_vendor_service(service_id: str, _: bool = Depends(verify_admin)):
    result = await db.vendor_services.delete_one({"id": service_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    return {"status": "deleted"}

# ---------- PAYMENT TERMS ----------
@api_router.get("/payment-terms", response_model=List[Dict])
async def get_payment_terms():
    terms = await db.payment_terms.find({}, {"_id": 0}).to_list(1000)
    return terms

@api_router.post("/payment-terms", response_model=Dict)
async def create_payment_term(term: PaymentTermCreate, _: bool = Depends(verify_admin)):
    term_obj = PaymentTermModel(**term.model_dump())
    doc = term_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.payment_terms.insert_one(doc)
    return serialize_doc(doc)

@api_router.put("/payment-terms/{term_id}", response_model=Dict)
async def update_payment_term(term_id: str, term: PaymentTermCreate, _: bool = Depends(verify_admin)):
    update_data = term.model_dump()
    result = await db.payment_terms.update_one({"id": term_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Term not found")
    updated = await db.payment_terms.find_one({"id": term_id}, {"_id": 0})
    return updated

@api_router.delete("/payment-terms/{term_id}")
async def delete_payment_term(term_id: str, _: bool = Depends(verify_admin)):
    result = await db.payment_terms.delete_one({"id": term_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Term not found")
    return {"status": "deleted"}

# ---------- OVERHEAD RATES ----------
@api_router.get("/overhead-rates", response_model=Dict)
async def get_overhead_rates():
    overhead = await db.overhead_rates.find_one({}, {"_id": 0})
    if not overhead:
        # Create default
        default = OverheadRateModel()
        doc = default.model_dump()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.overhead_rates.insert_one(doc)
        return serialize_doc(doc)
    return overhead

@api_router.put("/overhead-rates", response_model=Dict)
async def update_overhead_rates(data: OverheadRateUpdate, _: bool = Depends(verify_admin)):
    rate_per_hour = data.total_company_overhead / data.total_billable_hours if data.total_billable_hours > 0 else 0
    update_data = {
        **data.model_dump(),
        "rate_per_hour": rate_per_hour,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.overhead_rates.update_one({}, {"$set": update_data}, upsert=True)
    return await db.overhead_rates.find_one({}, {"_id": 0})

# ---------- SALES INCENTIVES ----------
@api_router.get("/sales-incentives", response_model=Dict)
async def get_sales_incentives():
    incentive = await db.sales_incentives.find_one({}, {"_id": 0})
    if not incentive:
        default = SalesIncentiveModel()
        doc = default.model_dump()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.sales_incentives.insert_one(doc)
        return serialize_doc(doc)
    return incentive

@api_router.put("/sales-incentives", response_model=Dict)
async def update_sales_incentives(percent: float, _: bool = Depends(verify_admin)):
    update_data = {
        "percent": percent,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.sales_incentives.update_one({}, {"$set": update_data}, upsert=True)
    return await db.sales_incentives.find_one({}, {"_id": 0})

# ---------- RISK MULTIPLIERS ----------
@api_router.get("/risk-multipliers", response_model=List[Dict])
async def get_risk_multipliers():
    multipliers = await db.risk_multipliers.find({}, {"_id": 0}).to_list(100)
    return multipliers

@api_router.post("/risk-multipliers", response_model=Dict)
async def create_risk_multiplier(data: RiskMultiplierCreate, _: bool = Depends(verify_admin)):
    multiplier_obj = RiskMultiplierModel(**data.model_dump())
    doc = multiplier_obj.model_dump()
    await db.risk_multipliers.insert_one(doc)
    return serialize_doc(doc)

@api_router.put("/risk-multipliers/{multiplier_id}", response_model=Dict)
async def update_risk_multiplier(multiplier_id: str, data: RiskMultiplierCreate, _: bool = Depends(verify_admin)):
    update_data = data.model_dump()
    result = await db.risk_multipliers.update_one({"id": multiplier_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Multiplier not found")
    updated = await db.risk_multipliers.find_one({"id": multiplier_id}, {"_id": 0})
    return updated

@api_router.delete("/risk-multipliers/{multiplier_id}")
async def delete_risk_multiplier(multiplier_id: str, _: bool = Depends(verify_admin)):
    result = await db.risk_multipliers.delete_one({"id": multiplier_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Multiplier not found")
    return {"status": "deleted"}

# ---------- THEME SETTINGS ----------
@api_router.get("/theme-settings", response_model=Dict)
async def get_theme_settings():
    settings = await db.theme_settings.find_one({}, {"_id": 0})
    if not settings:
        default = ThemeSettings()
        doc = default.model_dump()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.theme_settings.insert_one(doc)
        return serialize_doc(doc)
    return settings

@api_router.put("/theme-settings", response_model=Dict)
async def update_theme_settings(data: ThemeSettingsUpdate, _: bool = Depends(verify_admin)):
    update_data = {
        **data.model_dump(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.theme_settings.update_one({}, {"$set": update_data}, upsert=True)
    return await db.theme_settings.find_one({}, {"_id": 0})

# ---------- HR CONFIG ----------
@api_router.get("/hr-config", response_model=HRConfigModel)
async def get_hr_config():
    config = await db.hr_config.find_one({}, {"_id": 0})
    if not config:
        default = HRConfigModel()
        doc = default.model_dump()
        await db.hr_config.insert_one(doc)
        return doc
    return config

@api_router.put("/hr-config", response_model=HRConfigModel)
async def update_hr_config(data: HRConfigUpdate, _: bool = Depends(verify_admin)):
    update_data = {
        **data.model_dump(),
        "updated_at": datetime.now(timezone.utc)
    }
    await db.hr_config.update_one({}, {"$set": update_data}, upsert=True)
    return await db.hr_config.find_one({}, {"_id": 0})

# ---------- GOOGLE SHEETS IMPORT ----------
import httpx

@api_router.post("/import-google-sheet", response_model=Dict)
async def import_google_sheet(url: str, _: bool = Depends(verify_admin)):
    """Import roles from Google Sheets"""
    try:
        # Convert Google Sheets URL to CSV export format
        # URL format: https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit
        # CSV format: https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv
        
        if '/edit' in url:
            csv_url = url.replace('/edit', '/export?format=csv').split('#')[0].split('?')[0] + '/export?format=csv'
        elif 'export' not in url:
            # Extract sheet ID and create CSV URL
            parts = url.split('/d/')
            if len(parts) > 1:
                sheet_id = parts[1].split('/')[0]
                csv_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv"
            else:
                csv_url = url
        else:
            csv_url = url
        
        async with httpx.AsyncClient() as client:
            response = await client.get(csv_url, follow_redirects=True, timeout=30)
            response.raise_for_status()
            
        # Parse CSV
        import csv
        import io
        
        content = response.text
        reader = csv.DictReader(io.StringIO(content))
        
        imported_count = 0
        for row in reader:
            # Try to map columns (flexible column names)
            name = row.get('Role Name') or row.get('role_name') or row.get('Role') or row.get('name') or row.get('الدور')
            salary = row.get('Average Salary') or row.get('monthly_salary') or row.get('Salary') or row.get('متوسط الراتب') or '0'
            
            if not name:
                continue
                
            # Clean and parse salary
            try:
                salary_clean = ''.join(c for c in str(salary) if c.isdigit() or c == '.')
                salary_float = float(salary_clean) if salary_clean else 0
            except (ValueError, TypeError):
                salary_float = 0
            
            # Calculate hourly rate (assuming 176 hours/month)
            hourly_rate = salary_float / 176 if salary_float > 0 else 0
            
            # Check if role exists
            existing = await db.roles.find_one({"name": name})
            if existing:
                # Update existing
                await db.roles.update_one(
                    {"name": name},
                    {"$set": {"monthly_salary": salary_float, "hourly_rate": round(hourly_rate, 2)}}
                )
            else:
                # Create new
                role_obj = RoleModel(name=name, monthly_salary=salary_float, hourly_rate=round(hourly_rate, 2))
                doc = role_obj.model_dump()
                doc['created_at'] = doc['created_at'].isoformat()
                await db.roles.insert_one(doc)
            
            imported_count += 1
        
        return {"status": "success", "imported": imported_count}
        
    except httpx.HTTPError as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch Google Sheet: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

# ---------- GOOGLE SHEETS LIVE FETCH ----------
@api_router.get("/sheets/roles", response_model=Dict)
async def fetch_roles_from_sheet(force_refresh: bool = False):
    """Fetch roles from Google Sheets with caching"""
    global sheets_cache

    hr_config = await _get_hr_config()
    if not hr_config.get("google_sheets_enabled"):
        return {"status": "disabled", "data": [], "source": "sheets_disabled"}

    sheet_url = hr_config.get("google_sheets_url", "")
    sheet_tab = hr_config.get("google_sheets_tab", "Average Emp. Salary")

    if not sheet_url:
        return {"status": "error", "message": "No Google Sheets URL configured", "data": []}

    current_time = datetime.now(timezone.utc)
    cache_key = f"{sheet_url}|{sheet_tab}"
    if (
        not force_refresh
        and sheets_cache["data"] is not None
        and sheets_cache["url"] == cache_key
        and sheets_cache["timestamp"]
        and (current_time - sheets_cache["timestamp"]).total_seconds() < CACHE_TTL_SECONDS
    ):
        return {
            "status": "success",
            "data": sheets_cache["data"],
            "source": "cache",
            "cached_at": sheets_cache["timestamp"].isoformat(),
        }

    try:
        content = await _fetch_google_sheet_csv(sheet_url, tab_name=sheet_tab)
        roles_data = _parse_average_salary_rows(content)
        if not roles_data:
            return {
                "status": "error",
                "message": f"No role rows found in tab '{sheet_tab}'",
                "data": [],
            }

        sheets_cache["data"] = roles_data
        sheets_cache["timestamp"] = current_time
        sheets_cache["url"] = cache_key

        return {
            "status": "success",
            "data": roles_data,
            "source": "live",
            "fetched_at": current_time.isoformat(),
            "count": len(roles_data),
            "tab": sheet_tab,
        }

    except httpx.HTTPError as e:
        return {"status": "error", "message": f"Failed to fetch sheet: {str(e)}", "data": []}
    except Exception as e:
        return {"status": "error", "message": f"Error: {str(e)}", "data": []}


@api_router.get("/sheets/products-pricing", response_model=Dict)
async def fetch_products_pricing_from_sheet(force_refresh: bool = False):
    """Fetch Products Pricing matrix from Google Sheets tab by name."""
    hr_config = await _get_hr_config()
    if not hr_config.get("google_sheets_enabled"):
        return {"status": "disabled", "data": [], "source": "sheets_disabled"}

    sheet_url = hr_config.get("google_sheets_url", "")
    if not sheet_url:
        return {"status": "error", "message": "No Google Sheets URL configured", "data": []}

    try:
        raw_tab_name = hr_config.get("google_sheets_products_tab", "Products Pricing")
        content = await _fetch_google_sheet_csv(sheet_url, tab_name=raw_tab_name)
        parsed_rows = _extract_products_pricing_rows(content)
        if not parsed_rows:
            return {
                "status": "error",
                "message": "No product pricing rows found in Products Pricing tab",
                "data": [],
            }

        grouped: Dict[str, Dict[str, Any]] = {}
        for item in parsed_rows:
            section_name = item.get("section_name") or "General"
            if section_name == "General":
                section_name = _derive_section_from_product_name(item["product_name"])
            if not section_name or section_name == "General":
                section_name = "Branding"
            product_key = f"{section_name}||{item['product_name']}"

            if product_key not in grouped:
                grouped[product_key] = {
                    "section_name": section_name,
                    "product_name": item["product_name"],
                    "sizes": {},
                }
            grouped[product_key]["sizes"][item["size"]] = item["roles"]

        data = sorted(grouped.values(), key=lambda x: x["product_name"].lower())
        return {
            "status": "success",
            "data": data,
            "source": "live" if force_refresh else "live",
            "count": len(data),
        }
    except httpx.HTTPError as e:
        return {"status": "error", "message": f"Failed to fetch sheet: {str(e)}", "data": []}
    except Exception as e:
        return {"status": "error", "message": f"Error: {str(e)}", "data": []}


@api_router.post("/sheets/sync-to-db", response_model=Dict)
async def sync_sheets_to_database(_: bool = Depends(verify_admin)):
    """Sync roles from Google Sheets to database - uses Total Monthly directly from sheet"""
    # First fetch from sheets
    sheets_result = await fetch_roles_from_sheet(force_refresh=True)
    
    if sheets_result.get("status") != "success":
        raise HTTPException(status_code=400, detail=sheets_result.get("message", "Failed to fetch from sheets"))
    
    synced_count = 0
    created_count = 0
    updated_count = 0
    
    for role_data in sheets_result.get("data", []):
        role_name = role_data.get("role_name", "")
        if not role_name:
            continue
        
        total_monthly = role_data.get("total_monthly", 0)
        hourly_rate = role_data.get("hourly_rate", 0)
        department = role_data.get("department", "")
        
        # If hourly rate is 0 but total_monthly exists, calculate it
        if hourly_rate == 0 and total_monthly > 0:
            hourly_rate = round(total_monthly / 176, 2)
        
        # Check if role exists
        existing = await db.roles.find_one({"name": role_name})
        
        # Use total_monthly directly from sheet (column D) without calculating benefits
        role_doc = {
            "name": role_name,
            "hourly_rate": hourly_rate,
            "monthly_salary": total_monthly,
            "department": department,
            "total_monthly_cost": total_monthly  # Direct from Google Sheets column D
        }
        
        if existing:
            await db.roles.update_one({"name": role_name}, {"$set": role_doc})
            updated_count += 1
        else:
            role_doc["id"] = str(uuid.uuid4())
            role_doc["created_at"] = datetime.now(timezone.utc).isoformat()
            role_doc["description"] = ""
            await db.roles.insert_one(role_doc)
            created_count += 1
        
        synced_count += 1
    
    return {
        "status": "success",
        "synced": synced_count,
        "created": created_count,
        "updated": updated_count
    }

@api_router.delete("/sheets/cache", response_model=Dict)
async def clear_sheets_cache(_: bool = Depends(verify_admin)):
    """Clear the Google Sheets cache"""
    global sheets_cache
    sheets_cache = {"data": None, "timestamp": None, "url": None}
    return {"status": "success", "message": "Cache cleared"}

@api_router.get("/departments", response_model=List[str])
async def get_unique_departments():
    """Get unique department values from roles"""
    departments = await db.roles.distinct("department")
    # Filter out None and empty strings
    return [d for d in departments if d]

# ---------- PRICING GUIDELINES ----------
@api_router.get("/pricing-guidelines", response_model=List[Dict])
async def get_all_pricing_guidelines():
    guidelines = await db.pricing_guidelines.find({}, {"_id": 0}).to_list(100)
    return guidelines

@api_router.post("/pricing-guidelines", response_model=Dict)
async def create_pricing_guideline(guideline: PricingGuidelineCreate, _: bool = Depends(verify_admin)):
    guideline_obj = PricingGuidelineModel(**guideline.model_dump())
    doc = guideline_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.pricing_guidelines.insert_one(doc)
    return serialize_doc(doc)

@api_router.put("/pricing-guidelines/{guideline_id}", response_model=Dict)
async def update_pricing_guideline(guideline_id: str, guideline: PricingGuidelineCreate, _: bool = Depends(verify_admin)):
    update_data = guideline.model_dump()
    result = await db.pricing_guidelines.update_one({"id": guideline_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Guideline not found")
    updated = await db.pricing_guidelines.find_one({"id": guideline_id}, {"_id": 0})
    return updated

@api_router.delete("/pricing-guidelines/{guideline_id}")
async def delete_pricing_guideline(guideline_id: str, _: bool = Depends(verify_admin)):
    result = await db.pricing_guidelines.delete_one({"id": guideline_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Guideline not found")
    return {"status": "deleted"}

# ---------- RISK CONFIGURATION ----------
@api_router.get("/risk-config", response_model=Dict)
async def get_risk_configuration():
    config = await db.risk_config.find_one({}, {"_id": 0})
    if not config:
        default = RiskConfigModel()
        doc = default.model_dump()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.risk_config.insert_one(doc)
        return serialize_doc(doc)
    return config

@api_router.put("/risk-config", response_model=Dict)
async def update_risk_configuration(data: RiskConfigUpdate, _: bool = Depends(verify_admin)):
    update_data = {
        **data.model_dump(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.risk_config.update_one({}, {"$set": update_data}, upsert=True)
    return await db.risk_config.find_one({}, {"_id": 0})

# ---------- INCENTIVE RULES ----------
@api_router.get("/incentive-rules", response_model=List[Dict])
async def get_all_incentive_rules():
    rules = await db.incentive_rules.find({}, {"_id": 0}).to_list(100)
    return rules

@api_router.post("/incentive-rules", response_model=Dict)
async def create_incentive_rule(rule: IncentiveRuleCreate, _: bool = Depends(verify_admin)):
    # Check for duplicate
    existing = await db.incentive_rules.find_one({
        "deal_size": rule.deal_size, 
        "role": rule.role
    }, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail=f"Rule for {rule.deal_size}/{rule.role} already exists")
    
    rule_obj = IncentiveRuleModel(**rule.model_dump())
    doc = rule_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.incentive_rules.insert_one(doc)
    return serialize_doc(doc)

@api_router.put("/incentive-rules/{rule_id}", response_model=Dict)
async def update_incentive_rule(rule_id: str, rule: IncentiveRuleUpdate, _: bool = Depends(verify_admin)):
    update_data = {k: v for k, v in rule.model_dump().items() if v}
    result = await db.incentive_rules.update_one({"id": rule_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Rule not found")
    updated = await db.incentive_rules.find_one({"id": rule_id}, {"_id": 0})
    return updated

@api_router.delete("/incentive-rules/{rule_id}")
async def delete_incentive_rule(rule_id: str, _: bool = Depends(verify_admin)):
    result = await db.incentive_rules.delete_one({"id": rule_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Rule not found")
    return {"status": "deleted"}

@api_router.post("/incentive-rules/bulk", response_model=Dict)
async def bulk_update_incentive_rules(rules: List[IncentiveRuleCreate], _: bool = Depends(verify_admin)):
    """Bulk update/create incentive rules"""
    updated = 0
    created = 0
    
    for rule in rules:
        existing = await db.incentive_rules.find_one({
            "deal_size": rule.deal_size, 
            "role": rule.role
        })
        
        if existing:
            await db.incentive_rules.update_one(
                {"deal_size": rule.deal_size, "role": rule.role},
                {"$set": rule.model_dump()}
            )
            updated += 1
        else:
            rule_obj = IncentiveRuleModel(**rule.model_dump())
            doc = rule_obj.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            await db.incentive_rules.insert_one(doc)
            created += 1
    
    return {"status": "success", "created": created, "updated": updated}

# ---------- INCENTIVE MULTIPLIERS ----------
@api_router.get("/incentive-multipliers", response_model=Dict)
async def get_incentive_multipliers_config():
    config = await db.incentive_multipliers.find_one({}, {"_id": 0})
    if not config:
        default = IncentiveMultipliersModel()
        doc = default.model_dump()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.incentive_multipliers.insert_one(doc)
        return serialize_doc(doc)
    return config

@api_router.put("/incentive-multipliers", response_model=Dict)
async def update_incentive_multipliers_config(data: IncentiveMultipliersUpdate, _: bool = Depends(verify_admin)):
    update_data = {
        **data.model_dump(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.incentive_multipliers.update_one({}, {"$set": update_data}, upsert=True)
    return await db.incentive_multipliers.find_one({}, {"_id": 0})

# ---------- DEAL SIZE RANGES ----------
@api_router.get("/deal-size-ranges", response_model=Dict)
async def get_deal_size_ranges():
    ranges = await db.deal_size_ranges.find_one({}, {"_id": 0})
    if not ranges:
        default = DealSizeRangeModel()
        doc = default.model_dump()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.deal_size_ranges.insert_one(doc)
        return serialize_doc(doc)
    return ranges

@api_router.put("/deal-size-ranges", response_model=Dict)
async def update_deal_size_ranges(ranges: Dict, _: bool = Depends(verify_admin)):
    # Validate ranges
    update_data = {
        "tiny_min": ranges.get("tiny_min", 0),
        "tiny_max": ranges.get("tiny_max", 50000),
        "standard_min": ranges.get("standard_min", 50001),
        "standard_max": ranges.get("standard_max", 200000),
        "big_min": ranges.get("big_min", 200001),
        "big_max": ranges.get("big_max", 500000),
        "mega_min": ranges.get("mega_min", 500001),
        "mega_max": ranges.get("mega_max", 999999999),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.deal_size_ranges.update_one(
        {},
        {"$set": update_data},
        upsert=True
    )
    
    return await get_deal_size_ranges()

# ---------- CALCULATIONS ----------
@api_router.post("/calculate/simple", response_model=Dict)
async def calculate_simple_pricing(data: SimpleCalculationInput):
    return await calculate_simple(data)

@api_router.post("/calculate/opportunity", response_model=Dict)
async def calculate_opportunity_pricing(data: OpportunityInput):
    return await calculate_opportunity(data)

# ---------- OPPORTUNITIES ----------
@api_router.get("/opportunities", response_model=List[Dict])
async def get_opportunities():
    opportunities = await db.opportunities.find({}, {"_id": 0}).to_list(1000)
    return opportunities

@api_router.get("/opportunities/{opp_id}", response_model=Dict)
async def get_opportunity(opp_id: str):
    opp = await db.opportunities.find_one({"id": opp_id}, {"_id": 0})
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return opp

@api_router.post("/opportunities", response_model=Dict)
async def create_opportunity(data: OpportunityInput):
    # Calculate pricing
    calculations = await calculate_opportunity(data)
    
    opp_obj = OpportunityModel(
        client=data.client,
        opportunity_name=data.opportunity_name,
        sales_owner=data.sales_owner,
        payment_term_id=data.payment_term_id,
        risk_level=data.risk_level,
        target_margin_percent=data.target_margin_percent,
        scopes=[s.model_dump() for s in data.scopes],
        calculations=calculations
    )
    doc = opp_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.opportunities.insert_one(doc)
    return serialize_doc(doc)

@api_router.put("/opportunities/{opp_id}", response_model=Dict)
async def update_opportunity(opp_id: str, data: OpportunityInput):
    # Calculate pricing
    calculations = await calculate_opportunity(data)
    
    update_data = {
        "client": data.client,
        "opportunity_name": data.opportunity_name,
        "sales_owner": data.sales_owner,
        "payment_term_id": data.payment_term_id,
        "risk_level": data.risk_level,
        "target_margin_percent": data.target_margin_percent,
        "scopes": [s.model_dump() for s in data.scopes],
        "calculations": calculations,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.opportunities.update_one({"id": opp_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return await db.opportunities.find_one({"id": opp_id}, {"_id": 0})

@api_router.delete("/opportunities/{opp_id}")
async def delete_opportunity(opp_id: str):
    result = await db.opportunities.delete_one({"id": opp_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return {"status": "deleted"}

# ---------- SEED DATA ----------
@api_router.post("/seed-data")
async def seed_database(_: bool = Depends(verify_admin)):
    """Seed database with sample data"""
    
    # Clear existing data
    await db.roles.delete_many({})
    await db.product_templates.delete_many({})
    await db.scope_templates.delete_many({})
    await db.vendor_services.delete_many({})
    await db.payment_terms.delete_many({})
    await db.risk_multipliers.delete_many({})
    await db.overhead_rates.delete_many({})
    await db.sales_incentives.delete_many({})
    
    # Roles
    roles = [
        {"id": "role-1", "name": "Creative Director", "hourly_rate": 450, "monthly_salary": 45000, "description": "Leads creative vision"},
        {"id": "role-2", "name": "Art Director", "hourly_rate": 350, "monthly_salary": 35000, "description": "Visual design leadership"},
        {"id": "role-3", "name": "Senior Designer", "hourly_rate": 280, "monthly_salary": 28000, "description": "Senior level design"},
        {"id": "role-4", "name": "Designer", "hourly_rate": 200, "monthly_salary": 20000, "description": "Design execution"},
        {"id": "role-5", "name": "Strategist", "hourly_rate": 400, "monthly_salary": 40000, "description": "Brand strategy"},
        {"id": "role-6", "name": "Copywriter", "hourly_rate": 250, "monthly_salary": 25000, "description": "Content creation"},
        {"id": "role-7", "name": "Account Manager", "hourly_rate": 220, "monthly_salary": 22000, "description": "Client relations"},
        {"id": "role-8", "name": "Project Manager", "hourly_rate": 280, "monthly_salary": 28000, "description": "Project coordination"},
        {"id": "role-9", "name": "Motion Designer", "hourly_rate": 300, "monthly_salary": 30000, "description": "Animation and motion"},
        {"id": "role-10", "name": "Junior Designer", "hourly_rate": 150, "monthly_salary": 15000, "description": "Entry level design"},
    ]
    for role in roles:
        role['created_at'] = datetime.now(timezone.utc).isoformat()
    await db.roles.insert_many(roles)
    
    # Product Templates
    product_templates = [
        {"id": "pt-1", "name": "Logo Design", "description": "Brand logo creation", "default_roles": [{"role_id": "role-2", "default_hours": 20}, {"role_id": "role-3", "default_hours": 40}], "avg_deal_size": 50000, "standard_cm_percent": 35},
        {"id": "pt-2", "name": "Brand Identity", "description": "Complete brand system", "default_roles": [{"role_id": "role-1", "default_hours": 16}, {"role_id": "role-2", "default_hours": 40}, {"role_id": "role-3", "default_hours": 80}], "avg_deal_size": 150000, "standard_cm_percent": 32},
        {"id": "pt-3", "name": "Campaign Concept", "description": "Creative campaign development", "default_roles": [{"role_id": "role-1", "default_hours": 24}, {"role_id": "role-5", "default_hours": 32}, {"role_id": "role-6", "default_hours": 24}], "avg_deal_size": 120000, "standard_cm_percent": 30},
        {"id": "pt-4", "name": "TVC Production", "description": "Television commercial", "default_roles": [{"role_id": "role-1", "default_hours": 40}, {"role_id": "role-9", "default_hours": 60}], "avg_deal_size": 300000, "standard_cm_percent": 25},
        {"id": "pt-5", "name": "Social Media Content", "description": "Social media assets", "default_roles": [{"role_id": "role-4", "default_hours": 40}, {"role_id": "role-6", "default_hours": 16}], "avg_deal_size": 30000, "standard_cm_percent": 40},
        {"id": "pt-6", "name": "Website Design", "description": "Website UI/UX design", "default_roles": [{"role_id": "role-2", "default_hours": 32}, {"role_id": "role-3", "default_hours": 80}], "avg_deal_size": 100000, "standard_cm_percent": 35},
        {"id": "pt-7", "name": "Packaging Design", "description": "Product packaging", "default_roles": [{"role_id": "role-2", "default_hours": 24}, {"role_id": "role-3", "default_hours": 60}], "avg_deal_size": 80000, "standard_cm_percent": 33},
        {"id": "pt-8", "name": "Brand Strategy", "description": "Strategic brand planning", "default_roles": [{"role_id": "role-5", "default_hours": 60}, {"role_id": "role-1", "default_hours": 20}], "avg_deal_size": 180000, "standard_cm_percent": 38},
    ]
    for pt in product_templates:
        pt['created_at'] = datetime.now(timezone.utc).isoformat()
    await db.product_templates.insert_many(product_templates)
    
    # Scope Templates
    scope_templates = [
        {"id": "st-1", "name": "Branding Package", "description": "Complete branding solution", "scope_type": "standard", "default_products": ["pt-1", "pt-2", "pt-8"], "default_vendors": []},
        {"id": "st-2", "name": "Campaign Film", "description": "Video campaign production", "scope_type": "standard", "default_products": ["pt-3", "pt-4"], "default_vendors": [{"service_name": "Production House", "default_markup": 15}]},
        {"id": "st-3", "name": "Social Media Campaign", "description": "Social media management", "scope_type": "standard", "default_products": ["pt-5"], "default_vendors": []},
        {"id": "st-4", "name": "Digital Experience", "description": "Website and digital", "scope_type": "standard", "default_products": ["pt-6"], "default_vendors": [{"service_name": "Development", "default_markup": 12}]},
        {"id": "st-5", "name": "Staffing / Secondment", "description": "Resource secondment", "scope_type": "staffing", "default_products": [], "default_vendors": []},
        {"id": "st-6", "name": "Consulting Retainer", "description": "Strategy consulting", "scope_type": "standard", "default_products": ["pt-8"], "default_vendors": []},
    ]
    for st in scope_templates:
        st['created_at'] = datetime.now(timezone.utc).isoformat()
    await db.scope_templates.insert_many(scope_templates)
    
    # Vendor Services
    vendor_services = [
        {"id": "vs-1", "name": "Production House", "category": "Production", "default_markup_percent": 15},
        {"id": "vs-2", "name": "Photography", "category": "Production", "default_markup_percent": 12},
        {"id": "vs-3", "name": "Printing", "category": "Production", "default_markup_percent": 10},
        {"id": "vs-4", "name": "Web Development", "category": "Technology", "default_markup_percent": 12},
        {"id": "vs-5", "name": "Media Buying", "category": "Media", "default_markup_percent": 8},
        {"id": "vs-6", "name": "Influencer Management", "category": "Media", "default_markup_percent": 15},
        {"id": "vs-7", "name": "Translation Services", "category": "Content", "default_markup_percent": 20},
        {"id": "vs-8", "name": "Voice Over", "category": "Production", "default_markup_percent": 15},
    ]
    for vs in vendor_services:
        vs['created_at'] = datetime.now(timezone.utc).isoformat()
    await db.vendor_services.insert_many(vendor_services)
    
    # Payment Terms
    payment_terms = [
        {"id": "pmt-1", "name": "50% Advance", "advance_percent": 50, "payment_days": 30, "interest_rate": 0.08},
        {"id": "pmt-2", "name": "30% Advance", "advance_percent": 30, "payment_days": 45, "interest_rate": 0.08},
        {"id": "pmt-3", "name": "Net 30", "advance_percent": 0, "payment_days": 30, "interest_rate": 0.08},
        {"id": "pmt-4", "name": "Net 60", "advance_percent": 0, "payment_days": 60, "interest_rate": 0.08},
        {"id": "pmt-5", "name": "Monthly Retainer", "advance_percent": 100, "payment_days": 0, "interest_rate": 0},
    ]
    for pmt in payment_terms:
        pmt['created_at'] = datetime.now(timezone.utc).isoformat()
    await db.payment_terms.insert_many(payment_terms)
    
    # Risk Multipliers
    risk_multipliers = [
        {"id": "rm-1", "level": "Low", "multiplier": 1.0, "description": "Standard risk"},
        {"id": "rm-2", "level": "Medium", "multiplier": 1.1, "description": "10% risk buffer"},
        {"id": "rm-3", "level": "High", "multiplier": 1.25, "description": "25% risk buffer"},
        {"id": "rm-4", "level": "Critical", "multiplier": 1.5, "description": "50% risk buffer"},
    ]
    await db.risk_multipliers.insert_many(risk_multipliers)
    
    # Overhead Rates
    overhead = {
        "id": "overhead-1",
        "total_company_overhead": 500000,
        "total_billable_hours": 20000,
        "rate_per_hour": 25,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.overhead_rates.insert_one(overhead)
    
    # Sales Incentives
    incentive = {
        "id": "incentive-1",
        "name": "Default",
        "percent": 5,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.sales_incentives.insert_one(incentive)
    
    # Pricing Guidelines
    await db.pricing_guidelines.delete_many({})
    pricing_guidelines = [
        {"id": "pg-1", "name": "Tiny Projects", "category": "general", "deal_size": "tiny", "deal_size_min": 0, "deal_size_max": 50000, "min_margin": 35, "target_margin": 45, "premium_margin": 55, "min_internal_margin": 40, "min_vendor_margin": 15, "description": "Small projects under 50K SAR", "is_active": True},
        {"id": "pg-2", "name": "Standard Projects", "category": "general", "deal_size": "standard", "deal_size_min": 50000, "deal_size_max": 200000, "min_margin": 28, "target_margin": 35, "premium_margin": 45, "min_internal_margin": 32, "min_vendor_margin": 12, "description": "Standard projects 50K-200K SAR", "is_active": True},
        {"id": "pg-3", "name": "Big Projects", "category": "general", "deal_size": "big", "deal_size_min": 200000, "deal_size_max": 500000, "min_margin": 22, "target_margin": 30, "premium_margin": 40, "min_internal_margin": 28, "min_vendor_margin": 10, "description": "Large projects 200K-500K SAR", "is_active": True},
        {"id": "pg-4", "name": "Mega Projects", "category": "general", "deal_size": "mega", "deal_size_min": 500000, "deal_size_max": 99999999, "min_margin": 18, "target_margin": 25, "premium_margin": 35, "min_internal_margin": 22, "min_vendor_margin": 8, "description": "Enterprise projects 500K+ SAR", "is_active": True},
        {"id": "pg-5", "name": "Branding Services", "category": "branding", "deal_size": "standard", "deal_size_min": 0, "deal_size_max": 99999999, "min_margin": 30, "target_margin": 40, "premium_margin": 50, "min_internal_margin": 35, "min_vendor_margin": 12, "description": "Branding and identity work", "is_active": True},
        {"id": "pg-6", "name": "Campaign Services", "category": "campaign", "deal_size": "standard", "deal_size_min": 0, "deal_size_max": 99999999, "min_margin": 25, "target_margin": 32, "premium_margin": 42, "min_internal_margin": 28, "min_vendor_margin": 15, "description": "Campaigns with high vendor spend", "is_active": True},
        {"id": "pg-7", "name": "Staffing Services", "category": "staffing", "deal_size": "standard", "deal_size_min": 0, "deal_size_max": 99999999, "min_margin": 15, "target_margin": 22, "premium_margin": 30, "min_internal_margin": 20, "min_vendor_margin": 0, "description": "Resource secondment", "is_active": True},
    ]
    for pg in pricing_guidelines:
        pg['created_at'] = datetime.now(timezone.utc).isoformat()
    await db.pricing_guidelines.insert_many(pricing_guidelines)
    
    # Risk Configuration
    await db.risk_config.delete_many({})
    risk_config = {
        "id": "risk_config",
        "levels": {"none": 1.0, "low": 1.05, "medium": 1.15, "high": 1.30},
        "complexity_weight": 0.4,
        "rush_weight": 0.35,
        "execution_weight": 0.25,
        "impact_mode": "buffer",
        "apply_to_internal": True,
        "apply_to_vendor": True,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.risk_config.insert_one(risk_config)
    
    # Incentive Rules (New)
    await db.incentive_rules.delete_many({})
    incentive_rules = [
        # Tiny deals
        {"id": "ir-1", "deal_size": "tiny", "role": "sales_rep", "base_percent": 5, "max_cap": 5000, "is_active": True},
        {"id": "ir-2", "deal_size": "tiny", "role": "sales_manager", "base_percent": 2, "max_cap": 2000, "is_active": True},
        # Standard deals
        {"id": "ir-3", "deal_size": "standard", "role": "sales_rep", "base_percent": 4, "max_cap": 15000, "is_active": True},
        {"id": "ir-4", "deal_size": "standard", "role": "sales_manager", "base_percent": 2, "max_cap": 7500, "is_active": True},
        # Big deals
        {"id": "ir-5", "deal_size": "big", "role": "sales_rep", "base_percent": 3, "max_cap": 30000, "is_active": True},
        {"id": "ir-6", "deal_size": "big", "role": "sales_manager", "base_percent": 1.5, "max_cap": 15000, "is_active": True},
        # Mega deals
        {"id": "ir-7", "deal_size": "mega", "role": "sales_rep", "base_percent": 2, "max_cap": 50000, "is_active": True},
        {"id": "ir-8", "deal_size": "mega", "role": "sales_manager", "base_percent": 1, "max_cap": 25000, "is_active": True},
    ]
    for ir in incentive_rules:
        ir['created_at'] = datetime.now(timezone.utc).isoformat()
    await db.incentive_rules.insert_many(incentive_rules)
    
    # Incentive Multipliers
    await db.incentive_multipliers.delete_many({})
    incentive_multipliers = {
        "id": "incentive_multipliers",
        "existing_customer_multiplier": 0.9,
        "referral_multiplier": 0.5,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.incentive_multipliers.insert_one(incentive_multipliers)
    
    # Deal Size Ranges
    await db.deal_size_ranges.delete_many({})
    deal_size_ranges = {
        "id": "deal_size_ranges",
        "tiny_min": 0,
        "tiny_max": 200000,
        "standard_min": 200000,
        "standard_max": 500000,
        "big_min": 500000,
        "big_max": 2000000,
        "mega_min": 2000000,
        "mega_max": 999999999,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.deal_size_ranges.insert_one(deal_size_ranges)
    
    return {"status": "success", "message": "Database seeded with sample data"}

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
