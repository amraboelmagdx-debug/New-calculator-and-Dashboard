from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone

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
    description: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RoleCreate(BaseModel):
    name: str
    hourly_rate: float
    monthly_salary: float = 0
    description: str = ""

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
    default_vendors: List[Dict[str, Any]] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ScopeTemplateCreate(BaseModel):
    name: str
    description: str = ""
    scope_type: str = "standard"
    default_products: List[str] = []
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
    hours: float = 0
    utilization_percent: float = 0
    hourly_rate: float = 0

class VendorInput(BaseModel):
    service_id: str = ""
    service_name: str
    cost: float
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

# ==================== CALCULATION ENGINE ====================

async def calculate_simple(data: SimpleCalculationInput):
    """Calculate pricing for simple mode"""
    overhead_rate = await get_overhead_rate()
    sales_incentive_percent = await get_sales_incentive_percent()
    
    # Internal labor cost
    internal_labor_cost = 0
    total_hours = 0
    for member in data.team_members:
        hours = member.hours if member.hours > 0 else (member.utilization_percent / 100) * 176  # 176 = avg monthly hours
        cost = hours * member.hourly_rate
        internal_labor_cost += cost
        total_hours += hours
    
    # Vendor costs
    vendor_cost = sum(v.cost for v in data.vendors)
    vendor_revenue = sum(v.cost * (1 + v.markup_percent / 100) for v in data.vendors)
    vendor_markup_revenue = vendor_revenue - vendor_cost
    
    # Overhead
    overhead_cost = total_hours * overhead_rate
    
    # Total COGS
    cogs = internal_labor_cost + vendor_cost + overhead_cost
    
    # Calculate selling price using margin formula
    margin_percent = data.target_margin_percent / 100
    sales_percent = sales_incentive_percent / 100
    
    if (1 - margin_percent - sales_percent) > 0:
        internal_selling_price = internal_labor_cost / (1 - margin_percent - sales_percent)
    else:
        internal_selling_price = internal_labor_cost * 2
    
    total_selling_price = internal_selling_price + vendor_revenue
    
    # Sales incentive
    sales_incentive = total_selling_price * sales_percent
    
    # Contribution margin
    contribution_margin = total_selling_price - cogs - sales_incentive
    contribution_margin_percent = (contribution_margin / total_selling_price * 100) if total_selling_price > 0 else 0
    
    # Total profit
    total_profit = contribution_margin
    
    return {
        "internal_labor_cost": round(internal_labor_cost, 2),
        "vendor_cost": round(vendor_cost, 2),
        "vendor_revenue": round(vendor_revenue, 2),
        "vendor_markup_revenue": round(vendor_markup_revenue, 2),
        "overhead_cost": round(overhead_cost, 2),
        "total_hours": round(total_hours, 2),
        "cogs": round(cogs, 2),
        "selling_price": round(total_selling_price, 2),
        "sales_incentive": round(sales_incentive, 2),
        "contribution_margin": round(contribution_margin, 2),
        "contribution_margin_percent": round(contribution_margin_percent, 2),
        "total_profit": round(total_profit, 2),
        "overhead_rate": round(overhead_rate, 2),
        "sales_incentive_percent": sales_incentive_percent
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
async def get_roles():
    roles = await db.roles.find({}, {"_id": 0}).to_list(1000)
    return roles

@api_router.post("/roles", response_model=Dict)
async def create_role(role: RoleCreate, _: bool = Depends(verify_admin)):
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
