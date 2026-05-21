"""Light tests for pricing_rules hybrid clamp (run: python test_pricing_rules.py)."""

from pricing_rules import get_chargeable_hours, resolve_product_line_cost, EXECUTION_HYBRID


def test_hybrid_chargeable_clamp():
    assert get_chargeable_hours(50, 40, "hours", EXECUTION_HYBRID) == 10
    assert get_chargeable_hours(30, 40, "hours", EXECUTION_HYBRID) == 0
    assert get_chargeable_hours(40, 40, "hours", EXECUTION_HYBRID) == 0


def test_hybrid_package_cost_independent_of_hours():
    seg = {
        "execution_mode": "Hybrid",
        "total_cost": 5000,
        "direct_cost_per_unit": 1000,
        "oh_cost_value": 200,
    }
    cost, mode, _, _ = resolve_product_line_cost(seg, 1)
    assert mode == EXECUTION_HYBRID
    assert cost == 5000


if __name__ == "__main__":
    test_hybrid_chargeable_clamp()
    test_hybrid_package_cost_independent_of_hours()
    print("ok")
