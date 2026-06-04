# Executive Quote Rail — wireframe-level spec

## Purpose

Single permanent right column (desktop) and mobile insight sheet: **read-only** quote executive view + **analytics** + entry to **Quote Controls**. Replaces switching `InsightRail` between `liveQuote` and `full` by deal step.

## Layout (desktop, ~360px)

```
┌─────────────────────────────────────┐
│ [Summary][Team][Risk][COGS]  tabs   │  ← segmented control, scrollable on narrow
├─────────────────────────────────────┤
│ TAB BODY (scroll)                   │
│                                     │
├─────────────────────────────────────┤
│ [Quote controls]  outline button    │
│ [Export PDF]                        │
│ [Save as template]                  │
└─────────────────────────────────────┘
```

## Tab: Summary (default)

| Block | Content | Source component |
|-------|---------|------------------|
| Hero | Selling price, margin %, bar | `LiveQuoteSummary` |
| Snapshot | Team cost, vendor cost, product count | `LiveQuoteSummary` |
| Readiness | Chip when `readiness` provided | `QuoteReadiness` |
| Alerts | Max 3 intelligence + calc warnings | `IntelligenceAlerts` |
| Optional expand | Margin stack, COGS rows, deductions | Collapsibles (from legacy `full` rail) |

**Empty state:** `QuoteEmptyState` + “Go to Portfolio” CTA.

## Tab: Team

| Block | Content |
|-------|---------|
| KPI row | Total team cost, hours, roles |
| Top roles | Progress bars |
| Product share | Labor concentration |

Component: `QuoteTeamDashboard` with `compact` (no workspace banner).

## Tab: Risk

| Block | Content |
|-------|---------|
| Quote risk score | Label + tone |
| Distribution | Low/med/high counts |
| Highest risk products | Top 3 list |

Component: `QuoteRiskDashboard` with `compact`.

## Tab: COGS

| Block | Content |
|-------|---------|
| Internal labor | Currency |
| Vendor / overhead | Currency |
| Deductions | Incentives, financing |
| Margin breakdown | When granular mode |

Reuses rail `Row` + collapsibles; no editing.

## Quote Controls entry

- Button opens `QuoteControlsDrawer` (sheet from right on mobile, same on desktop overlay).
- Does not navigate away from Portfolio.

## Mobile

- `InsightSheet` hosts same `ExecutiveQuoteRail` (or `InsightRail` wrapper).
- Bottom pill shows selling + margin; opens full rail.

## Data props (parent `Calculator`)

| Prop | Used for |
|------|----------|
| `results`, `calculating` | All tabs |
| `calcData`, `readiness` | Summary, alerts |
| `selectedProducts` | Team, Risk |
| `roles`, `standardMonthlyHours` | Team |
| `productCount` | Summary |
| Drawer: `setCalcData`, `projectInfo`, `paymentTerms`, `onOpenQuoteSettings` | Controls |

## Acceptance criteria

1. Compose step shows **same** rail capabilities as Economics/Review (no `liveQuote`-only mode).
2. Team and Risk analytics **not** duplicated in Scope center tabs.
3. Export PDF and save template remain in rail footer.
4. `data-testid="executive-quote-rail"` on root; tabs `data-rail-tab="{id}"`.

## Component map

| New / updated | File |
|---------------|------|
| ExecutiveQuoteRail | `ExecutiveQuoteRail.jsx` |
| Wrapper | `InsightRail.jsx` → delegates to executive |
| Drawer | `QuoteControlsDrawer.jsx` |
