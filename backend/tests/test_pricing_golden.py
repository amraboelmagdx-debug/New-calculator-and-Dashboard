"""
Golden-value regression tests for the pricing engine (Phase 2 audit fixes).

Pins the behaviors that were corrected:
  1. Deal-size thresholds are aligned with pricing_guidelines
     (tiny <50K, standard 50-200K, big 200-500K, mega 500K+).
  2. A non-positive pricing divisor surfaces an explicit error warning
     instead of silently using a fallback multiplier.
  3. Margin warnings are judged against the guideline for the detected
     deal size, not whichever "general" doc happens to be first.
  4. Contribution margin = selling_price - cogs - total_incentive.

These are integration tests: they require a running, seeded backend.
Set REACT_APP_BACKEND_URL (defaults to http://localhost:8001).
The whole module skips if the backend is unreachable.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001').rstrip('/')


def _backend_available():
    try:
        return requests.get(f"{BASE_URL}/api/deal-size-ranges", timeout=3).status_code == 200
    except requests.RequestException:
        return False


pytestmark = pytest.mark.skipif(
    not _backend_available(),
    reason=f"backend not reachable at {BASE_URL}",
)


def _calc(hours, hourly_rate, target_margin_percent=30, **overrides):
    payload = {
        "team_members": [{
            "role_id": "golden-role",
            "role_name": "Golden Role",
            "hours": hours,
            "hourly_rate": hourly_rate,
            "calc_mode": "hours",
            "employee_type": "internal",
        }],
        "vendors": [],
        "target_margin_percent": target_margin_percent,
        "use_split_margins": False,
        "internal_risk": {"complexity": "none", "rush": "none", "execution": "none", "custom_multiplier": 0},
        "vendor_risk": {"complexity": "none", "rush": "none", "execution": "none", "custom_multiplier": 0},
        "client_type": "new",
        "lead_source": "direct",
    }
    payload.update(overrides)
    resp = requests.post(f"{BASE_URL}/api/calculate/simple", json=payload, timeout=10)
    assert resp.status_code == 200, resp.text
    return resp.json()


class TestDealSizeThresholds:
    """Deal size must track the pricing_guidelines tiers, not the old 4x-too-high ranges."""

    def test_ranges_aligned_with_guidelines(self):
        r = requests.get(f"{BASE_URL}/api/deal-size-ranges", timeout=5).json()
        assert r["tiny_max"] == 50000
        assert r["standard_max"] == 200000
        assert r["big_max"] == 500000

    def test_small_deal_is_tiny(self):
        d = _calc(hours=100, hourly_rate=100)  # COGS ~12.5K, selling <50K
        assert d["selling_price"] < 50000
        assert d["incentive_breakdown"]["deal_size"] == "tiny"

    def test_mid_deal_is_standard(self):
        # Regression: a ~175K deal used to be mis-classified as "tiny".
        d = _calc(hours=900, hourly_rate=100)
        assert 50000 <= d["selling_price"] < 200000
        assert d["incentive_breakdown"]["deal_size"] == "standard"

    def test_large_deal_is_big(self):
        d = _calc(hours=2000, hourly_rate=130)
        assert 200000 <= d["selling_price"] < 500000
        assert d["incentive_breakdown"]["deal_size"] == "big"

    def test_enterprise_deal_is_mega(self):
        d = _calc(hours=4000, hourly_rate=150)
        assert d["selling_price"] >= 500000
        assert d["incentive_breakdown"]["deal_size"] == "mega"


class TestDivisorOverflowGuard:
    """A non-positive (1 - margin - incentive) divisor must surface an explicit error."""

    def test_extreme_margin_emits_error_warning(self):
        d = _calc(hours=100, hourly_rate=100, target_margin_percent=99)
        types = {w["type"] for w in d.get("warnings", [])}
        assert "pricing_divisor_invalid" in types
        sev = next(w["severity"] for w in d["warnings"] if w["type"] == "pricing_divisor_invalid")
        assert sev == "error"

    def test_normal_margin_has_no_divisor_warning(self):
        d = _calc(hours=900, hourly_rate=100, target_margin_percent=30)
        types = {w["type"] for w in d.get("warnings", [])}
        assert "pricing_divisor_invalid" not in types


class TestMarginWarningTier:
    """Margin warnings use the detected deal size's guideline, not the first general doc."""

    def test_standard_30pct_is_below_target_not_below_min(self):
        # Standard tier (pg-2): min 28, target 35. A 30% deal is below target
        # but above minimum -> 'margin_below_target' (warning), never 'margin_low'.
        d = _calc(hours=900, hourly_rate=100, target_margin_percent=30)
        types = {w["type"] for w in d.get("warnings", [])}
        assert "margin_below_target" in types
        assert "margin_low" not in types


class TestContributionMarginFormula:
    """Contribution margin identity must hold across the response fields."""

    def test_cm_equals_selling_minus_cogs_minus_incentive(self):
        d = _calc(hours=900, hourly_rate=100)
        expected = d["selling_price"] - d["cogs"] - d["sales_incentive"]
        assert abs(expected - d["contribution_margin"]) < 1.0


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
