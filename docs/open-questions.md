# Open Questions

## Sheet / domain

1. Confirm every service row has a correct **Execution Mode** label (All-in / Resource / Hybrid) — heuristic fallback is used when empty.
2. For **Resource** rows: are `direct_cost_per_unit` and `oh_cost_value` always populated? Fallback to `total_cost` hides data gaps.
3. Does `total_cost` on **Hybrid** rows always represent the full included package (no separate labor add-on at baseline hours)?

## Product behavior

4. **Unified/Split with products selected:** products are visible in UI but not in API total until Per-line — intentional for MVP; train BDs or auto-prompt?
5. Should **all-in** products ever show optional team for display without any labor charge? (V1: no auto-sync.)

## Hybrid edge cases

6. **Utilization / seconded** members synced from hybrid products: V1 charges full utilization path + API warning — is delta required for these modes in V2?
7. Multiple hybrid products sharing the same role: baselines are **summed** — confirm with operations.

## Commercial / governance

8. **Approval hierarchy** for discount, low margin, vendor override — not in app; CRM sheet has `approval_status` only on sales opportunities.
9. **Incentives** on revenue vs gross profit — currently revenue; finance sign-off if changed.
10. **Min selling** by client tier / market — only segment + deal-size guidelines today.

## Future layers

11. VAT / tax inclusive vs exclusive pricing.
12. Multi-currency (FX, display, sheet columns).
13. Product vision: quotation tool vs full deal OS — current build is quotation + pricing command center + CRM read dashboard.
