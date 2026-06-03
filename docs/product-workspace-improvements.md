# ProductWorkspaceCard — Prioritized Improvements

All items reference specific issues found in `docs/product-workspace-ux-audit.md`.
Severity: P0 = breaks trust or causes wrong behavior, P1 = significant usability regression,
P2 = polish / enhancement.

---

## P0 — Critical (fix before shipping to users)

### P0-1: "Add all to team" triggers global sync, not product-specific add

**Issue:** The button inside the card's Team section calls `handleApplyProducts`, which opens the
replace/append dialog for ALL products. The label implies adding only this product's roles.

**Fix:** Change the button label to "Sync all products to team" and position it in the toolbar
only (remove it from within the individual card). The card's Team section should show suggested
roles as read-only chips with a tooltip: "Click 'Apply to team' in the toolbar to add these
roles."

**Alternatively:** Build a product-specific add that calls `buildTeamMembersFromProducts` with
only this one product's `selectedProducts` entry, then appends (does not replace) matching
members. This is the higher-fidelity fix and eliminates the ambiguity entirely.

**Files affected:** `ProductWorkspaceCard.jsx` (TeamSection), `StepProducts.jsx` (toolbar),
`Calculator.jsx` (new handler)

---

### P0-2: Per-product risk UI is indistinguishable from global risk

**Issue:** Both the card's Risk section and the global Risk tab show three identical dropdowns
labeled Complexity / Rush / Execution. Per-product risk is an annotation with no pricing effect.
Global risk (in `calcData.internal_risk`) actually affects the pricing formula.

**Fix (minimum):** Remove the per-product risk section from the card entirely until it is
connected to a calculation. Replace it with a simple text field labeled "Risk notes" or a single
"Risk level" select (None / Low / Medium / High) that clearly states "(planning note only — does
not affect quote price)".

**Fix (preferred):** Remove the per-product risk UI entirely from the card. The global Risk tab
already covers this. The per-product `risk` field in `selectedProducts[i]` can remain in the
data model for future use but should not be surfaced in the card until it drives calculations.

**Files affected:** `ProductWorkspaceCard.jsx` (RiskSection, header badge), `Calculator.jsx`
(badge count in card should be removed or re-labeled)

---

### P0-3: Health badge removed — no pricing signal in collapsed state

**Issue:** The old `rowHealthIndicator` showed min margin %, execution risk flag, or sheet status
at a glance. This has been removed entirely. The collapsed card now shows no pricing information,
forcing users to click "Insights" on every card to understand the pricing situation.

**Fix:** Restore a compact, always-visible pricing signal in the card header. It does not need
to be a number — a badge is sufficient:
- "Min 30%" → segment has a minimum margin floor
- "Exec risk" → segment has `execution_risk` set
- "Sheet ok" → segment has base min selling price but no special flags
- "No sheet" → no catalog data for this selection

This is the same logic as the deleted `rowHealthIndicator` function and can be re-added with
a single utility function in the card.

**Files affected:** `ProductWorkspaceCard.jsx` (header section)

---

## P1 — High priority (significant UX regressions)

### P1-1: "Team N" count shows suggestions, not actual team members

**Issue:** `derivedTeamCount = segmentPayload?.internal_roles?.length ?? 0`. The label "Team 3"
reads as "3 team members assigned to this product". It actually means "3 roles are defined in
the segment sheet."

**Fix:** Change the label to "Roles N" or "N roles suggested". Better still: show two separate
values in the header — "N roles suggested / M added" — where M is the count of team members in
`calcData.team_members` whose roles match this product's `internal_roles`. This requires a small
derivation step in the card but is not complex.

**Files affected:** `ProductWorkspaceCard.jsx` (lines 165, 264)

---

### P1-2: Service name has no visual hierarchy — buried in a select trigger

**Issue:** The service name is displayed as the value inside a Select trigger (`h-9`, standard
border). It has the same visual weight as the Segment select and Qty input. For a list of 5
products, all cards look identical until you read each select value individually.

**Fix options (choose one):**
A. When a service name is selected, display it as a `<span>` heading above the inputs (bold,
   slightly larger), and keep the segment/qty as editable below. The card becomes a mini-card
   with a header row and a controls row.
B. Show the service name in the select trigger with heavier font weight (via Tailwind class on
   the trigger content).
C. After initial selection, show the service name as a read-only label above the row with a small
   "Change" link that opens the select.

**Files affected:** `ProductWorkspaceCard.jsx` (header Service section)

