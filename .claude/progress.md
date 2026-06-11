# Calculator and Dashboard — Progress

## Stack (from CLAUDE.md)
- **Backend**: FastAPI + MongoDB (motor) + AI (OpenAI/Gemini/LiteLLM) — port 8001
- **Frontend**: React 19 (CRA + CRACO) + Radix UI + Tailwind + Lucide — port 3005
- **Notable**: vendor pricing engine, multi-product portfolio, SAR currency, ZAN branding

## Status: Active — Phase 14 complete (2026-06-09)
Last checkpoint: 2026-06-09 (end of Phase 14)

## Done ✅
- **Phase 0–7**: Foundations, env setup, seed data, Executive Rail redesign, pricing-math audit & fixes, Calculator polish, portfolio card collapse model, vendor row enhancement (Qty/Unit/Unit-cost/computed strip), margin slider real-time preview
- **Phase 8**: Vendor double-margin fix + Margin tab populated from API + Quote Controls deal snapshot + per-product margin list
- **Phase 9**: Full Vendor UX overhaul — grouped-by-service layout, Add Vendor dialog with service picker, group/bundle vendors with collapsible sub-items, bulk markup setter, MongoDB-backed Vendor Group Templates (CRUD)

## Phase 9 Detail (2026-06-08)
- **backend/server.py**: `VendorSubItem` model; `is_group` + `sub_items` on `VendorInput`; `compute_vendor_cost` aggregates sub_items; `VendorGroupTemplate` CRUD at `/api/vendor-group-templates`
- **frontend/src/lib/vendorRegistry.js**: `createGroupVendor`, `createSubItem`, `vendorTotals` helpers
- **frontend/src/lib/api.js**: `getVendorGroupTemplates`, `saveVendorGroupTemplate`, `updateVendorGroupTemplate`, `deleteVendorGroupTemplate`
- **frontend/src/components/calculator/ResourcesWorkspace.jsx**: Full redesign — service-grouped layout, Add Vendor dialog, group vendor rows + sub-items, bulk markup, Templates panel
- **frontend/src/pages/Calculator.jsx**: On-mount template load; wired `handleSaveVendorTemplate` + `handleDeleteVendorTemplate`; `buildTemplatePayload` preserves `is_group` + `sub_items`

## Phase 8 Detail (2026-06-08)
- **backend/server.py** (~1683-1710): Vendor revenue separated from internal margin; `vendor_revenue` added to `margin_breakdown.products`
- **QuoteMarginView.jsx**: Prefers `results.margin_breakdown.products`; shows "Internal SAR X · Vendor +SAR X"
- **QuoteControlsDrawer.jsx**: 3-cell deal snapshot (Selling/Margin%/Deal) + per-product margin list

## Security Constraints (NEVER VIOLATE) 🔒
- Hourly rate and monthly cost are CONFIDENTIAL — must NEVER appear on any user-facing screen
- Enforced in: ScopeEditor, TeamMemberRow, DepartmentRolePicker, ExportPDF, ProfitabilityPanel

## Phase 10 Detail (2026-06-08)
- **frontend/src/lib/productWorkspaceUtils.js**: Added `groupMembersByDept()` + `shortDeptLabel()` helpers
- **frontend/src/lib/quoteTeamAnalytics.js**: Added `departmentBreakdown` aggregation (cost/hours/roleCount per dept) to return object
- **frontend/src/components/calculator/TeamTabPanel.jsx**: Replaced flat member list → dept-grouped collapsible sections; `expandedDepts` state (default all expanded); dept count shown in summary strip when > 1 dept
- **frontend/src/components/calculator/QuoteTeamDashboard.jsx**: Added "Department Breakdown" section with progress bars (hidden when single dept)

