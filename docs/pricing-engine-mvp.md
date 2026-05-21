# Pricing Engine MVP

## V1 scope (shipped)

- Execution Mode cost interpretation (all-in / resource / hybrid + delta hours)
- Frontend/backend use same cost resolution for granular `product_lines`
- No silent double-count: all-in skips team auto-sync; hybrid charges labor delta only
- Sheet sync with DB cache + `stale` status when live fetch fails
- Margin Control Center: Unified default; Split/Per-line under Advanced
- Documentation set in `docs/`

## V2 (not in V1)

- Sheet `execution_risk` / `risk_multiplier_value` in selling formula
- Hybrid delta for utilization/seconded calc modes
- Approval workflow (discount, low margin, vendor override)
- VAT / multi-currency
- Unified mode including product_lines without full redesign

## Key formulas

**Contribution margin (API):**

```
contribution_margin = selling_price − COGS − total_incentive
```

**Granular selling:**

```
selling_price = product_selling + internal_selling + vendor_selling
```

**COGS:**

```
COGS = internal_labor + vendor_cost + overhead + product_cogs (granular)
```

## Files

| Layer | File |
|-------|------|
| Rules JS | `frontend/src/lib/pricingCostRules.js` |
| Rules PY | `backend/pricing_rules.py` |
| Lines + preview | `frontend/src/lib/marginEngine.js` |
| UI | `MarginControlCenter.jsx`, `Calculator.jsx` |
| API | `backend/server.py` → `calculate_simple` |