---

### P1-3: Section toggle buttons crowd the header; no visual state on scroll

**Issue:** The three `SectionToggle` pills (Team, Insights, Risk) are always in the header
alongside input fields and badges. When a section is open, the user cannot tell which card has
an open section if they have scrolled away from the header.

**Fix:** Move section toggles out of the main input row. Place them on a separate thin row at
the bottom of the card header, separated by a faint divider. When a section is open, add a
subtle left border color or background tint to the entire card to indicate active state.

**Files affected:** `ProductWorkspaceCard.jsx` (header layout, CSS)

---

### P1-4: DepartmentRolePicker in standalone Team section inflates card height excessively

**Issue:** The full `DepartmentRolePicker` (search input, department filter chips, role list) is
rendered inside the expanded Team section of a standalone card. It can be ~400–500px tall, which
effectively hides all other products below the viewport.

**Fix:** For standalone cards, show the role picker in a sheet/dialog triggered from a button
("Add team member"), not inline. The card's Team section should then show the list of already-
added members as compact chips, consistent with catalog cards.

**Files affected:** `ProductWorkspaceCard.jsx` (TeamSection component)

---

### P1-5: "Apply to team" in toolbar duplicates "Add all to team" in card

**Issue:** Both buttons ultimately call `handleApplyProducts`. The toolbar button applies to all
products. The in-card button appears to apply to just this product but does not. Users encounter
two buttons with different scopes but the same behavior.

**Fix:** Keep only the toolbar button, renamed to "Sync team from products". Remove the in-card
"Add all to team" button. The card's Team section becomes read-only (role chips + count), and
the action to materialize the team stays in the toolbar.

**Files affected:** `StepProducts.jsx` (toolbar), `ProductWorkspaceCard.jsx` (TeamSection)

---

## P2 — Polish / Enhancement

### P2-1: No visual differentiation between catalog and standalone cards

A standalone card looks identical to a catalog card in its collapsed state (except the service
name field type differs). Add a subtle badge or left-border color indicator for standalone cards.

**Files affected:** `ProductWorkspaceCard.jsx`

---

### P2-2: Section toggles are not obviously interactive

The `SectionToggle` pills use text color changes for hover but no clear button shape in inactive
state. Many users will not recognize them as clickable. Add `cursor-pointer` and a visible border
in inactive state (e.g., `border-slate-200 hover:border-slate-300` for light mode).

**Files affected:** `ProductWorkspaceCard.jsx` (SectionToggle component)

---

### P2-3: Insights section missing context label

When the Insights section opens, the content starts immediately with "Sheet pricing (×N)".
There is no heading or explanation of what the O, J, L labels mean. First-time users will not
understand these abbreviations.

**Fix:** Add a one-line descriptor: "Minimum pricing from the rate card for this segment."

**Files affected:** `ServicePricingDetail.jsx` or wrapper in `ProductWorkspaceCard.jsx`

---

### P2-4: No empty/loading state for card when catalog is not yet loaded

When `filteredProductsCatalog` is empty because the catalog is still loading, the service Select
is just an empty dropdown. The card should show a skeleton or disabled state with a message
"Loading catalog..." to prevent user confusion.

**Files affected:** `ProductWorkspaceCard.jsx`

---

### P2-5: Segment select defaults not updated when family filter changes

When the user changes the family filter in the toolbar, `filteredProductsCatalog` shrinks.
If a product is already selected but its family is now filtered out, the Select shows an empty
value. The product is not removed — only the display breaks. A stable display of the current
service name independent of the filter would prevent this.

**Files affected:** `ProductWorkspaceCard.jsx` (service Select rendering)

---

## Improvement Priority Matrix

| ID | Severity | Effort | Implement? |
|---|---|---|---|
| P0-1 | Critical | Medium | Yes — before any new feature |
| P0-2 | Critical | Low | Yes — before any new feature |
| P0-3 | Critical | Low | Yes — before any new feature |
| P1-1 | High | Low | Yes |
| P1-2 | High | Medium | Yes |
| P1-3 | High | Medium | Yes |
| P1-4 | High | Medium | Yes |
| P1-5 | High | Low | Yes |
| P2-1 | Low | Low | Batch with P1 fixes |
| P2-2 | Low | Low | Batch with P1 fixes |
| P2-3 | Low | Low | Batch with P1 fixes |
| P2-4 | Low | Medium | Later |
| P2-5 | Low | Low | Later |
