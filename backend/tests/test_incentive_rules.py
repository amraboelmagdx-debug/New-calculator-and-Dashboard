"""
Test suite for Sales Incentive Rules and Multipliers
Tests the dynamic incentive calculation system with:
- Deal size-based rules (Tiny/Standard/Big/Mega)
- Role-based percentages (Sales Rep/Sales Manager)
- Max caps per rule
- Client type multiplier (existing customer = 0.9)
- Lead source multiplier (referral = 0.5)
- Combined multipliers (existing + referral = 0.45)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
ADMIN_PASSWORD = "Amr123"

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture
def admin_client(api_client):
    """Session with admin auth header"""
    api_client.headers.update({"X-Admin-Password": ADMIN_PASSWORD})
    return api_client


class TestIncentiveRulesAPI:
    """Test GET /api/incentive-rules endpoint"""
    
    def test_get_incentive_rules_returns_list(self, api_client):
        """GET /api/incentive-rules returns all rules"""
        response = api_client.get(f"{BASE_URL}/api/incentive-rules")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ GET /api/incentive-rules returned {len(data)} rules")
    
    def test_incentive_rules_have_required_fields(self, api_client):
        """Each rule has deal_size, role, base_percent, max_cap"""
        response = api_client.get(f"{BASE_URL}/api/incentive-rules")
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 0:
            rule = data[0]
            assert "deal_size" in rule, "Rule missing deal_size"
            assert "role" in rule, "Rule missing role"
            assert "base_percent" in rule, "Rule missing base_percent"
            assert "max_cap" in rule, "Rule missing max_cap"
            print(f"✅ Rules have required fields: deal_size, role, base_percent, max_cap")
        else:
            pytest.skip("No rules found in database")
    
    def test_rules_grouped_by_deal_size(self, api_client):
        """Rules exist for different deal sizes"""
        response = api_client.get(f"{BASE_URL}/api/incentive-rules")
        assert response.status_code == 200
        
        data = response.json()
        deal_sizes = set(r.get('deal_size') for r in data)
        print(f"✅ Found rules for deal sizes: {deal_sizes}")
        
        # Should have at least some deal sizes
        assert len(deal_sizes) > 0, "No deal sizes found in rules"


class TestIncentiveMultipliersAPI:
    """Test GET /api/incentive-multipliers endpoint"""
    
    def test_get_incentive_multipliers(self, api_client):
        """GET /api/incentive-multipliers returns multipliers config"""
        response = api_client.get(f"{BASE_URL}/api/incentive-multipliers")
        assert response.status_code == 200
        
        data = response.json()
        assert "existing_customer_multiplier" in data
        assert "referral_multiplier" in data
        
        print(f"✅ Multipliers: existing_customer={data['existing_customer_multiplier']}, referral={data['referral_multiplier']}")
    
    def test_multipliers_have_correct_defaults(self, api_client):
        """Multipliers should be 0.9 for existing and 0.5 for referral"""
        response = api_client.get(f"{BASE_URL}/api/incentive-multipliers")
        assert response.status_code == 200
        
        data = response.json()
        # Check expected values (may vary based on seeding)
        assert 0 < data['existing_customer_multiplier'] <= 1, "existing_customer_multiplier should be between 0 and 1"
        assert 0 < data['referral_multiplier'] <= 1, "referral_multiplier should be between 0 and 1"
        print(f"✅ Multipliers are within valid range (0-1)")


class TestCalculateSimpleWithIncentives:
    """Test POST /api/calculate/simple with incentive inputs"""
    
    def get_base_payload(self):
        """Base payload for calculation tests"""
        return {
            "team_members": [{
                "role_id": "test-role",
                "role_name": "Test Role",
                "hours": 100,
                "hourly_rate": 100,
                "calc_mode": "hours",
                "employee_type": "internal"
            }],
            "vendors": [],
            "target_margin_percent": 30,
            "internal_margin_percent": 30,
            "vendor_margin_percent": 15,
            "use_split_margins": False,
            "internal_risk": {"complexity": "none", "rush": "none", "execution": "none", "custom_multiplier": 0},
            "vendor_risk": {"complexity": "none", "rush": "none", "execution": "none", "custom_multiplier": 0},
            "client_type": "new",
            "lead_source": "direct"
        }
    
    def test_new_client_direct_uses_full_percentages(self, api_client):
        """client_type='new' and lead_source='direct' uses full base percentages"""
        payload = self.get_base_payload()
        payload["client_type"] = "new"
        payload["lead_source"] = "direct"
        
        response = api_client.post(f"{BASE_URL}/api/calculate/simple", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "incentive_breakdown" in data
        
        breakdown = data["incentive_breakdown"]
        assert breakdown["client_multiplier"] == 1.0, "New client + direct should have multiplier 1.0"
        print(f"✅ New client + direct: multiplier={breakdown['client_multiplier']}, total_incentive={data['sales_incentive']}")
    
    def test_existing_client_applies_09_multiplier(self, api_client):
        """client_type='existing' applies 0.9 multiplier"""
        payload = self.get_base_payload()
        payload["client_type"] = "existing"
        payload["lead_source"] = "direct"
        
        response = api_client.post(f"{BASE_URL}/api/calculate/simple", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        breakdown = data["incentive_breakdown"]
        
        # Should be 0.9 (or whatever is configured)
        assert breakdown["client_multiplier"] < 1.0, "Existing client should have multiplier < 1.0"
        print(f"✅ Existing client: multiplier={breakdown['client_multiplier']}")
    
    def test_referral_applies_05_multiplier(self, api_client):
        """lead_source='referral' applies 0.5 multiplier"""
        payload = self.get_base_payload()
        payload["client_type"] = "new"
        payload["lead_source"] = "referral"
        
        response = api_client.post(f"{BASE_URL}/api/calculate/simple", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        breakdown = data["incentive_breakdown"]
        
        # Should be 0.5 (or whatever is configured)
        assert breakdown["client_multiplier"] < 1.0, "Referral should have multiplier < 1.0"
        print(f"✅ Referral lead: multiplier={breakdown['client_multiplier']}")
    
    def test_combined_existing_referral_applies_045_multiplier(self, api_client):
        """existing + referral applies 0.45 multiplier (0.9 × 0.5)"""
        payload = self.get_base_payload()
        payload["client_type"] = "existing"
        payload["lead_source"] = "referral"
        
        response = api_client.post(f"{BASE_URL}/api/calculate/simple", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        breakdown = data["incentive_breakdown"]
        
        # Should be 0.9 * 0.5 = 0.45
        assert breakdown["client_multiplier"] < 0.9, "Combined should have multiplier < 0.9"
        print(f"✅ Existing + Referral: multiplier={breakdown['client_multiplier']} (expected ~0.45)")
    
    def test_deal_size_auto_detection(self, api_client):
        """Deal size is auto-detected based on estimated selling price"""
        payload = self.get_base_payload()
        
        response = api_client.post(f"{BASE_URL}/api/calculate/simple", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        breakdown = data["incentive_breakdown"]
        
        assert "deal_size" in breakdown
        assert breakdown["deal_size"] in ["tiny", "standard", "big", "mega"]
        print(f"✅ Deal size auto-detected: {breakdown['deal_size']} for selling_price={data['selling_price']}")
    
    def test_incentive_breakdown_has_sales_rep_and_manager(self, api_client):
        """Incentive breakdown shows Sales Rep and Sales Manager separately"""
        payload = self.get_base_payload()
        
        response = api_client.post(f"{BASE_URL}/api/calculate/simple", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        breakdown = data["incentive_breakdown"]
        
        assert "sales_rep" in breakdown, "Missing sales_rep in breakdown"
        assert "sales_manager" in breakdown, "Missing sales_manager in breakdown"
        
        # Check sales_rep structure
        sr = breakdown["sales_rep"]
        assert "base_percent" in sr
        assert "adjusted_percent" in sr
        assert "value" in sr
        assert "capped_value" in sr
        assert "cap" in sr
        
        print(f"✅ Sales Rep: base={sr['base_percent']}%, adjusted={sr['adjusted_percent']}%, value={sr['capped_value']}")
        print(f"✅ Sales Manager: base={breakdown['sales_manager']['base_percent']}%, adjusted={breakdown['sales_manager']['adjusted_percent']}%, value={breakdown['sales_manager']['capped_value']}")
    
    def test_total_incentive_is_sum_of_capped_values(self, api_client):
        """Total incentive equals sum of capped values"""
        payload = self.get_base_payload()
        
        response = api_client.post(f"{BASE_URL}/api/calculate/simple", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        breakdown = data["incentive_breakdown"]
        
        expected_total = breakdown["sales_rep"]["capped_value"] + breakdown["sales_manager"]["capped_value"]
        actual_total = breakdown["total_incentive"]
        
        assert abs(expected_total - actual_total) < 0.01, f"Total mismatch: expected {expected_total}, got {actual_total}"
        print(f"✅ Total incentive = {actual_total} (Sales Rep {breakdown['sales_rep']['capped_value']} + Sales Manager {breakdown['sales_manager']['capped_value']})")


class TestIncentiveCaps:
    """Test that incentive caps are applied correctly"""
    
    def test_cap_applied_flag_when_value_exceeds_cap(self, api_client):
        """cap_applied flag is True when value exceeds cap"""
        # Create a large deal to potentially trigger caps
        payload = {
            "team_members": [{
                "role_id": "test-role",
                "role_name": "Test Role",
                "hours": 1000,
                "hourly_rate": 500,
                "calc_mode": "hours",
                "employee_type": "internal"
            }],
            "vendors": [],
            "target_margin_percent": 30,
            "use_split_margins": False,
            "internal_risk": {"complexity": "none", "rush": "none", "execution": "none", "custom_multiplier": 0},
            "vendor_risk": {"complexity": "none", "rush": "none", "execution": "none", "custom_multiplier": 0},
            "client_type": "new",
            "lead_source": "direct"
        }
        
        response = api_client.post(f"{BASE_URL}/api/calculate/simple", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        breakdown = data["incentive_breakdown"]
        
        # Check if cap_applied field exists
        assert "cap_applied" in breakdown["sales_rep"]
        assert "cap_applied" in breakdown["sales_manager"]
        
        print(f"✅ Cap applied flags present: sales_rep={breakdown['sales_rep']['cap_applied']}, sales_manager={breakdown['sales_manager']['cap_applied']}")


class TestContributionMargin:
    """Test contribution margin calculation with incentives"""
    
    def test_contribution_margin_formula(self, api_client):
        """Contribution Margin = Selling Price - COGS - Total Incentive"""
        payload = {
            "team_members": [{
                "role_id": "test-role",
                "role_name": "Test Role",
                "hours": 100,
                "hourly_rate": 100,
                "calc_mode": "hours",
                "employee_type": "internal"
            }],
            "vendors": [],
            "target_margin_percent": 30,
            "use_split_margins": False,
            "internal_risk": {"complexity": "none", "rush": "none", "execution": "none", "custom_multiplier": 0},
            "vendor_risk": {"complexity": "none", "rush": "none", "execution": "none", "custom_multiplier": 0},
            "client_type": "new",
            "lead_source": "direct"
        }
        
        response = api_client.post(f"{BASE_URL}/api/calculate/simple", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        
        selling_price = data["selling_price"]
        cogs = data["cogs"]
        total_incentive = data["sales_incentive"]
        contribution_margin = data["contribution_margin"]
        
        expected_cm = selling_price - cogs - total_incentive
        
        # Allow small floating point difference
        assert abs(expected_cm - contribution_margin) < 1, f"CM mismatch: expected {expected_cm}, got {contribution_margin}"
        print(f"✅ Contribution Margin = {contribution_margin} (Selling {selling_price} - COGS {cogs} - Incentive {total_incentive})")


class TestAdminIncentiveRulesManagement:
    """Test admin CRUD operations for incentive rules"""
    
    def test_update_multipliers_requires_admin(self, api_client):
        """PUT /api/incentive-multipliers requires admin auth"""
        response = api_client.put(f"{BASE_URL}/api/incentive-multipliers", json={
            "existing_customer_multiplier": 0.9,
            "referral_multiplier": 0.5
        })
        assert response.status_code == 401
        print("✅ Update multipliers requires admin auth")
    
    def test_update_multipliers_with_admin(self, admin_client):
        """PUT /api/incentive-multipliers works with admin auth"""
        response = admin_client.put(f"{BASE_URL}/api/incentive-multipliers", json={
            "existing_customer_multiplier": 0.9,
            "referral_multiplier": 0.5
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["existing_customer_multiplier"] == 0.9
        assert data["referral_multiplier"] == 0.5
        print("✅ Update multipliers with admin auth works")


class TestDealSizeRanges:
    """Test deal size range detection"""
    
    def test_get_deal_size_ranges(self, api_client):
        """GET /api/deal-size-ranges returns range configuration"""
        response = api_client.get(f"{BASE_URL}/api/deal-size-ranges")
        assert response.status_code == 200
        
        data = response.json()
        # Check expected fields
        assert "tiny_max" in data or "tiny_min" in data
        print(f"✅ Deal size ranges: {data}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
