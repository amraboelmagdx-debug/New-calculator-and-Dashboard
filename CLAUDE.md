# OPE — Opportunity Pricing Engine (ZAN Agency)

## Stack
### Backend
- **Framework**: FastAPI (Python)
- **Database**: MongoDB (motor async)
- **Port**: 8001
- **Entry**: `backend/server.py` (monolith)

### Frontend
- **Framework**: React 19 + CRA + CRACO (NOT Vite)
- **Port**: 3005 (PORT=3005 required — 3000/3001 often occupied)
- **UI**: Radix UI + Tailwind CSS + Lucide + Recharts 3.6 + Framer Motion
- **Fonts**: ZAN custom fonts in `frontend/public/fonts/`
- **Brand**: Plum `#33092E`, Gold `#A68A40`

## Run Commands
```powershell
# Backend (port 8001)
cd "D:\Claude Applications\Calculator and Dashboard\backend"
python -m uvicorn server:app --reload --port 8001

# Frontend (port 3005) — MUST set PORT explicitly
cd "D:\Claude Applications\Calculator and Dashboard\frontend"
set PORT=3005 && set CI=true && npm start
```

## Critical webpack fix (craco.config.js)
- `docx` 9.7.1 imports `node:fs`/`node:https` — shimmed via `NormalModuleReplacementPlugin`
- Shim file: `frontend/src/utils/node-shim.js` (empty `module.exports = {}`)
- **Restart server** after any craco.config.js change — not hot-reloaded

## Key Files
| File | Purpose |
|------|---------|
| `frontend/src/pages/Calculator.jsx` | Main app (~1420 lines), all state |
| `frontend/src/components/ExportCenter.jsx` | Export Center: PDF/PPTX/DOCX |
| `frontend/src/lib/documents/quotationTemplate.js` | Quotation HTML (~39KB) |
| `frontend/src/lib/documents/docxGenerator.js` | DOCX via `docx` 9.7.1 |
| `frontend/src/lib/documents/pptxGenerator.js` | PPTX via PptxGenJS |
| `frontend/src/lib/documents/zanLogoAsset.js` | ZAN gold logo base64 |
| `frontend/src/lib/zanFonts.js` | Font face CSS + ZAN_COLORS |
| `backend/server.py` | FastAPI monolith, all routes |

## Security Rules (NEVER violate)
- hourly_rate / monthly_salary → NEVER shown on any client-facing page
- Financial proposal → team cost shown as "Professional Services ✓" (boolean only)
- Technical proposal → roles only, zero cost data

## COGS Tab Fix — 2026-06-10
**Bug:** COGS breakdown showed Internal labor / Vendor / Overhead = SAR 0.00 even with
real team + vendors, because per-product (granular) costs only lived in
`margin_breakdown.products[]` — the top-level `internal_labor_cost`/`vendor_cost`/
`overhead_cost` track ONLY global team (empty in product-owned mode).

**Fix (backend `server.py` ~line 2115):** added aggregated fields summing global +
all product-scoped lines:
- `total_labor_cost`, `total_vendor_cost`, `total_overhead_cost`
- Handles 2 line shapes: product_owned (explicit team_cost/vendor_cost/overhead_cost)
  AND legacy/catalog (bundled `cost` → attributed to labor as internal production).
- Verified: breakdown sum reconciles exactly to `cogs` (golden API test passed).

**Fix (frontend `ExecutiveQuoteRail.jsx`):** new `CogsDashboard` component reads
`total_labor_cost ?? internal_labor_cost`. Per-service breakdown handles legacy lines
(`team_cost != null ? team_cost : cost - vendor - overhead`). Added: cost composition
bar, per-cost mini-bars, expandable per-service breakdown, net profit card.

**IMPORTANT — backend `--reload` is flaky on Windows StatReload.** After editing
server.py, kill PID on 8001 (incl. multiprocessing child) and restart manually:
`python -m uvicorn server:app --port 8001` (without --reload for stability).

