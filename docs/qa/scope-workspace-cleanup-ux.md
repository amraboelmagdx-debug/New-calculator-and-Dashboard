# Scope Workspace Cleanup — UX Note

**Date:** 2026-06-03  
**Type:** UX-only (no pricing, backend, or data model changes)

---

## What changed

### Before

- Sticky **Continue to Economics** footer pushed Scope into a step-by-step funnel and consumed vertical space (`pb-24` padding).
- **All families** + **Add service** sat in a tall, detached toolbar above the list.
- Collapsed product rows used two stacked lines plus a helper hint; margin tab stacked a full **ProductEconomicsBar** under a boxed, non-interactive margin readout.
- Margin adjustment felt static (decorative bar, small numeric input).

### After

- Scope is a **self-contained product command area** — no Economics CTA or replacement navigation.
- **Slim toolbar** (~32px): family filter + Add service grouped left; quote rollup stats inline right when products exist.
- **Portfolio scan rows**: single horizontal band on desktop (~72–88px cap), six scan metrics only; icon tabs for edit; tab re-click collapses (unchanged toggle logic).
- **Margin panel**: interactive Radix slider, live value bubble, sheet-min marker, selling preview while dragging (display-only via existing `sellingFromCostAndMargin`), clear below-minimum alert; no economics bar in Scope.
- **Team / Risk** remain optional analysis tabs with lighter inactive styling; Products stays primary.

---

## User goals met

| Goal | How |
|------|-----|
| Less scrolling | Removed footer CTA padding; denser rows and toolbar |
| 6–8 products visible @ 1440×900 | Row `max-height: 88px`, `space-y-1`, inline command strip |
| Products = work area | All edits on Products tab; Team/Risk not on critical path |
| Margin = polished | Slider + bubble + preview + warning states |
| No Scope economics bloat | Economics bar removed from margin panel; sticky header hidden on margin |

---

## Verification

- `npm run build`
- Manual: [`workspace-hierarchy-qa.md`](workspace-hierarchy-qa.md) density + normal-path checklist
- Screenshots: `docs/qa/screenshots/scope-workspace-cleanup/` (capture when validating UI)

---

## Preserved

- Product tab editors (Team, Vendors, Risk, Margin, Insights)
- Pricing formulas and `onSetMargin` data path
- Test IDs: `scope-workspace`, `products-pricing-toolbar`, `product-workspace-card`, `product-tab-*`, `margin-tab-panel`, etc.
