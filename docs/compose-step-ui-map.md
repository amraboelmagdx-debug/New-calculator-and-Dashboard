# Compose Step — UI Map

**Scope:** Every visible region when `activeDealStep === 'compose'` (and chrome that stays on screen).  
**Last aligned with codebase:** May 2026

## Related docs

- [compose-step-audit.md](compose-step-audit.md) — state and data flow  
- [compose-step-issues.md](compose-step-issues.md) — fragmentation problems  
- [compose-step-redesign-options.md](compose-step-redesign-options.md) — recommended structure  
- [compose-scope-section-redesign-brief.md](compose-scope-section-redesign-brief.md) — detailed field reference  

---

## Z-index and sticky stack

```text
z-50  App header (logo, theme, PDF, nav buttons)     sticky top-0
z-40  QuoteHealthStrip (selling price, margin, badge) sticky top-[73px]
      Horizontal DealStepper                         scrolls with page
      ─────────────────────────────────────────
      lg: sidebar (stepper + templates)             normal flow
      Main column                                    normal flow
      lg: InsightRail                                sticky top-[140px] h-[calc(100vh-9rem)]
z-*   BottomNav (mobile)                             fixed bottom pb-28 on main
```

**Opinion:** Three vertical “anchors” (header, health strip, rail) compete for attention with the actual builder in the center column.

---

## Full-page zone map (desktop, compose, default)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ ZONE A: App header                                                           │
├──────────────────────────────────────────────────────────────────────────────┤
│ ZONE B: QuoteHealthStrip — Selling price | Margin % | Deal size | Warning  │
├──────────────────────────────────────────────────────────────────────────────┤
│ ZONE C: Horizontal DealStepper — Opp | Scope* | Econ | Review               │
├────────────┬─────────────────────────────────────────────────┬───────────────┤
│ ZONE D     │ ZONE E (main)                                   │ ZONE F        │
│ Sidebar    │                                                 │ InsightRail   │
│            │ E1 DataSourcesStatus + Show all sections        │ F1 Selling    │
│ D1 Stepper │ E2 [mobile only: Products | Team tabs]          │ F2 Margin bar │
│ D2 Template│ E3 #products — Products pricing builder         │ F3 Deal size  │
│   Panel    │ E4 #team — Internal team                        │ F4 Net profit │
│            │                                                 │ F5 Alerts     │
│            │                                                 │ F6 Collapsibles│
│            │                                                 │ F7 PDF/Template│
└────────────┴─────────────────────────────────────────────────┴───────────────┘
```

`*` Scope active. Economics/Review sections hidden unless expand-all or step change.

---

## Section tree (compose pixels only)

| Zone | ID / testid | Component | Visible when |
|------|-------------|-----------|--------------|
| E1 | `data-sources-status` | `DataSourcesStatus` | Always in main (all steps) |
| E1 | `expand-all-sections` | Switch | Always in main |
| E2 | — | Pill tabs Products/Team | `compose` && `!isLg` |
| E3 | `products` | `StepProducts` | `isSectionVisible('products')` |
| E3a | `products-pricing-toolbar` | Toolbar row | Inside products card |
| E3b | — | Product row grid | Per `selectedProducts` item |
| E3c | — | `ServicePricingDetail` | Row has name + segment |
| E4 | `team` / `team-section` | `StepTeam` | `isSectionVisible('team')` |
| E4a | — | `DepartmentRolePicker` | Always in team card |
| E4b | — | `TeamMemberRow` × N | `team_members.length > 0` |
| E4c | — | Internal risk collapsible | `team_members.length > 0` |
| B | `quote-health-strip` | `QuoteHealthStrip` | Always |
| F | `dashboard` | `InsightRail` | `lg+` |
| Mobile F | `InsightSheet` | Same content | Bottom nav “insight” |

---

## Visibility matrix

| Condition | Products | Team | Other steps’ sections |
|-----------|----------|------|------------------------|
| `compose` + `lg+` | Yes | Yes (stacked) | Hidden |
| `compose` + `<lg` | One tab | One tab | Hidden |
| `expandAllSections` | Yes | Yes | Opportunity, Economics, Review also visible |
| User on Economics step | Hidden | Hidden | Vendors + pricing visible |

**Continue footer:**

| Products visible | Team visible | Products footer | Team footer |
|------------------|--------------|-----------------|-------------|
| Yes | No | Continue to Economics | — |
| Yes | Yes | **None** | Continue to Economics |
| No | Yes | — | Continue to Economics |

---

## Products card wireframe

```text
┌─ Card: Products pricing builder ─────────────────────────────────────────┐
│ [violet icon] Title + description + Last synced                            │
│                                    [Refresh sheet]                         │
├──────────────────────────────────────────────────────────────────────────┤
│ TOOLBAR                                                                    │
│ [All service families ▼]  [+ Add product]  [Apply to team] (violet fill) │
├──────────────────────────────────────────────────────────────────────────┤
│ ROW (12-col grid, bordered)                                                │
│  [Service name ▼ 5] [Segment ▼ 3] [Qty 2] [Delete 2]                     │
│  ┌─ ServicePricingDetail col-span-12 ──────────────────────────────────┐  │
│  │ SHEET PRICING (×qty) | O | J | (L) | badges | cost basis line      │  │
│  │ [Deliverables] [Modifications] [Detailed sheet] [Reference]        │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│ ROW ...                                                                    │
│ [Continue to Economics]  ← only if Team section hidden                     │
└────────────────────────────────────────────────────────────────────────────┘
```

**Row height:** Grows significantly when detail panel open—each line can be ~200–350px.

---

## Team card wireframe

```text
┌─ Card: Internal team ──────────────────────────────────────────────────────┐
│ [blue icon] Title + description              [Refresh sheet]               │
├──────────────────────────────────────────────────────────────────────────┤
│ DepartmentRolePicker (department → role chips / add)                       │
│ ── empty: QuoteEmptyState compact ──                                       │
│ ── filled: "Selected team (N)" + TeamMemberRow cards ──                    │
│ ▼ Internal risk factors [badge count]  (Collapsible, closed by default)   │
│     [complexity ▼] [rush ▼] [execution ▼]                                  │
│ [Continue to Economics]                                                    │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## InsightRail wireframe (compose session)