## Phase 11 Detail (2026-06-09) ✅
- **ZAN Fonts**: extracted `29LTZaridSansAL-{Regular,SemiBold,Black,ExtraLight}.otf` → `frontend/public/fonts/`; ZAN icons → `frontend/public/icons/`
- **`frontend/src/lib/zanFonts.js`**: `ZAN_FONT_FACE_CSS`, `ZAN_DOC_BASE_CSS`, `ZAN_COLORS` — base CSS for all exported documents
- **`backend/server.py`**: `ThemeSettings` + `ThemeSettingsUpdate` extended with 14 new fields: company identity (name_ar, address, phone, email, vat, cr), bank details (name, iban, account), doc settings (validity_days, default_language), templates (terms_en/ar, contract_body_en/ar)
- **`frontend/src/pages/Admin.jsx`**: Added "Documents & Export" nav item + route + `DocumentsManager` component (Company Identity, Bank Details, Document Settings, Document Templates sections)
- **`frontend/src/lib/documents/quotationTemplate.js`**: `buildQuotationHTML()` — dark cover page, scope of work, investment summary (with VAT), payment schedule, T&C, signature block; AR/EN/RTL fully bilingual
- **`frontend/src/lib/documents/financialProposalTemplate.js`**: `buildFinancialHTML()` — cost breakdown by service (Professional Services ✓, Production SAR), payment schedule, T&C; security: team cost hidden, only ✓ shown
- **`frontend/src/lib/documents/technicalProposalTemplate.js`**: `buildTechnicalHTML()` — understanding the brief, our approach (4-step grid), team structure (roles only, NO cost), proposed timeline table with bar chart; security: zero cost data
- **`frontend/src/lib/documents/contractTemplate.js`**: `buildContractHTML()` — parties, scope, fees + payment, contract body (with `[CLIENT_NAME]` etc. placeholders), T&C, signatures; admin-controlled body via `contract_body_en/ar`
- **`pptxgenjs`**: installed with `--legacy-peer-deps`; `craco.config.js` patched with `NormalModuleReplacementPlugin` to strip `node:` prefix + `resolve.fallback` for Node built-ins
- **`frontend/src/lib/documents/pptxGenerator.js`**: `buildQuotationPPTX`, `buildFinancialPPTX`, `buildTechnicalPPTX` — 16:9 WIDE slides, dark cover with gold accents, ZAN font, service tables, summary/payment slides
- **`frontend/src/components/ExportCenter.jsx`**: 4-card grid (Quotation · Financial · Technical · Contract); per-card AR/EN toggle, PDF/PPTX format toggle, Preview button (iframe Dialog), Export button; uses gradient accent per doc type
- **`frontend/src/components/calculator/StepReview.jsx`**: `exportPdfSlot` rendered in its own bordered section (no longer crammed in flex row)
- **`frontend/src/pages/Calculator.jsx`**: `ExportCenter` imported; `StepReview` now receives `<ExportCenter .../>` as its `exportPdfSlot` (with projectInfo, selectedProducts, results, themeSettings, paymentTerms)
- **Build**: ✅ `npx craco build` passes with 0 errors after webpack node: polyfill fix

## Security Constraints (NEVER VIOLATE) 🔒
- Hourly rate and monthly cost are CONFIDENTIAL — must NEVER appear on any user-facing screen
- Enforced in: ScopeEditor, TeamMemberRow, DepartmentRolePicker, ExportPDF, ProfitabilityPanel
- **Phase 11**: financial proposal shows team cost as "Professional Services ✓" (boolean, no SAR); technical proposal shows roles only — zero cost data

## Phase 12 Detail (2026-06-09) ✅
- **`frontend/src/components/calculator/AddServiceDialog.jsx`**: Removed Blueprint tab (PATHS + panel + Layers import); added `selectedTiers` state; catalog rows restructured → service info + tier pills (TINY/STANDARD/BIG/MEGA, shown only when >1 tier) + Add icon button; `handlePick(product)` now passes tier to `onSelectCatalog(name, tier)`
- **`frontend/src/components/calculator/StepProducts.jsx`**: `addFromCatalog(serviceName, selectedTier)` — uses dialog-selected tier directly; falls back to `resolveTierForProduct` only when tier not provided
- **`frontend/src/components/ServicePricingDetail.jsx`**: Added `detectRTL()`, `parseRichText()`, `parseBlock()`, `RichBlock`, `RichTextBlock` utilities; `SheetTextDialog` now renders `<RichTextBlock>` instead of plain `<p>` — auto RTL/LTR, phase cards (C1/C2/C3, المرحلة الأولى…), bullet/numbered/paragraph smart formatting
- **Build**: ✅ `npx craco build` passes, 0 new errors

