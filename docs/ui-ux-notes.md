# UI/UX Notes — Pricing V1

## Project information (Opportunity ID)

- [`StepFrame.jsx`](../frontend/src/components/calculator/StepFrame.jsx): **Opportunity ID** + **Load from sheet** (BDsMastersheet) at top of card.
- Auto-fills client, project, sales owner (editable); maps sheet **Opportunity Source** → Lead source (`direct` / `referral`).
- **Opportunity scope** section lists each parsed scope line with Matched / No catalog match badge.
- **Continue to Scope:** [`OpportunityScopeConfirmDialog.jsx`](../frontend/src/components/calculator/OpportunityScopeConfirmDialog.jsx) when any line matches the products catalog — user confirms which rows to add.
- **Opportunity Source** (sheet col D) in the project grid; **Payment terms** moved to Economics step above Margin Control Center (financing on calculate).

## Margin Control Center

- **Default mode:** Unified (single target margin %).
- **Advanced pricing** collapsible: Split (internal + vendor %) and Per-line (granular sheet lines).
- Banner when sheet products exist but mode is not Per-line.
- Hybrid banner explains package cost + baseline hours (not generic double-count only).
- **Product pricing cards** ([`ProductPricingCard.jsx`](../frontend/src/components/calculator/ProductPricingCard.jsx)): hero Final Selling Price + margin %; compact snapshot row (Package / Min Selling / Additional) via `formatCurrencyCompact`; line health badge (Healthy / Attention Needed / Review Pricing); execution mode as muted chip (no cost-basis paragraph on card).
- **Pricing Details** collapsible (default closed) in [`ProductPricingBreakdown.jsx`](../frontend/src/components/calculator/ProductPricingBreakdown.jsx): full SAR rows, [`IncludedTeamScope.jsx`](../frontend/src/components/calculator/IncludedTeamScope.jsx) summary (`N roles · Xh included`) with expandable role list, floor-applied line when relevant. Footnote when multiple hybrid lines share roles.

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

## Sticky economics summary

- [`StickyPricingSummary.jsx`](../frontend/src/components/calculator/StickyPricingSummary.jsx) at top of Economics step (Vendors + Pricing).
- Live metrics from existing `results` + sheet min total: Total Cost, Min Selling, Final Price, Margin %, Contribution (SAR).
- **Pricing Health** badge: Run Calculation, Healthy, Attention Needed, Review Pricing via [`pricingHealth.js`](../frontend/src/lib/pricingHealth.js).
- Desktop: sticky below global QuoteHealthStrip (`top-[148px]`). Mobile: collapsible floating card above bottom nav.
- Does not replace InsightRail or QuoteHealthStrip.

## V2 UI ideas

- Sticky price stack in Margin Control Center
- Markup SAR on product lines
- Stacked bar for Products | Internal | Vendors in Summary
