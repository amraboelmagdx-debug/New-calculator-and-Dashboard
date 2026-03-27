"""
Backend tests for Pricing Guidelines, Split Margins, and Risk Factors features
Tests the new features integrated into the Simple Calculator mode
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://deal-intel-hub.preview.emergentagent.com')

class TestPricingGuidelines:
    """Tests for Pricing Guidelines API"""
    
    def test_get_pricing_guidelines(self):
        """Test GET /api/pricing-guidelines returns guidelines by deal size and service type"""
        response = requests.get(f"{BASE_URL}/api/pricing-guidelines")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Check for deal size guidelines (Tiny, Standard, Big, Mega)
        deal_sizes = [g['deal_size'] for g in data if g['category'] == 'general']
        assert 'tiny' in deal_sizes, "Missing Tiny deal size guideline"
        assert 'standard' in deal_sizes, "Missing Standard deal size guideline"
        assert 'big' in deal_sizes, "Missing Big deal size guideline"
        assert 'mega' in deal_sizes, "Missing Mega deal size guideline"
        
        # Check for service type guidelines (Branding, Campaign, Staffing)
        categories = [g['category'] for g in data]
        assert 'branding' in categories, "Missing Branding service type guideline"
        assert 'campaign' in categories, "Missing Campaign service type guideline"
        assert 'staffing' in categories, "Missing Staffing service type guideline"
        
        # Verify guideline structure
        for guideline in data:
            assert 'min_margin' in guideline
            assert 'target_margin' in guideline
            assert 'premium_margin' in guideline
            assert guideline['min_margin'] < guideline['target_margin'] < guideline['premium_margin']
        
        print(f"✅ Pricing guidelines loaded: {len(data)} guidelines")
        print(f"   Deal sizes: {deal_sizes}")
        print(f"   Categories: {set(categories)}")


class TestRiskConfiguration:
    """Tests for Risk Configuration API"""
    
    def test_get_risk_config(self):
        """Test GET /api/risk-config returns risk configuration"""
        response = requests.get(f"{BASE_URL}/api/risk-config")
        assert response.status_code == 200
        
        data = response.json()
        
        # Check risk levels
        assert 'levels' in data
        levels = data['levels']
        assert levels['none'] == 1.0
        assert levels['low'] > 1.0
        assert levels['medium'] > levels['low']
        assert levels['high'] > levels['medium']
        
        # Check weights
        assert 'complexity_weight' in data
        assert 'rush_weight' in data
        assert 'execution_weight' in data
        
        # Weights should sum to 1.0
        total_weight = data['complexity_weight'] + data['rush_weight'] + data['execution_weight']
        assert abs(total_weight - 1.0) < 0.01, f"Weights should sum to 1.0, got {total_weight}"
        
        print(f"✅ Risk config loaded: levels={levels}")
        print(f"   Weights: complexity={data['complexity_weight']}, rush={data['rush_weight']}, execution={data['execution_weight']}")


class TestSimpleCalculatorWithSplitMargins:
    """Tests for Simple Calculator with Split Margins feature"""
    
    def test_calculate_without_split_margins(self):
        """Test calculation with unified target margin (split margins disabled)"""
        payload = {
            "team_members": [
                {
                    "role_id": "role-3",
                    "role_name": "Senior Designer",
                    "hours": 40,
                    "hourly_rate": 280,
                    "calc_mode": "hours",
                    "employee_type": "internal"
                }
            ],
            "vendors": [
                {
                    "service_id": "vs-1",
                    "service_name": "Production House",
                    "cost": 10000,
                    "markup_percent": 15
                }
            ],
            "target_margin_percent": 30,
            "internal_margin_percent": 30,
            "vendor_margin_percent": 15,
            "use_split_margins": False,
            "internal_risk": {"complexity": "none", "rush": "none", "execution": "none", "custom_multiplier": 0},
            "vendor_risk": {"complexity": "none", "rush": "none", "execution": "none", "custom_multiplier": 0}
        }
        
        response = requests.post(f"{BASE_URL}/api/calculate/simple", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify basic calculation results
        assert data['internal_labor_cost'] == 11200.0  # 40 * 280
        assert data['vendor_cost'] == 10000.0
        assert data['vendor_revenue'] == 11500.0  # 10000 * 1.15
        assert data['selling_price'] > 0
        assert data['contribution_margin'] > 0
        
        # Verify risk multipliers are 1.0 (no risk)
        assert data['internal_risk_multiplier'] == 1.0
        assert data['vendor_risk_multiplier'] == 1.0
        assert data['risk_level'] == "None"
        
        print(f"✅ Unified margin calculation: selling_price={data['selling_price']}, margin={data['contribution_margin_percent']}%")
    
    def test_calculate_with_split_margins(self):
        """Test calculation with separate internal and vendor margins (split margins enabled)"""
        payload = {
            "team_members": [
                {
                    "role_id": "role-3",
                    "role_name": "Senior Designer",
                    "hours": 40,
                    "hourly_rate": 280,
                    "calc_mode": "hours",
                    "employee_type": "internal"
                }
            ],
            "vendors": [
                {
                    "service_id": "vs-1",
                    "service_name": "Production House",
                    "cost": 10000,
                    "markup_percent": 15
                }
            ],
            "target_margin_percent": 30,
            "internal_margin_percent": 35,
            "vendor_margin_percent": 20,
            "use_split_margins": True,
            "internal_risk": {"complexity": "none", "rush": "none", "execution": "none", "custom_multiplier": 0},
            "vendor_risk": {"complexity": "none", "rush": "none", "execution": "none", "custom_multiplier": 0}
        }
        
        response = requests.post(f"{BASE_URL}/api/calculate/simple", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify split margin results
        assert 'internal_margin_percent' in data
        assert 'vendor_margin_percent' in data
        assert 'blended_margin_percent' in data
        
        # Internal margin should be achieved
        assert data['internal_margin_percent'] > 0
        # Vendor margin should be achieved
        assert data['vendor_margin_percent'] > 0
        # Blended margin should be between internal and vendor
        assert data['blended_margin_percent'] > 0
        
        print(f"✅ Split margin calculation:")
        print(f"   Internal margin: {data['internal_margin_percent']}%")
        print(f"   Vendor margin: {data['vendor_margin_percent']}%")
        print(f"   Blended margin: {data['blended_margin_percent']}%")


class TestRiskFactorsCalculation:
    """Tests for Risk Factors affecting pricing"""
    
    def test_calculate_with_risk_factors(self):
        """Test that risk factors affect the final selling price"""
        # First calculate without risk
        payload_no_risk = {
            "team_members": [
                {
                    "role_id": "role-3",
                    "role_name": "Senior Designer",
                    "hours": 40,
                    "hourly_rate": 280,
                    "calc_mode": "hours",
                    "employee_type": "internal"
                }
            ],
            "vendors": [],
            "target_margin_percent": 30,
            "use_split_margins": False,
            "internal_risk": {"complexity": "none", "rush": "none", "execution": "none", "custom_multiplier": 0},
            "vendor_risk": {"complexity": "none", "rush": "none", "execution": "none", "custom_multiplier": 0}
        }
        
        response_no_risk = requests.post(f"{BASE_URL}/api/calculate/simple", json=payload_no_risk)
        assert response_no_risk.status_code == 200
        data_no_risk = response_no_risk.json()
        
        # Now calculate with risk
        payload_with_risk = {
            "team_members": [
                {
                    "role_id": "role-3",
                    "role_name": "Senior Designer",
                    "hours": 40,
                    "hourly_rate": 280,
                    "calc_mode": "hours",
                    "employee_type": "internal"
                }
            ],
            "vendors": [],
            "target_margin_percent": 30,
            "use_split_margins": False,
            "internal_risk": {"complexity": "high", "rush": "medium", "execution": "low", "custom_multiplier": 0},
            "vendor_risk": {"complexity": "none", "rush": "none", "execution": "none", "custom_multiplier": 0}
        }
        
        response_with_risk = requests.post(f"{BASE_URL}/api/calculate/simple", json=payload_with_risk)
        assert response_with_risk.status_code == 200
        data_with_risk = response_with_risk.json()
        
        # Verify risk multiplier is applied
        assert data_with_risk['internal_risk_multiplier'] > 1.0
        assert data_with_risk['risk_level'] in ["Low", "Medium", "High"]
        assert data_with_risk['risk_impact_percent'] > 0
        
        # Selling price should be higher with risk
        assert data_with_risk['selling_price'] > data_no_risk['selling_price']
        
        price_increase = ((data_with_risk['selling_price'] - data_no_risk['selling_price']) / data_no_risk['selling_price']) * 100
        
        print(f"✅ Risk factors affect pricing:")
        print(f"   No risk: selling_price={data_no_risk['selling_price']}")
        print(f"   With risk: selling_price={data_with_risk['selling_price']}")
        print(f"   Price increase: {price_increase:.2f}%")
        print(f"   Risk multiplier: {data_with_risk['internal_risk_multiplier']}")
        print(f"   Risk level: {data_with_risk['risk_level']}")
    
    def test_separate_internal_and_vendor_risk(self):
        """Test that internal and vendor risk factors are calculated separately"""
        payload = {
            "team_members": [
                {
                    "role_id": "role-3",
                    "role_name": "Senior Designer",
                    "hours": 40,
                    "hourly_rate": 280,
                    "calc_mode": "hours",
                    "employee_type": "internal"
                }
            ],
            "vendors": [
                {
                    "service_id": "vs-1",
                    "service_name": "Production House",
                    "cost": 10000,
                    "markup_percent": 15
                }
            ],
            "target_margin_percent": 30,
            "use_split_margins": True,
            "internal_risk": {"complexity": "high", "rush": "none", "execution": "none", "custom_multiplier": 0},
            "vendor_risk": {"complexity": "none", "rush": "high", "execution": "none", "custom_multiplier": 0}
        }
        
        response = requests.post(f"{BASE_URL}/api/calculate/simple", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify separate risk multipliers
        assert 'internal_risk_multiplier' in data
        assert 'vendor_risk_multiplier' in data
        assert data['internal_risk_multiplier'] != data['vendor_risk_multiplier']
        
        print(f"✅ Separate risk multipliers:")
        print(f"   Internal risk multiplier: {data['internal_risk_multiplier']}")
        print(f"   Vendor risk multiplier: {data['vendor_risk_multiplier']}")
        print(f"   Total risk multiplier: {data['total_risk_multiplier']}")


class TestMarginWarnings:
    """Tests for margin warning display"""
    
    def test_warning_when_margin_below_minimum(self):
        """Test that warnings are generated when margin is below minimum guideline"""
        # Use a very low margin to trigger warning
        payload = {
            "team_members": [
                {
                    "role_id": "role-3",
                    "role_name": "Senior Designer",
                    "hours": 100,
                    "hourly_rate": 280,
                    "calc_mode": "hours",
                    "employee_type": "internal"
                }
            ],
            "vendors": [],
            "target_margin_percent": 10,  # Very low margin
            "use_split_margins": False,
            "internal_risk": {"complexity": "none", "rush": "none", "execution": "none", "custom_multiplier": 0},
            "vendor_risk": {"complexity": "none", "rush": "none", "execution": "none", "custom_multiplier": 0}
        }
        
        response = requests.post(f"{BASE_URL}/api/calculate/simple", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify warnings are present
        assert 'warnings' in data
        assert len(data['warnings']) > 0
        
        # Check for margin warning
        margin_warnings = [w for w in data['warnings'] if 'margin' in w['type'].lower()]
        assert len(margin_warnings) > 0, "Expected margin warning when margin is low"
        
        # Check warning structure
        warning = margin_warnings[0]
        assert 'type' in warning
        assert 'message' in warning
        assert 'severity' in warning
        assert warning['severity'] in ['warning', 'error']
        
        print(f"✅ Margin warnings generated:")
        for w in data['warnings']:
            print(f"   [{w['severity'].upper()}] {w['message']}")


class TestVendorServices:
    """Tests for Vendor Services API"""
    
    def test_get_vendor_services(self):
        """Test GET /api/vendor-services returns vendor services"""
        response = requests.get(f"{BASE_URL}/api/vendor-services")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Verify vendor service structure
        for service in data:
            assert 'id' in service
            assert 'name' in service
            assert 'default_markup_percent' in service
        
        print(f"✅ Vendor services loaded: {len(data)} services")


class TestRoles:
    """Tests for Roles API"""
    
    def test_get_roles(self):
        """Test GET /api/roles returns roles with calculated benefits"""
        response = requests.get(f"{BASE_URL}/api/roles")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Verify role structure with benefits
        for role in data:
            assert 'id' in role
            assert 'name' in role
            assert 'hourly_rate' in role
            assert 'monthly_salary' in role
            assert 'social_insurance' in role
            assert 'medical_insurance' in role
            assert 'end_of_service' in role
            assert 'total_monthly_cost' in role
        
        print(f"✅ Roles loaded: {len(data)} roles with calculated benefits")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
