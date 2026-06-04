# Workspace Hierarchy — Products Command Center

**Date:** 2026-06-03  
**Status:** Implemented

---

## Problem

The Scope workspace exposed two competing layers for the same concerns:

- **Workspace tabs** (Products, Team, Risk) and **product control tabs** (Team, Vendors, Risk, Margin, Insights) both surfaced team and risk context.
- Users could edit in product cards while workspace Team/Risk implied another entry point.
- Full product cards with economics bars made portfolio scanning slow on multi-product quotes.

---

## Target information architecture

| Surface | Role | When to use |
|---------|------|-------------|
| **Products tab** | Primary command center — add products, bulk-scan portfolio rows, edit team/vendors/risk/margin per product | Every quote build |
| **Team tab** | Quote-level labor analysis (read-only) | Optional review, optimization, executive read |
| **Risk tab** | Quote-level exposure analysis (read-only) | Optional review, optimization, executive read |

Quote-level **internal risk factors** (complexity, rush, execution) live on **Economics**, not the workspace Risk tab.

---

## Normal path vs analysis path

**Normal path (no Team/Risk tabs required):**

1. Add services on Products tab  
2. Scan collapsed portfolio rows (six metrics per row)  
3. Open product tabs (icon strip) to adjust team, vendors, risk, margin  
4. Continue to Economics  

**Analysis path (optional):**

- Open **Team analysis** for cross-product labor concentration and role ranking  
- Open **Risk analysis** for quote risk score, distribution, and highest-risk products  
- Use “Jump to product” links to scroll to `#product-{id}` on Products tab  

---

## Portfolio rows

Collapsed products are **portfolio rows** (~72–88px), not miniature dashboards:

- Allowlist: identity, selling, margin health, health score, team cost, vendor signal  
- Denylist in collapsed state: cost breakdown, risk multiplier detail, economics bar, insight copy  

**Density target:** ≥6 collapsed rows visible at 1440×900 without scrolling the product list.

---

## What stayed the same

- Pricing formulas, APIs, and data models unchanged  
- Product tab editors (TeamTabPanel, VendorTabPanel, RiskTabPanel, MarginTabPanel) behavior unchanged  
- `data-testid` hooks preserved for automation  

---

## Related docs

- [`product-workspace-ux-review.md`](product-workspace-ux-review.md) — original overlap analysis  
- [`workspace-hierarchy-qa.md`](workspace-hierarchy-qa.md) — verification checklist  
