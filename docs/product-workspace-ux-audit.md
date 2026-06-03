# ProductWorkspaceCard — UX & Information Architecture Audit

## Scope

This audit reviews the current `ProductWorkspaceCard.jsx` implementation (and the containing
`StepProducts.jsx`, `ScopeWorkspace.jsx`) against 10 usability questions, with specific references
to code sections where problems originate.

---

## 1. Does the card reduce or increase visual complexity?

**Finding: Net increase in complexity for most users.**

The old row had 5 interactive elements: service select, segment select, qty input, collapse toggle,
delete button. The new card header has 8–9 interactive elements:

```
[Service select]  [Segment select]  [Qty input]  |  [Opp badge]  [Risk ×N badge]  |
[Team N]  [Insights]  [Risk]  |  [Delete]
```

This is a `flex flex-wrap items-end gap-2 p-3` container. On any column narrower than ~600px
(which is the common case inside the Products tab of `ScopeWorkspace`), the right-side cluster
wraps to a second line. The result is a two-line header that looks unfinished and is harder to scan
than the original single row.

The section toggle buttons (`SectionToggle` components, lines 20–38 of `ProductWorkspaceCard.jsx`)
appear in the header even when there is no data behind them. For example, "Risk" always appears
even though the per-product risk is an annotation with no calculation effect. "Team" always
appears even when a service has no `internal_roles` defined.

**Code reference:**
```jsx
// ProductWorkspaceCard.jsx, lines 261–288
<div className="flex items-center gap-1.5 pb-0.5 flex-wrap">
  {/* Opp badge */}
  {/* Risk ×N badge */}
  <div className={`flex items-center gap-0.5 pl-1 border-l ...`}>
    <SectionToggle id="team" ... />
    {(hasDetail || item.is_standalone) && <SectionToggle id="insights" ... />}
    <SectionToggle id="risk" ... />
  </div>
  {/* Delete */}
</div>
```

Mixing data-display badges (Opp, Risk ×N) with interaction controls (Team, Insights, Risk, Delete)
in the same flex container creates a visually ambiguous cluster. There is no clear affordance
hierarchy separating "this is information" from "this is a button".

---

## 2. Is the Team preview useful, or does it duplicate the Team tab?

**Finding: Conceptually useful but misleading in its current form.**

The Team section inside the card shows `segmentPayload?.internal_roles` chips — these are the
roles defined in the pricing sheet for the selected segment, multiplied by qty. The Team tab in
`ScopeWorkspace` shows the actual `calcData.team_members` that have been added to the deal.

These are genuinely different:
- Card Team = "suggested roles from this product's sheet" (pre-action)
- Global Team tab = "roles actually added to this deal" (post-action)

However, two problems undermine this distinction:

**Problem A — The "Team N" count is misleading.**
```jsx
// ProductWorkspaceCard.jsx, line 165
const derivedTeamCount = segmentPayload?.internal_roles?.length ?? 0;
// ...
label={derivedTeamCount > 0 ? `Team ${derivedTeamCount}` : 'Team'}
```
"Team 3" reads as "3 team members assigned". It actually means "3 roles are suggested by the
sheet". Users who have already synced team members may believe the count reflects actuals.

**Problem B — "Add all to team" triggers the global sync dialog, not a product-specific add.**
```jsx
// StepProducts.jsx, line 164
onAddToTeam={handleApplyProducts}
```
`handleApplyProducts` calls `openTeamSyncDialog`, which builds team from ALL selected products,
then opens the replace/append dialog. The button label implies adding only this product's
suggested roles. The actual behavior adds (or replaces) the entire team from all products.
This is a significant trust violation.

---

## 3. Is the Risk section discoverable and understandable?

**Finding: The Risk section introduces a dangerous ambiguity between two distinct risk systems.**

There are now two separate risk mechanisms:

| Risk system | Where stored | Affects calculations | UI location |
|---|---|---|---|
| Per-product annotation | `selectedProducts[i].risk` | No | Card → Risk section |
| Global quote risk | `calcData.internal_risk` | Yes | ScopeWorkspace → Risk tab |

Both systems expose identical UI: three select dropdowns labeled Complexity, Rush, Execution
with the same four options (None, Low, Medium, High).

```jsx
// ProductWorkspaceCard.jsx, lines 103–136 — per-product risk (annotation only)
// ScopeRiskPanel.jsx, lines 5–75 — global risk (affects pricing formula)
```

A user who sets per-product risk to "High" on the Risk section will not see any change in
pricing. They will then go to the global Risk tab and also set it to "High". They now have two
sets of "High" risk settings and no way to understand why pricing only changed once.

The per-product risk badge in the header compounds this:
```jsx
{activeRiskCount > 0 && (
  <Badge ...>Risk ×{activeRiskCount}</Badge>
)}
```
This badge reflects per-product annotation values, not the global risk that actually affects
pricing. A user could see "Risk ×2" in the header and assume the quote has been risk-adjusted,
when it has not.

**Discoverability:** The Risk section toggle is always visible in the header even for first-time
users with no context. No label or tooltip explains the difference between per-product risk and
global risk.

---

## 4. Does the Insights section surface the right information?

**Finding: The right data is there, but the access pattern is worse than before.**

`ServicePricingDetail` (rendered in the Insights section) shows:
- O (base minimum selling price × qty)
- J (total cost × qty)
- L (minimum selling price × qty, when different from O)
- Execution mode badge, execution risk badge, min margin badge, total team hours badge
- Deliverables, Modifications, Sheet URL, References buttons

This is the correct set of information. However, a key regression occurred: the old
`StepProducts.jsx` showed an always-visible `rowHealthIndicator` badge:

