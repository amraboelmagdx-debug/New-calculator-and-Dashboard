# Pricing Command Center — Product Architecture Review

**Status:** Approved for Phase 1 implementation (see stakeholder checklist).  
**Baseline:** `Calculator.jsx`, `quoteSteps.js`, `ScopeWorkspace.jsx`, `docs/qa/`.

## Executive summary

The app grew a **four-step deal wizard** (Opportunity → Scope → Economics → Review) alongside a **per-product command center** (portfolio + Team/Vendors/Risk/Margin tabs). Recent passes moved editing to Products and made Team/Risk read-only, but **structural duplication** remains: wizard steps, global `calcData`, quote-level vendor/margin surfaces, and competing quote summaries (health strip, rail variants, Economics sticky summary).

**Direction:** Collapse Scope to **Portfolio (build)** only; promote the right column to a permanent **Executive Quote Rail** (read + alerts + analytics); repurpose Economics into **Quote Controls** (deal-level knobs) reachable from the rail drawer—not a mandatory center step during product work.

## Current-state map (abbreviated)

| Layer | Key surfaces |
|-------|----------------|
| Global | QuoteHealthStrip, DealStepper, TemplatePanel, InsightRail (`liveQuote` / `full`), BottomNav |
| Frame | StepFrame, opportunity import |
| Compose | ScopeContextStrip, Scope workspace tabs (Products / Team / Risk), ProductWorkspaceCard tabs |
| Economics | StickyPricingSummary, quote vendors, vendor_risk, internal_risk, payment terms, MarginControlCenter |
| Review | StepReview checklist + export |

## Problems (top 10)

1. Dual wizard + workspace mental models  
2. Economics duplicates rail + strip + margin center  
3. Two vendor/team data paths (quote vs product)  
4. Scope Team/Risk tabs duplicate rail analytics  
5. MarginControlCenter re-lists portfolio products  
6. Review is checklist-only, not commit summary  
7. InsightRail mode switch hides capabilities by step  
8. Mobile fragments content across nav + sheet  
9. Readiness tied to wizard steps, not product quality  
10. “Insights” tab vs “Insight rail” naming collision  

## Recommended future IA

```
[Stepper] Frame → Portfolio → Commit (+ optional Quote settings)

[Center] Portfolio workspace | Frame | Commit

[Right — permanent] Executive Quote Rail
  Summary | Team | Risk | COGS
  [Quote Controls drawer]
```

| Screen | Responsibility |
|--------|----------------|
| Frame | CRM, import, project metadata |
| Portfolio | All line configuration |
| Quote Controls | Deal-level calc inputs only |
| Executive Rail | Quote-level read + alerts + analytics |
| Commit | Readiness, export, approval |

## Migration phases

| Phase | Focus |
|-------|--------|
| 0 | Document (this review) |
| 1 | Unify rail; Team/Risk analytics on rail |
| 2 | Remove Scope Team/Risk tabs |
| 3 | Quote Controls drawer; demote Economics step |
| 4 | Single vendor model decision |
| 5 | Margin center without duplicate product list |
| 6 | Review → Commit with full read-only economics |
| 7 | Readiness 2.0 (product validation) |

## Related specs

- [Stakeholder approval checklist](./stakeholder-approval-checklist.md)
- [Executive Quote Rail spec](./executive-quote-rail-spec.md)
- [Quote Controls spec](./quote-controls-spec.md)
- [Phase 1 implementation plan](./migration-phase-1.md)

## What NOT to do without IA sign-off

- No new Scope layout polish unrelated to portfolio/rail split  
- No new tabs/steps without resolving duplication matrix  
- No assumption Economics must stay a full center-column step forever  
