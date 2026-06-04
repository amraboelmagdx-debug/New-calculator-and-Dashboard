# Stakeholder approval — Pricing Command Center IA

Use this checklist before expanding beyond Phase 1–3. Record decisions in your PM tool or meeting notes; this file tracks the **recommended default** from the architecture review.

## Model approval

| Decision | Recommended | Approved (Y/N) | Notes |
|----------|-------------|----------------|-------|
| Scope center = **Portfolio only** (no Team/Risk workspace tabs) | Yes | Y | Team/Risk live on Executive Rail |
| Right column = **Executive Quote Rail** (always on desktop) | Yes | Y | Replaces step-based `liveQuote` / `full` split |
| Economics center step **demoted**; deal knobs in **Quote Controls drawer** | Yes | Y | Full margin center remains on Economics until Phase 5 |
| Per-product tabs remain **source of truth** for line edits | Yes | Y | No pricing formula changes |
| Quote-level vendors labeled **legacy / deal pass-through** until Phase 4 | Yes | Pending | See quote-controls-spec |

## Out of scope (explicit)

- [ ] Pricing engine / backend payload changes  
- [ ] New CRM integrations  
- [ ] MarginControlCenter product list removal (Phase 5)  

## Sign-off

| Role | Name | Date |
|------|------|------|
| Product | | |
| Engineering | | |
| Sales / RevOps | | |

**Implementation status (repo):** Phase 1–2 code (Executive Rail + portfolio-only Scope) and Phase 3 drawer scaffold shipped per `migration-phase-1.md`.
