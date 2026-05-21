# UI/UX Notes — Pricing V1

## Margin Control Center

- **Default mode:** Unified (single target margin %).
- **Advanced pricing** collapsible: Split (internal + vendor %) and Per-line (granular sheet lines).
- Banner when sheet products exist but mode is not Per-line.
- Hybrid banner explains package cost + baseline hours (not generic double-count only).
- Product cards show execution mode label + cost basis description.
- **Pricing breakdown** panel per product row: Base Package Cost, Included Team Scope, Additional Hours Cost, Vendor Cost (deal-level), Margin Applied, Final Selling Price. Footnote when multiple hybrid lines share roles.

## Team row (hybrid)

- Hours mode + `labor_charge_context: hybrid`: shows **Included** vs **Billable** hours; cost preview uses billable hours only.
- Below baseline: note "below scope (no labor credit)"; package line price unchanged.

## Service detail (catalog)

- Execution mode badge uses normalized label (All-in / Resource / Hybrid).
- One-line cost rule description under badges.

## Data sources bar

- Green dot: fresh sync (< 24h).
- Amber: stale cache (sheet failed) or age > 24h.
- Sync button: force refresh roles + products.

## Vendors (Economics)

- Markup % + **Markup (SAR)** read-only column + Client Price (see `VendorRow.jsx`).

## V2 UI ideas

- Sticky price stack in Margin Control Center
- Markup SAR on product lines
- Stacked bar for Products | Internal | Vendors in Summary