```jsx
// OLD StepProducts.jsx (now removed)
function rowHealthIndicator(segmentPayload, quantity) {
  const minMargin = segmentPayload.minimum_margin_percent;
  if (minMargin > 0) return { label: `Min ${minMargin}%`, tone: 'neutral' };
  if (segmentPayload.execution_risk) return { label: 'Risk', tone: 'warn' };
  if (segmentPayload.base_minimum_selling_price > 0) return { label: 'Sheet', tone: 'ok' };
  return null;
}
```

The new card shows NO pricing information in the collapsed state. The user cannot distinguish
between:
- A product with a clean sheet (no floor warnings)
- A product with a high minimum margin requirement
- A product with execution risk flagged

All three look identical in the collapsed state. The user must click "Insights" on every card to
check their status.

For a deal with 4–5 services, this means 4–5 extra click interactions just to verify what was
previously visible at a glance.

---

## 5. Are there too many accordions, collapsibles, or nested interactions?

**Finding: Four levels of progressive disclosure, with two conflated at level 2.**

```
Level 0: ScopeWorkspace — tabs [Products | Team | Risk]
Level 1: StepProducts — toolbar with "Add service" dropdown
Level 2: ProductWorkspaceCard — section toggles [Team | Insights | Risk]
Level 3: ServicePricingDetail — dialog buttons [Deliverables | Modifications | References]
```

Levels 0 and 2 are both "tabs" in visual appearance but different in behavior:
- Level 0 tabs hide entire panels (only one visible at a time)
- Level 2 section toggles open/close a single panel below the header (one at a time)

The `SectionToggle` component (lines 20–38) renders as a small pill with icon and label.
Active state uses a subtle blue background. Inactive state uses muted text. On first sight,
these are not obviously interactive — they read more like tags than buttons.

Additionally, the `DepartmentRolePicker` opened in the Team section of a standalone card is
itself a large interactive component (~240 lines, with internal state for search term and
department filter). Opening it creates an accordion item that is as tall as the entire Products
tab, pushing all subsequent cards far below.

---

## 6. Does the card still feel lightweight and scannable?

**Finding: Harder to scan than the old row; heavier to interact with.**

The old row had a clear linear layout: the most important info (service name) dominated the
left, with supporting controls to the right. The card currently has no visual hierarchy in its
header — service name appears in a `Select` trigger (height h-9, with gray border), which gives
it the same visual weight as the segment selector, the qty input, and the toggle buttons.

For a list of 5 products, the user sees 5 identical-looking cards with similar-weight inputs.
There is no quick way to identify which card is for which service without reading each select
trigger value.

The `space-y-3` gap between cards (`StepProducts.jsx`, line 144) is appropriate, but the
internal card padding (`p-3`) is tight enough that the header content can feel compressed,
especially with section toggles also in the same row.

---

## 7. Does the user immediately understand the key dimensions?

Assessing what is visible in the **collapsed card state** before any interaction:

| Dimension | Visible? | Notes |
|---|---|---|
| What service is this? | Yes | Select trigger shows service name |
| Which scope/size? | Yes | Segment select shows current value |
| How many units? | Yes | Qty input |
| What is the min price? | No | Must open Insights |
| What is the cost? | No | Must open Insights |
| Is there a floor warning? | No | Health badge was removed |
| Which roles are needed? | No | Must open Team |
| What risks apply? | Partial | "Risk ×N" badge shows annotation count, not real risk |
| Are vendors required? | No | Not shown anywhere |
| Was this from opportunity? | Yes | "Opp" badge when source=opportunity |

7 of 9 dimensions require at least one extra click or are not surfaced at all.

---

## 8. What parts should remain visible by default?

Based on the audit, the collapsed state should communicate:
1. Service name (large, prominent — not buried in a select trigger)
2. Segment + qty (supporting detail, smaller)
3. At least one pricing signal: sheet minimum price OR min margin % OR floor warning indicator
4. Team count — but only if team members have ACTUALLY been added, not just suggested
5. A single aggregate status badge (e.g., green checkmark if sheet OK, amber if floor warning)
6. Whether it's a standalone service (a badge or visual differentiator)

---

## 9. What parts should be collapsed?

The following should remain hidden-by-default:
- Full O/J/L price breakdown with execution mode details
- Deliverables, modifications, references text content
- Risk annotation controls
- Team role suggestion chips (a count is enough in the header)
- DepartmentRolePicker for standalone services

---

## 10. What parts should move elsewhere?

| Element | Current location | Recommended location |
|---|---|---|
| Per-product risk annotation | Card → Risk section toggle | Move to a note/tag field, or remove |
| "Apply to team" global button | StepProducts toolbar | Remove from toolbar (redundant with Team section) |
| "Add all to team" per-card | Card → Team section | Replace with clearer "Preview team" action |
| rowHealthIndicator | Removed entirely | Restore as always-visible compact badge in header |
| Global risk explanation | ScopeRiskPanel (only in Risk tab) | Add short inline tooltip near per-product risk UI |

---

## Summary Table

| Question | Verdict |
|---|---|
| Reduces complexity? | No — adds 3 extra buttons per card |
| Team preview useful? | Partially — concept valid but count misleads and action misfires |
| Risk discoverable? | Poorly — two systems, identical UI, one has no effect |
| Insights surfaces right info? | Yes — but lost the always-visible health signal |
| Nesting levels acceptable? | Borderline — 4 levels is the limit; standalone DepartmentRolePicker pushes past it |
| Still lightweight/scannable? | No — no hierarchy in header, identical card density |
| Key dimensions immediately visible? | 2 of 9 without interaction |
| Default visible content correct? | No — pricing signal and real team count are missing |
| Collapsed content appropriate? | Mostly correct |
| Misplaced elements? | Yes — risk annotation UI, misleading "Add all to team" CTA |
