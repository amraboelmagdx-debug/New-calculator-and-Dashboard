# Phase 1–3 implementation plan (executed)

## Phase 1 — Executive Rail (UI move only)

**Goal:** Unify `liveQuote` + `full` into `ExecutiveQuoteRail`; relocate Team/Risk analytics from Scope tabs.

| Task | Status |
|------|--------|
| Add `ExecutiveQuoteRail.jsx` with Summary / Team / Risk / COGS tabs | Done |
| Refactor `InsightRail.jsx` to delegate (remove step-based variant split) | Done |
| Pass `selectedProducts`, `roles`, `standardMonthlyHours` from `Calculator.jsx` | Done |
| Update `InsightSheet.jsx` props | Done |
| Add `compact` to dashboards (hide workspace banner in rail) | Done |

**Risk:** Low — display-only relocation.

## Phase 2 — Portfolio-only Scope

| Task | Status |
|------|--------|
| Remove Team/Risk tabs from `ScopeWorkspace.jsx` | Done |
| Rename workspace copy to Portfolio | Done |
| Remove `teamProps` from `Calculator` → `StepCompose` | Done |

## Phase 3 — Quote Controls drawer

| Task | Status |
|------|--------|
| Add `QuoteControlsDrawer.jsx` | Done |
| Wire from Executive Rail footer | Done |
| Internal risk, vendor risk, payment terms in drawer | Done |
| “Open quote settings” → Economics for vendors + margin center | Done |

## Not in this slice (later phases)

- Phase 4: Vendor model decision + UI deprecation  
- Phase 5: MarginControlCenter without duplicate product list  
- Phase 6: Review → Commit expansion  
- Phase 7: Readiness 2.0  

## Verification

1. `npm run build` passes.  
2. On Compose: rail shows Team/Risk tabs with data when products exist.  
3. Scope has no Team/Risk tab strip.  
4. Quote Controls drawer opens and edits recalc quote.  
5. Mobile insight sheet shows same tabbed rail.  

## Rollback

Revert `ExecutiveQuoteRail`, restore `ScopeWorkspace` tabs, restore `insightVariant` in `Calculator.jsx`.
