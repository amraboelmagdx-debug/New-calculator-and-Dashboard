# Compose Step — Issues Register

Opinionated audit of why Scope feels **fragmented** and **overloaded**.  
Severity: **P0** (blocks coherent UX) · **P1** (major friction) · **P2** (polish)

**Related:** [compose-step-ui-map.md](compose-step-ui-map.md) · [compose-step-redesign-options.md](compose-step-redesign-options.md)

---

## Visual duplication

### P0 — Triple quote summary

| Symptom | Root cause | Fix direction |
|---------|------------|---------------|
| Selling price and margin appear in header strip, right rail, and (on Economics) sticky summary | `QuoteHealthStrip` + `InsightRail` both render hero metrics; Economics adds another | **Pick one** live quote home on Scope; rail = breakdown-only or collapsed |

**Files:** `QuoteHealthStrip.jsx`, `InsightRail.jsx`, `Calculator.jsx` layout

---

### P1 — Deal size badge twice

| Symptom | Root cause | Fix direction |
|---------|------------|---------------|
| `incentive_breakdown.deal_size` in health strip and InsightRail | Duplicated conditional render | Show once in chosen quote surface |

**Files:** `QuoteHealthStrip.jsx` ~68+, `InsightRail.jsx` ~82+

---

### P1 — Sheet minimum (O) in three places

| Symptom | Root cause | Fix direction |
|---------|------------|---------------|
| Per-row O in `ServicePricingDetail`; global `sheetPriceFloorWarning` in strip/rail | Row panel + `getSheetMinimumTotal()` warning | Scope strip shows **aggregate** floor once; row panel shows delta or hide O when strip visible |

**Files:** `ServicePricingDetail.jsx`, `Calculator.jsx` `getSheetMinimumTotal`, `IntelligenceAlerts`

---

## Functional duplication

### P0 — Two team-sync mechanisms

| Symptom | Root cause | Fix direction |
|---------|------------|---------------|
| Team changes without explicit consent; Apply button feels redundant | 300ms `useEffect` auto-replace (`Calculator.jsx` ~455–476) vs `handleApplyProducts` dialog | **One** “Sync team from products” with preview + undo; disable silent replace |

**Files:** `Calculator.jsx`, `StepProducts.jsx` Apply button

---

### P1 — Three refresh entry points

| Symptom | Root cause | Fix direction |
|---------|------------|---------------|
| “Refresh sheet” on Products header, Team header, and Data bar “Sync” | Each card owns refresh; `DataSourcesStatus` batches both APIs | Single **Scope data** control in shared strip |

**Files:** `StepProducts.jsx`, `StepTeam.jsx`, `DataSourcesStatus.jsx`

---

### P1 — Last synced shown twice

| Symptom | Root cause | Fix direction |
|---------|------------|---------------|
| Products header locale timestamp + Data bar “Products · Xm ago” | Overlapping sync UX | One timestamp in Scope strip |

**Files:** `StepProducts.jsx` ~49–52, `DataSourcesStatus.jsx`

---

## Split hierarchy

### P0 — Products and Team feel unrelated

| Symptom | Root cause | Fix direction |
|---------|------------|---------------|
| Two full cards, different accent colors, weak visual link | `StepCompose` is a fragment wrapper only | Unified Scope shell with linked sub-panels or split-pane |

**Files:** `StepCompose.jsx`, `StepProducts.jsx`, `StepTeam.jsx`

---

### P1 — Risk factors hidden in Team card

| Symptom | Root cause | Fix direction |
|---------|------------|---------------|
| `internal_risk` affects whole quote but lives in collapsed Team footer | `StepTeam.jsx` collapsible after members | Promote to Scope-level **Risk** row or tab |

**Files:** `StepTeam.jsx` ~123–183

---

### P1 — No BD scope context on compose

| Symptom | Root cause | Fix direction |
|---------|------------|---------------|
| Imported opportunity lines not visible while building | Scope list only on Opportunity step | Read-only chips above builder: matched/unmatched |

**Files:** `StepFrame.jsx`, `Calculator.jsx` import flow

---

## Cognitive split

### P0 — Margins configured on next step

