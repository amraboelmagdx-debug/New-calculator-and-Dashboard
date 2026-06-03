# Product Workspace UX Review

**Date:** 2026-06-03  
**Scope:** Documentation only — no implementation in this phase  
**Surfaces reviewed:** Scope workspace tabs vs product-level control tabs in the Product Control Center

---

## Two tab layers

### Workspace level — [`ScopeWorkspace.jsx`](../frontend/src/components/calculator/ScopeWorkspace.jsx)

| Tab | Purpose |
|-----|---------|
| Products | Add and configure products in the quote scope |
| Team | Cross-product team view with optional product filter |
| Risk | Quote-level risk factors |

### Product level — [`ProductControlTabs.jsx`](../frontend/src/components/calculator/ProductControlTabs.jsx)

| Tab | Purpose |
|-----|---------|
| Team | Per-product team summary and role editing |
| Vendors | Per-product vendor lines |
| Risk | Per-product risk multipliers |
| Margin | Per-product margin vs sheet minimum |
| Insights | Sheet pricing detail for the selected tier |

---

## Overlap matrix

| Concern | Workspace tab | Product tab | Overlap |
|---------|---------------|-------------|---------|
| Team roles | Global list, filter by product | Per-product team, expand to edit | **High** — same roles, two entry points |
| Risk | Quote-level risk panel | Per-product risk multipliers | **Medium** — different granularity, similar vocabulary |
| Products | Product cards live here | N/A | None |
| Margin / economics | Quote health strip | Product economics bar + Margin tab | **Medium** — product vs quote margin labels now differentiated |
| Vendors | Not at workspace level | Per-product vendors | Low |

---

## What feels redundant today

1. **Team duplication** — Users can open Team at the workspace level and again inside each product card. Both surfaces show role counts, hours, and cost context. The workspace Team tab is useful for cross-product review; the product Team tab is where editing happens. Without clear labeling, users may not know which to use.

2. **Risk duplication** — Quote-level Risk in the workspace vs product-level Risk tabs use similar factor names (complexity, rush, execution). Quote risk applies globally; product risk applies to individual line pricing. The relationship is not surfaced in UI copy.

3. **Economics at two scales** — Quote health strip (selling price, quote margin) and product economics bar (selling price, product margin) both show margin percentages. After the polish pass, labels read **Quote margin** vs **Product Margin**, which reduces confusion but both remain visible simultaneously.

---

## Recommended future directions

### Option A — Workspace as navigator, product as editor

Keep workspace tabs for **overview and navigation** only (product list, aggregated team summary, quote risk). Move all editing (team rows, vendors, margin sliders) exclusively into product control tabs. Workspace Team becomes read-only with “Edit in product” links.

**Pros:** Single edit surface, less duplication.  
**Cons:** More clicks to reach edit mode from workspace Team.

### Option B — Deep-link workspace tabs into product tabs

When user selects a product filter on workspace Team, auto-expand that product’s Team tab in the Products panel and scroll it into view. Workspace Team becomes a filtered lens, not a separate editor.

**Pros:** Preserves both views; connects them explicitly.  
**Cons:** Requires scroll/focus orchestration and state sync.

### Option C — Collapse workspace Team/Risk into product-only

Remove Team and Risk from workspace tabs; keep Products + a quote-level Risk summary only. All team and per-product risk work happens in product cards.

**Pros:** Simplest mental model.  
**Cons:** Loses cross-product team table for multi-product quotes.

---

## Explicit scope note

**No workspace structural refactor is planned in the Product Control Center polish pass.** This document captures overlap and options for a future phase. Current polish improvements (name-first hierarchy, sticky product context, margin label clarity, mobile economics) apply only to product-level surfaces.