## Phase 18 — Soft Floor + Risk/Margin Reactivity + Team/Vendor UX — 2026-06-11
**Root cause (risk + margin not moving price):** backend clamped `line_sell = max(selling, floor)`
where floor = `sheet_min_selling` (= base_minimum_selling_price "O"). Below-floor prices were pinned.
**Fix — soft floor (server.py `calculate_simple` ~1726–1815):**
- `_raw_selling_from_margin` (no clamp) + `_is_actively_priced(line)` = margin_source=='custom' OR
  non-default risk. Pristine lines clamp to O (no flag); actively-priced use raw price + `needs_approval`
  when below O. New breakdown fields: `below_floor`, `needs_approval`. Model gained `margin_source`.
- Frontend mirror: `marginEngine.js` `buildProductLineFromSelection` + `isLineActivelyPriced`; payload
  builders now send `margin_source`. `computeRiskSellingImpact` no longer floor-clamps.
- Verified via 6 golden API scenarios (pristine clamps; custom-below drops + flags; risk-touch lifts clamp).
**UI:** RiskTabPanel = financial panel (base→+premium→adjusted + per-factor ×mult). MarginTabPanel =
"Needs approval" pill when below min. TeamMemberRow monthly mode drops Monthly Cost field (util%/months/total
only). ServicePricingDetail removed "Min. selling (L)", relabeled "Total cost (J)"→"Cost · Team + OH",
"Base min. selling (floor)". ProductCardSummary shows FULL team SAR + "·N roles". StepReview new "Margin
approvals" section (only `needs_approval` || below-min-margin; pristine clamped lines are NOT flagged).
ResourcesWorkspace: delete vendor preset from Add-Vendor catalog list (`onDeleteVendorService`); empty
service sections collapse to compact one-line rows.
**Note:** preview screenshot tool was timing out in this env — verified via DOM/eval + backend API tests.

## Phase 19 — Additive risk model + vendor input clarity + catalog-delete fix — 2026-06-11
**Risk is now PURELY ADDITIVE (replaces Phase 18 soft-floor-on-risk).** Per the user: the app's
risk factors (per-service complexity/rush/execution AND the global Quote-Controls risk) only ever
*raise* the price — they're independent of the sheet floor (the sheet's own risk is baked into the
team-cost/floor "O"). Only a DELIBERATE custom margin may price below the floor (→ needs_approval).
- **server.py granular loop (~1744–1850):** per line `internal_sell_no_risk = _raw_selling_from_margin(internal_cost, margin)`;
  `base = base_no_risk if margin_source=='custom' else max(base_no_risk, floor)`; `service_premium =
  internal_sell_no_risk*(risk_mult-1)`; `line_sell = base + service_premium`. `needs_approval` ONLY when
  custom margin below floor. Removed dead `_is_actively_priced`/`_risk_is_nondefault`. Accumulate
  `product_internal_base`.
- **Global Quote-Controls risk (~1947):** `global_product_premium = product_internal_base*(internal_risk_mult-1)`
  added to `total_selling_price`; surfaced in `margin_breakdown` as `global_risk_premium`/`global_risk_multiplier`/`products_internal_base`.
- **Warnings block (~2150):** below-floor warning gated on custom margin (not risk).
- **Frontend mirrors:** `marginEngine.buildProductLineFromSelection` (floor from custom margin only; `isLineActivelyPriced`→`isLineCustomPriced`);
  `productWorkspaceUtils.computeRiskSellingImpact` = `internalSellNoRisk*(mult-1)` (internal only);
  `Calculator.handleMarginPreview` additive (internal split + service premium + global delta). RiskTabPanel auto-aligns (`base = adjusted - impact`).
- **Verified golden (4/4):** pristine clamps to floor; +service risk raises selling, stays ≥ floor, no approval;
  +global risk raises TOTAL further; custom-margin-below drops + flags. Vendor cost flows into selling/COGS/total_vendor.
**Catalog delete fix:** `Calculator.handleDeleteVendorService` was missing `setAdminPassword(ADMIN_PASSWORD)`
→ backend `verify_admin` 403. Added it (mirrors save/delete-template). Verified: no-auth→401, admin→200.
**Vendor row UX (ResourcesWorkspace renderSimpleVendor + group sub-items):** reordered to
Provider|Qty|**Cost (SAR)**|**Unit (label)**|Markup %|Risk %|🗑 (cost was being typed into the free-text
"Unit" field). Markup % label now shows live `· +SAR {amount}`.
**Floor toast de-noised (Calculator ~585):** only toasts on a needs_approval line, once per entry
(belowFloorToastRef), reworded to approval language; header badge + Review approvals stay.

