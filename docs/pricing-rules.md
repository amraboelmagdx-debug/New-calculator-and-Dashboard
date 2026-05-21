# Pricing Rules (V1)

Source of truth: **Google Sheet** tab `Products Pricing Full-DB-V1` → MongoDB `services_pricing` → Calculator UI.

Logic is implemented in:

- `frontend/src/lib/pricingCostRules.js`
- `backend/pricing_rules.py`

Keep both files aligned when changing rules.

## Execution Mode mapping (English)

| Sheet keywords | Mode | Product COGS | Team auto-sync | Labor charge |
|----------------|------|--------------|----------------|--------------|
| all-in, package, fixed, turnkey | `all_in` | `total_cost × qty` | No | N/A (no sync) |
| resource, manpower, hours, labor | `resource` | `(direct_cost + oh) × qty`¹ | Yes | Full hours |
| hybrid, mixed, combo | `hybrid` | `total_cost × qty` (included package) | Yes (visibility) | `max(0, hours − baseline_hours)` |

¹ If Direct+OH is zero, fallback to `total_cost` with warning (`cost_fallback`).

**Heuristic** when mode cell is empty: if `internal_roles` or `total_team_hours` → `resource`, else `all_in`.

## Hybrid delta hours

- `baseline_hours` on each synced team member = sum of sheet role hours × product qty for hybrid lines.
- `chargeable_hours = max(0, current_hours − baseline_hours)` (hours mode only).
- Increasing hours above baseline adds labor COGS; decreasing to baseline does not reduce package cost.

### When current hours are below baseline

- **No negative labor credits** — delta is clamped to zero (`Math.max(0, …)` in JS and Python).
- **Package base price unchanged** — product COGS stays `total_cost × qty`; lowering team hours is visibility-only.
- **Minimum selling floor still applies** — `line_selling = max(margin-based price, sheet_min_selling)`.
- BDs may reduce hours below the included scope without automatically discounting the packaged service.

## Margin modes (quote level)

| Mode | API | Products in total |
|------|-----|-------------------|
| Unified | `margin_mode: unified` | Not sent — team/vendor/overhead only |
| Split | `margin_mode: split` | Not sent |
| Per-line (granular) | `margin_mode: granular` + `product_lines[]` | Yes — resolved cost per row |

Use **Per-line** when sheet products must drive selling price.

## Selling from margin (product line)

```
line_selling = max(cost / (1 − margin%/100), sheet_min_selling)
```

## Incentives (unchanged V1)

- Sized from **selling price (revenue)**.
- Priced into divisor on internal bucket; subtracted after COGS for contribution margin.
- Not part of COGS.
