"""
Pricing cost interpretation by Execution Mode (Google Sheet).
Keep in sync with frontend/src/lib/pricingCostRules.js
"""

from __future__ import annotations

from typing import Any, Dict, Optional, Tuple

EXECUTION_ALL_IN = "all_in"
EXECUTION_RESOURCE = "resource"
EXECUTION_HYBRID = "hybrid"

ALL_IN_KEYWORDS = ("all-in", "all in", "allin", "package", "fixed", "lump", "turnkey")
RESOURCE_KEYWORDS = ("resource", "manpower", "hours", "labor", "labour", "team-based", "team based")
HYBRID_KEYWORDS = ("hybrid", "mixed", "combo", "combined")


def _num(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def normalize_execution_mode(raw: Optional[str], segment: Optional[Dict[str, Any]] = None) -> str:
    text = (raw or "").strip().lower()
    if any(k in text for k in HYBRID_KEYWORDS):
        return EXECUTION_HYBRID
    if any(k in text for k in ALL_IN_KEYWORDS):
        return EXECUTION_ALL_IN
    if any(k in text for k in RESOURCE_KEYWORDS):
        return EXECUTION_RESOURCE

    seg = segment or {}
    roles = seg.get("internal_roles") or []
    total_hours = _num(seg.get("total_team_hours"))
    if roles or total_hours > 0:
        return EXECUTION_RESOURCE
    return EXECUTION_ALL_IN


def resolve_product_line_cost(
    segment: Optional[Dict[str, Any]],
    quantity: int = 1,
) -> Tuple[float, str, str, bool]:
    """
    Returns (unit_cost_for_line, execution_mode, cost_basis_label, used_fallback).
    Line total = unit_cost * quantity (caller multiplies).
    """
    qty = max(1, int(quantity or 1))
    seg = segment or {}
    mode = normalize_execution_mode(seg.get("execution_mode"), seg)
    direct = _num(seg.get("direct_cost_per_unit"))
    oh = _num(seg.get("oh_cost_value"))
    total = _num(seg.get("total_cost"))
    used_fallback = False

    if mode == EXECUTION_RESOURCE:
        component = direct + oh
        if component > 0:
            unit = component
            basis = "direct_plus_oh"
        elif total > 0:
            unit = total
            basis = "total_cost_fallback"
            used_fallback = True
        else:
            unit = 0.0
            basis = "none"
    else:
        unit = total
        basis = "total_cost_package"

    return round(unit * qty, 2), mode, basis, used_fallback


def should_auto_sync_team_from_segment(segment: Optional[Dict[str, Any]]) -> bool:
    mode = normalize_execution_mode(
        (segment or {}).get("execution_mode"),
        segment,
    )
    return mode in (EXECUTION_RESOURCE, EXECUTION_HYBRID)


def get_chargeable_hours(
    hours: float,
    baseline_hours: float = 0,
    calc_mode: str = "hours",
    execution_context: Optional[str] = None,
) -> float:
    """Hybrid delta: only hours above sheet baseline are charged."""
    h = max(0.0, _num(hours))
    baseline = max(0.0, _num(baseline_hours))
    if calc_mode != "hours":
        return h
    if execution_context == EXECUTION_HYBRID and baseline > 0:
        return max(0.0, h - baseline)
    return h


def cost_basis_description(mode: str, basis: str) -> str:
    if mode == EXECUTION_ALL_IN:
        return "All-in: Total Cost is the full package (no auto team labor charge)."
    if mode == EXECUTION_RESOURCE:
        if basis == "total_cost_fallback":
            return "Resource: using Total Cost (Direct+OH missing on sheet)."
        return "Resource: Direct Cost + OH; team hours charged in full."
    if mode == EXECUTION_HYBRID:
        return "Hybrid: Total Cost is included; only hours above sheet baseline add labor."
    return ""