```text
┌─ InsightRail ──────────────────────┐
│ Selling price (hero)               │  ← duplicates Zone B
│ Contribution margin + bar          │  ← duplicates Zone B
│ Deal size badge                    │  ← duplicates Zone B
│ Net profit                         │
│ IntelligenceAlerts                 │
│ ▼ Margin breakdown (granular)      │
│ ▼ Cost breakdown                   │
│ ▼ Deductions                       │
│ Warnings list                      │
│ [Save template] [Export PDF slot]  │
└────────────────────────────────────┘
```

Empty state: “Go to Scope” CTA when no results.

---

## Color-accent map

| Color | Meaning today | Where |
|-------|---------------|-------|
| Violet | Products / sheet detail | Products header, Apply, `ServicePricingDetail` border |
| Blue | Team | Team header icon |
| Indigo | Primary step forward | Continue footer |
| Emerald | Money “good”, sync OK, O column | Detail panel, health margin high |
| Amber | Warnings, deliverables, stale | Alerts, detail button |
| Rose | Low margin, errors | Health strip margin |

**Design read:** Four semantic hues on one step signals separate mini-products, not one Scope workspace.

---

## Interaction map

| User action | Effect | Navigates? |
|-------------|--------|------------|
| Deal stepper → Scope | `goToDealStep('compose')`, scroll to `#products` | Scroll |
| Mobile Products/Team tab | `setComposeSubTab`, scroll to section | Scroll |
| Add product | Append row in state | No |
| Change service/segment/qty | Update row; may trigger auto-sync team | No |
| Apply to team | Open replace/append dialog | No |
| Refresh sheet (card header) | Reload catalog or roles | No |
| Data bar Sync | Products + roles refresh | No |
| Continue to Economics | `goToDealStep('economics')` | Step + scroll |
| Show all sections | Toggle long scroll | No |
| Insight “Go to Scope” | `goToDealStep('compose')` | Yes |
| Template load | Hydrate products/team from template | No |

**Keyboard:** Ctrl/Cmd+1–4 jumps deal steps (`Calculator.jsx`).

---

## Mobile-specific map

```text
[Header]
[Health strip]
[Horizontal stepper]
[Data bar] [Expand switch]
[Products | Team]  ← only one of E3/E4
[Active card - full width]
[BottomNav: frame | compose | economics | more | insight]
```

`pb-28` on main reserves space for bottom nav. Insight opens `InsightSheet` overlay.

---

## Tailwind layout primitives (compose)

| Pattern | Example |
|---------|---------|
| Page grid | `lg:grid-cols-[240px_1fr_360px] gap-6` |
| Main stack | `space-y-6 min-w-0` |
| Product row | `grid grid-cols-12 gap-3` |
| Card shell | `rounded-xl` + `dark-card` |
| Toolbar | `flex flex-wrap gap-2 px-6 pb-4 border-b` |
| Detail panel | `col-span-12 rounded-xl border p-4` |

---

## What is *not* on this step (but related)

- `MarginControlCenter` — Economics `#pricing`
- `StepFrame` / opportunity scope list — Opportunity `#project`
- `ExportPDF` in header — global, not compose-specific

See [compose-step-audit.md](compose-step-audit.md) for architecture links.