## Phase 20–21 — Add-ons feature: priced add-on lines (`is_addon`/`parent_id`), own DealStepper step
(`addons`, between Resources & Review), linked (family-filtered) + standalone (unlinked) support, exports
group add-ons under parent + a "Standalone Add-ons" section (quotation + financial templates). Zero backend
changes — add-ons are `selectedProducts[]` lines priced by the granular loop. `handleAddAddon` (Calculator)
inserts linked add-ons after parent+siblings, appends standalone. Cascade delete in StepProducts:112
(`p.parent_id !== id`). `isAddonProduct`/`listAddonsForFamily`/`getProductFamily` in opportunityScope.

## Phase 22 — Add-ons Workspace UX/UI redesign (match Resources) — 2026-06-11
**Problem:** `AddonsWorkspace.renderAddonCard` wrapped each `ProductWorkspaceCard` in a redundant extra
pricing-strip + 2nd border (nested cards-in-cards); every parent rendered a verbose full group even when
empty; heavy HR divider labels. Didn't match the flat Resources layout.
**Fix (render-only rewrite of `AddonsWorkspace.jsx`; no state/logic/props/backend change):**
- `renderAddonCard` → renders `ProductWorkspaceCard` directly (like StepProducts:211), no wrapper. Its own
  `ProductCardSummary` already shows selling·margin·health·team.
- `renderServiceGroup` → full bordered card+header when add-ons attached; compact one-liner (`renderEmptyGroup`,
  mirrors Resources `renderEmptySection`) when empty; shared `addAddonButton` disabled+tooltip when family
  has no catalog add-ons.
- Standalone section mirrors the pass-through section; **orphan add-ons** (parent missing) folded into it via
  `standaloneAddons = unlinked + orphans`, catalog = `allAddonsCatalog` (all `isAddonProduct`).
- Heavy HR dividers → subtle "BY SERVICE"/"STANDALONE" small-caps labels; KPI sub uses `linkedToParentCount`.
**Verified live (port 3001, DOM/eval — screenshots time out in this env):** compiles clean (AddonsWorkspace
zero ESLint warnings); flat layout; 1 bordered ancestor per add-on card (no nesting); compact empty rows;
Branding "Add add-on" enabled vs Communication disabled (no add-ons in family); linked dialog 5 Branding-only,
standalone dialog all 7 cross-family; standalone add → KPI "1 linked · 1 standalone"; full Team/Risk/Margin/
Insights editing inline; cascade delete (remove parent → linked add-on gone, standalone survives, no orphan).

## Phase 17 — Sheet Refresh button: StepProducts toolbar + clickable DataSourcesStatus (force_refresh).
## Header — logo = /icons/Icon.png, wordmark = "ZAN Agency" (Calculator.jsx).

## Session Checkpoint — 2026-06-11 (Latest)
**Phases 17–22 — ALL COMPLETED:**
- ✅ Phase 17: Sheet Refresh button in StepProducts + clickable DataSourcesStatus
- ✅ Phase 18: Soft floor + risk/margin reactivity + team/vendor UX improvements
- ✅ Phase 19: Additive risk model + vendor input clarity + catalog-delete fix
- ✅ Phase 20: Add-ons feature — `is_addon`/`parent_id` model, family-filtered picker, cascade delete
- ✅ Phase 21: Add-ons dedicated step (DealStepper), unlinked/standalone support, export sections in quotation + financial templates
- ✅ Phase 22: Add-ons Workspace UX/UI redesign — flat layout matching Resources, no nested cards, compact empty rows, orphan handling

**Current state:**
- Frontend: port 3005 (`set PORT=3005 && set CI=true && npm start`)
- Backend: port 8001 (`python -m uvicorn server:app --port 8001`)
- All features verified live via DOM/eval (screenshots time out in this env)
- Production build has pre-existing docx 9.7.1 ES module incompatibility — dev server works fine

**Next session:** Start by reading this CLAUDE.md — all context is here.
