# Quote Controls — field spec

## Purpose

Deal-level inputs that affect **whole-quote** calculation, separate from per-product line editors. Surfaced in a **drawer** from the Executive Rail; Economics step remains for bulk margin + quote vendors until later phases.

## Fields (Phase 3 drawer)

| Field | `calcData` / `projectInfo` path | Editable in drawer | Notes |
|-------|--------------------------------|--------------------|-------|
| Quote risk factors | `calcData.internal_risk` | Yes | `ScopeRiskPanel` compact |
| Vendor risk factors | `calcData.vendor_risk` | Yes | Shown when quote has vendors |
| Payment terms | `projectInfo.payment_term_id` | Yes | Affects financing cost |
| Quote-level vendors | `calcData.vendors[]` | **No** (Phase 4) | Link: “Open quote settings” → Economics |
| Margin mode / target | `calcData.margin_*` | **No** (Phase 5) | MarginControlCenter stays on Economics |
| Per-product team/vendors/risk | `selectedProducts[].*` | **Never** | Edit in portfolio card tabs only |

## Deprecation: quote-level vs product vendors

| Model | When used | UI label (interim) |
|-------|-----------|-------------------|
| **Product vendors** | Primary when `selectedProducts.length > 0` | “Service vendors” on product card |
| **Quote vendors** | Legacy / deal pass-through | “Deal vendors (quote-level)” on Economics |

**Payload behavior (unchanged):** When products exist, builder clears legacy `calcData.team_members` / `calcData.vendors` in favor of per-product lines—Economics vendor UI may still edit quote array but calc may ignore it.

**Phase 4 decision (pick one):**

- **A)** Remove quote vendor UI; only product vendors  
- **B)** Keep quote vendors as “Deal pass-through costs” with explicit badge and docs  
- **C)** Merge UI: show quote vendors only when zero products  

## Drawer actions

| Action | Behavior |
|--------|----------|
| Save implicit | All controls bind live to parent state (auto-recalc) |
| Open quote settings | `onOpenQuoteSettings()` → `goToDealStep('economics')` |
| Close | Sheet dismiss |

## Out of drawer (by design)

- Product margin sliders  
- Product team rows  
- Catalog / add service  
- PDF export (stays rail footer)  

## Acceptance criteria

1. User can set internal risk + payment terms **without** leaving Portfolio.  
2. Drawer copy states product-level edits happen in portfolio rows.  
3. No new API or pricing formula changes.  