## Phase 13 Detail (2026-06-09) ✅
- **backend/server.py**: Added `risk_percent: float = 0` to `VendorSubItem` + `VendorInput`; updated `compute_vendor_cost` to apply per-vendor risk buffer (markedUp × (1 + risk_percent/100)) for both simple and group sub-items
- **frontend/src/lib/vendorRegistry.js**: Added `risk_percent: 0` to `presetToLineVendor`, `createGroupVendor`, `createSubItem` factories; updated `vendorTotals` / group sub-item totals to factor in `risk_percent`
- **frontend/src/components/calculator/ResourcesWorkspace.jsx**: Added Risk % input (w-[68px], amber border when active) to simple vendor rows; updated pricing chain strip to show "Risk +X" segment when risk_percent > 0; added Risk % to group vendor sub-items; fixed siClient calculation to include risk_percent
- **frontend/src/components/calculator/QuoteRiskDashboard.jsx**: Added Recharts BarChart (risk multiplier per service, color-coded green/amber/red) + PieChart donut (contribution) + per-product mini progress bars + color legend. Charts use `results.margin_breakdown.products` data with analytics fallback
- **frontend/src/components/calculator/QuoteControlsDrawer.jsx**: Added `useState` for force-margin controls; added cost structure stacked bar (team/vendor/margin); added Force Fixed Margin controls (scope selector: All/Team/Vendors + value input + Apply); enhanced per-product list to show progress bars with color coding; added per-product risk mini-bars in risk section; added TrendingUp/Zap icons
- **Build**: ✅ `npx craco build` passes, 0 errors (only pre-existing ESLint warnings)

## Phase 14 Detail (2026-06-09) ✅
- **QuoteRiskDashboard.jsx**: Full rewrite — removed all Recharts charts (Phase 13); added `calcData` prop; Team-tab-style expand/collapse per service (Set-based with `'__all__'` sentinel); "Risk factor comparison" side-by-side section (Internal indigo vs Vendor amber) showing complexity/rush/execution levels + combined multiplier; per-service expandable rows sorted by risk_multiplier descending; team/vendor cost bars with % breakdown + risk premium row; distribution badges preserved
- **QuoteMarginView.jsx**: Added expandable per-service rows with internal vs vendor breakdown; summary header showing quote margin, vs-target delta, above-target count, below-min count; internal team section (Cost → Sell → Margin%) + Vendor section (Cost → Revenue → Markup%) inside each expanded row; blended margin summary row; uses margin progress bar inline in header
- **QuoteControlsDrawer.jsx**: Width → `sm:max-w-xl`; cost structure simple bar → Recharts PieChart donut (Team/Vendors/Margin with SAR + % legend); new Recharts BarChart in margin section showing per-service margin vs target dashed reference line (color-coded green/amber/red); new Recharts RadarChart in risk section overlaying Internal (indigo) vs Vendor (amber) risk profiles on 3 axes (complexity/rush/execution) — shown only when any risk factor is non-none
- **ExecutiveQuoteRail.jsx**: Added `calcData={calcData}` to `<QuoteRiskDashboard>` render
- **Build**: ✅ `npx craco build` passes, 0 errors

## Next Up 📋
- User to fill Admin → Documents & Export (company info, bank details, T&C text, contract body)
- User to provide contract template design → can update contractTemplate.js
- Optional: wire ExportCenter into InsightRail as compact version

## Blocked ⛔
- (لا يوجد)

---
