# ProductWorkspaceCard — Design Recommendations

This document describes the recommended final state of the card after applying the improvements
identified in `docs/product-workspace-improvements.md`. It serves as the specification for the
next implementation pass.

---

## Guiding Principles

1. **One click to the most important information.** The min price and risk status should never
   require opening a section. They belong in the header.
2. **Actions must match their scope.** "Add all to team" must either add only THIS product's
   roles, or be renamed and moved to a place that communicates its global scope.
3. **One risk system, clearly labeled.** Remove the per-product risk controls from the card
   until they drive calculations. The global Risk tab is sufficient for now.
4. **Service name is the identity.** It should be the most visually prominent element in the
   collapsed card.
5. **Progressive disclosure, not progressive confusion.** Each level should make it clearer what
   the next level adds, not create a different version of something the user already saw.

---

## Recommended Card Anatomy

### Collapsed state (always visible)

```
┌────────────────────────────────────────────────────────────────┐
│  [●] Web Development  ·  STANDARD  ·  ×2                       │  ← identity row
│      Min 30%  |  2h  |  Exec: fixed                            │  ← status chips (restored health)
│  [ Team (3 roles) ]  [ Insights ]                    [🗑]      │  ← action row
└────────────────────────────────────────────────────────────────┘
```

The card is a **3-row header** in collapsed state:

- **Row 1 (Identity):** Service name as a bold `<span>` (not inside select trigger). Segment
  badge. Qty. For editing: a small "Edit" pencil icon that makes the selects appear inline.
  This separates reading from editing and removes the visual weight of three select triggers.

- **Row 2 (Status chips):** Compact, read-only, always-visible: health badge (Min N%, Exec risk,
  Sheet ok), total team hours badge from `segmentData.total_team_hours`, execution mode badge.
  These are restored from the deleted `rowHealthIndicator` plus the existing segment badges.

- **Row 3 (Actions):** Two to three small action buttons: "Team (N roles)" and "Insights", plus
  delete. The Risk section toggle is removed from the card.

### Expanded: Team section

```
├──── Team ──────────────────────────────────────────────────────┤
│  Suggested from sheet:                                         │
│  ○ Senior Developer  40h                                       │
│  ○ Project Manager   8h                                        │
│  ○ QA Engineer       16h                                       │
│                                                                │
│  [Sync all products to team ↑]  (opens global dialog)         │
└────────────────────────────────────────────────────────────────┘
```

- Section label: "Suggested from sheet" (not "Add to team") to make it clear this is a preview.
- Roles shown as a compact list (not chips) for legibility with longer role names.
- Single CTA: "Sync all products to team" — global action, clearly labeled as such.
- No DepartmentRolePicker inline. For standalone cards, show: "No catalog data. Use the Team tab
  to add members manually." with a link/button that switches the ScopeWorkspace to the Team tab.

### Expanded: Insights section

```
├──── Insights ──────────────────────────────────────────────────┤
│  Sheet pricing for Web Development · STANDARD · ×2             │
│  O: SAR 90,000   J: SAR 76,000   L: SAR 88,000                │
│                                                                │
│  [ Deliverables ]  [ Modifications ]  [ Open sheet ↗ ]        │
└────────────────────────────────────────────────────────────────┘
```

- Header line with service + segment + qty for context (user may have scrolled).
- O/J/L numbers prominent. Abbreviated labels explained in tooltip.
- Action buttons for dialogs below the numbers.
- No structural changes needed to `ServicePricingDetail` — just wrap it in this labeling.

### Risk section: REMOVED from card

The Risk section toggle is removed from the card entirely. Rationale:
- Per-product risk (`selectedProducts[i].risk`) has no effect on calculations.
- Adding it to the card creates a false impression of control.
- The global Risk tab in `ScopeWorkspace` covers quote-level risk adjustment.
- When/if per-product risk is connected to calculations in a future sprint, it can be
  re-introduced with a clear label: "This adjusts pricing for this line only."

The `risk` field on `selectedProducts[i]` can stay in the data model for future use.
The `handleUpdateProductRisk` handler in `Calculator.jsx` can stay.
Just do not render the controls in the card.

---

## Edit vs. View Mode (optional enhancement)

To resolve the service name hierarchy problem without a full redesign, consider a simple
read/edit toggle per card:

- **View mode (default):** Service name shown as text, no input borders visible.
  Row 1: `[Service name]  STANDARD  ×2`
- **Edit mode (on click or hover):** Service name becomes select trigger, segment and qty
  become editable inputs. Small "Done" button to return to view mode.

This is a medium-effort change but significantly improves scannability for a list with 4+ cards.

---

## Section Toggle Placement Recommendation

Move section toggles from the input row to a bottom action row within the card header, separated
by a faint divider:

```jsx
// Card structure (recommended)
<div className="card-identity-row">  {/* service, segment, qty */}
<div className="card-status-row">    {/* health badge, hours badge, mode badge */}
<div className="border-t card-action-row">  {/* Team | Insights | delete */}
```

When a section is open, add a left border accent to the card:
```jsx
// Active card variant
<div className={`border-l-2 ${openSection === 'team' ? 'border-l-blue-500' : 'border-l-indigo-500'}`}>
```

---

## Standalone Service Card Differences

For `is_standalone: true` cards:

| Element | Catalog card | Standalone card |
|---|---|---|
| Service name | Select from catalog | Free text input |
| Segment | Select visible | Hidden |
| Status chips | From sheet data | "No sheet data" label |
| Team section | Role chips from `internal_roles` | "Manage in Team tab" message + link |
| Insights section | ServicePricingDetail | Hidden / "No catalog data" |

A small "Custom" or "Standalone" badge in the identity row distinguishes these visually.

---

## Summary of Changes vs. Current Implementation

| Area | Current | Recommended |
|---|---|---|
| Service name display | Select trigger (same weight as inputs) | Bold text heading; edit on click |
| Status chips | None | Restored health badge + hours + mode |
| Section toggles | 3 pills in input row (Team, Insights, Risk) | 2 pills in bottom action row (Team, Insights) |
| Risk in card | 3 dropdowns (no calculation effect) | Removed |
| Risk badge in header | "Risk ×N" (annotation count) | Removed |
| Team count label | "Team N" (suggestion count) | "N roles suggested" |
| "Add all to team" | Calls global sync dialog | Removed; toolbar button covers this |
| Standalone Team section | Full DepartmentRolePicker inline | "Manage in Team tab" message |
| Card active state indicator | None | Left border accent when section open |

---

## Files to Modify (next implementation pass)

| File | Change |
|---|---|
| `ProductWorkspaceCard.jsx` | Identity/status/action row split; remove Risk section; fix team count label; restore health badge; replace standalone team section |
| `StepProducts.jsx` | Rename/consolidate "Apply to team" button; remove in-card "Add all to team" handler |
| `Calculator.jsx` | No structural changes needed; `handleUpdateProductRisk` stays for future use |
| `ScopeWorkspace.jsx` | No changes needed |
| `ServicePricingDetail.jsx` | Optional: add context label in compact mode |
| `index.css` | Add left-border accent class for active card state |
