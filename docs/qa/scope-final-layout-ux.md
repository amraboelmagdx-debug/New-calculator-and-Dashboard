# Scope Final Layout Balance — UX Note

**Date:** 2026-06-03  
**Type:** UX-only (no pricing formulas, backend, or data model changes)

---

## Problem

During **Scope (compose)**:

1. **Economics** could appear in the center column when “Show all sections” was on — competing with product work.
2. The **right InsightRail** used `slim` variant (alerts only) — felt empty despite live calc data.
3. **Quote stats** were duplicated in the toolbar (`ProductsCommandStrip`) and top health strip.
4. **Margin tab** was still visually heavy after the first slider pass.

---

## What changed

### Economics decoupled from Scope

- [`Calculator.jsx`](frontend/src/pages/Calculator.jsx): `vendors` and `pricing` sections render **only** when `activeDealStep === 'economics'`, even with “Show all sections”.
- Scope card unchanged: Products / Team analysis / Risk only.
- Economics **deal step** remains in the left stepper for vendors, payment terms, and quote-level margin.

### Right panel = Live quote (read-only)

- New [`LiveQuoteSummary.jsx`](frontend/src/components/calculator/LiveQuoteSummary.jsx).
- Compose uses `insightVariant = 'liveQuote'` on [`InsightRail`](frontend/src/components/calculator/InsightRail.jsx) / mobile [`InsightSheet`](frontend/src/components/calculator/InsightSheet.jsx).
- Shows: selling price, quote margin + bar, team cost, vendor cost, product count, readiness, intelligence alerts, warnings.
- No editing in the rail — product work stays in the center.

### Center column deduped

- Removed [`ProductsCommandStrip`](frontend/src/components/calculator/ProductsCommandStrip.jsx) from embedded [`StepProducts`](frontend/src/components/calculator/StepProducts.jsx) toolbar.
- Toolbar: family filter + Add service only.
- [`ScopeContextStrip`](frontend/src/components/calculator/ScopeContextStrip.jsx) keeps scope-specific sync/counts.

### Margin panel v2

- [`MarginTabPanel.jsx`](frontend/src/components/calculator/MarginTabPanel.jsx): one compact header row (margin %, inline below-min chip, min, delta, selling preview), slim slider + bubble, no large bordered card or separate alert block.

### Unchanged

- Product-level Team / Vendors / Risk / Margin editing on Products tab.
- Portfolio row density and tab re-click collapse.
- Team / Risk as optional analysis tabs.

---

## Layout model

| Region | Role |
|--------|------|
| Left stepper | Navigate deal steps (Economics still a separate step) |
| Center | Scope product command center |
| Right rail | Live quote review during compose; full economics rail on Economics step |
| Top strip | Compact selling + margin (unchanged) |

---

## Verification

- `npm run build`
- On compose: no `StepEconomics` blocks in main column with “Show all sections”
- Right rail shows selling, margin, costs, readiness
- Margin tab: slider works; below-min chip visible
- Screenshots: `docs/qa/screenshots/scope-final-layout/`