| Symptom | Root cause | Fix direction |
|---------|------------|---------------|
| User sees min margin % on row badges but edits margin in Economics | `MarginControlCenter` on `#pricing` only | Inline margin on row OR clear “edit pricing” deep link per line |

**Files:** `MarginControlCenter.jsx`, `StepEconomics.jsx`, `marginEngine.js`

---

### P1 — Cost vs price language mixed on Scope

| Symptom | Root cause | Fix direction |
|---------|------------|---------------|
| Sheet panel emphasizes O/J/L (cost/floor); header shows selling price | `ServicePricingDetail` + calculate results | Label zones: “Sheet reference” vs “Quote outcome” |

**Files:** `ServicePricingDetail.jsx`, `QuoteHealthStrip.jsx`

---

## Layout friction

### P1 — 12-column row + full-width detail

| Symptom | Root cause | Fix direction |
|---------|------------|---------------|
| Cramped selects; detail panel breaks row grouping | `StepProducts.jsx` grid 5+3+2+2 then `col-span-12` | Card-per-line with header summary; detail in drawer |

**Files:** `StepProducts.jsx` ~136–235

---

### P1 — Mobile hides half of compose

| Symptom | Root cause | Fix direction |
|---------|------------|---------------|
| Products OR Team, not both | `isSectionVisible` + `composeSubTab` | Desktop-style split or stacked with anchor nav on tablet |

**Files:** `Calculator.jsx` ~1073–1074, ~1272–1295

---

### P2 — Vertical scroll explosion

| Symptom | Root cause | Fix direction |
|---------|------------|---------------|
| N products × (row + detail + team rows) | Inline `ServicePricingDetail` + `TeamMemberRow` height | Collapse detail by default; compact team table mode |

**Files:** `ServicePricingDetail.jsx`, `TeamMemberRow.jsx`

---

## CTA noise

### P1 — Continue only on Team when both visible

| Symptom | Root cause | Fix direction |
|---------|------------|---------------|
| User finishes products, must scroll past Team to continue | `StepCompose` passes `onContinue` only to Team when `showTeam` | **Single** sticky Scope footer: Continue to Economics |

**Files:** `StepCompose.jsx` line 10, `StepContinueFooter.jsx`

---

### P2 — Competing primary buttons

| Symptom | Root cause | Fix direction |
|---------|------------|---------------|
| Violet Apply vs indigo Continue | Different actions, similar weight | Apply → secondary; one primary forward |

**Files:** `StepProducts.jsx` toolbar

---

## Silent / surprising behavior

### P0 — Auto team replace without undo

| Symptom | Root cause | Fix direction |
|---------|------------|---------------|
| Manual team edits overwritten | Debounced effect replaces `team_members` | Toast/banner: “Team updated from products — Undo” |

**Files:** `Calculator.jsx` ~455–476

---

### P2 — Segment default inconsistency

| Symptom | Root cause | Fix direction |
|---------|------------|---------------|
| Manual add → `tiny`; opportunity import → `standard` | Different code paths | Single default (e.g. `standard`) |

**Files:** `StepProducts.jsx` ~100, `Calculator.jsx` import merge

---

### P2 — Step complete without products

| Symptom | Root cause | Fix direction |
|---------|------------|---------------|
| Scope checkmark with team only | `quoteSteps.js` OR condition | Require ≥1 valid product for compose complete (product decision) |

**Files:** `quoteSteps.js` ~21–22

---

## IntersectionObserver vs stepper

### P2 — Active step flicker with expand-all

| Symptom | Root cause | Fix direction |
|---------|------------|---------------|
| Stepper highlights wrong step while scrolling | Observer updates `activeDealStep` from visible sections | Disable observer when `expandAllSections` or tie to click-only |

**Files:** `Calculator.jsx` ~1081–1098

---

## Summary counts

| Severity | Count |
|----------|-------|
| P0 | 5 |
| P1 | 11 |
| P2 | 5 |

**Top 3 to fix for “one workspace” feel:**

1. Consolidate quote summary (header vs rail).  
2. Unify products + team layout and team sync UX.  
3. Move sheet detail out of inline row expansion.

See [compose-step-redesign-options.md](compose-step-redesign-options.md) for structured solutions.
