# Workspace Hierarchy QA

**Date:** 2026-06-03  
**Plan:** Products Command Center / Edit vs Analyze split

---

## Prerequisites

- Frontend dev server running (`npm run dev` in `frontend/`)
- Quote with **6+ configured products** (named, calculated) for density checks
- Viewport **1440×900** for desktop density; **390×844** for mobile scan check

---

## Normal-path workflow (no Team/Risk tabs)

| Step | Action | Pass |
|------|--------|------|
| 1 | Stay on **Products** tab; add catalog + standalone services | |
| 2 | Scan collapsed rows — answer six questions per row without expand | |
| 3 | Open **Team** via icon on a row; add/edit role; close panel | |
| 4 | Open **Vendors** icon; add vendor line | |
| 5 | Open **Risk** icon; change product risk | |
| 6 | Open **Margin** icon; adjust margin; economics bar visible | |
| 7 | **Continue to Economics** without opening workspace Team/Risk | |
| 8 | Expand **Quote risk factors** on Economics; change internal risk | |

---

## Six-question scan checklist (collapsed row)

Per product row, without expanding:

| Question | Visible field |
|----------|----------------|
| What is this product? | Name + tier·qty |
| Selling price? | SAR compact selling |
| Margin healthy? | % + color / arrow vs min |
| Health good? | Label·score |
| Team cost? | Team SAR + role count |
| Vendor dependency? | `No vendors` or `N vendors` |

---

## Collapsed metric allowlist audit

Inspect DOM on collapsed row (`data-testid="product-portfolio-scan-metrics"`):

- [ ] No `ProductEconomicsBar` sections (cost breakdown, risk multiplier block)
- [ ] No progress bars or insight chips in collapsed state

---

## Density (1440×900)

- [ ] `ProductsCommandStrip` single line (≤40px)
- [ ] **≥6** collapsed portfolio rows visible in list area without scrolling
- [ ] Stretch: **8** rows visible

Screenshot: `docs/qa/screenshots/workspace-hierarchy/portfolio-6-rows-1440.png`

---

## Analysis tabs (optional path)

### Team analysis

- [ ] Banner: editing happens in Products tab
- [ ] `data-testid="quote-team-dashboard"` — hero stats, top contributors, product contribution
- [ ] “Jump to product” scrolls to `#product-{id}`
- [ ] No per-product rollup cards duplicating portfolio rows

### Risk analysis

- [ ] Banner: product risk edited in Products tab
- [ ] `data-testid="quote-risk-dashboard"` — score, distribution, highest risk, contribution
- [ ] No internal risk Select controls on this tab

---

## Regression

```bash
cd frontend && npm run build
```

Preserve test IDs:

- `scope-workspace`, `products-command-strip`, `product-workspace-card`
- `product-tab-*`, `product-card-summary`, `product-portfolio-scan-metrics`
- `team-rollup-embedded`, `quote-team-dashboard`, `quote-risk-dashboard`
- `expand-team-btn` (inside Team tab panel when expanded)

---

## Screenshots folder

Capture after manual verification:

| File | Content |
|------|---------|
| `portfolio-6-rows-1440.png` | 6+ collapsed rows @ 1440×900 |
| `portfolio-row-metrics.png` | Single row scan metrics close-up |
| `quote-team-dashboard.png` | Team analysis tab |
| `quote-risk-dashboard.png` | Risk analysis tab |
| `economics-quote-risk-factors.png` | Economics collapsible internal risk |

Path: `docs/qa/screenshots/workspace-hierarchy/`
