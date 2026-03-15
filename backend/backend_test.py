import requests
import json
import sys
from datetime import datetime

class ZANPricingEngineAPITester:
    def __init__(self, base_url="https://deal-intel-hub.preview.emergentagent.com"):
        self.base_url = f"{base_url}/api"
        self.admin_password = "Amr123"
        self.tests_run = 0
        self.tests_passed = 0
        self.failures = []
        
    def log_test(self, name, success, message=""):
        """Log test result"""
        self.tests_run += 1
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        
        if success:
            self.tests_passed += 1
        else:
            self.failures.append(f"{name}: {message}")
            print(f"    Error: {message}")
            
        if message and success:
            print(f"    Info: {message}")

    def run_test(self, name, method, endpoint, expected_status=200, data=None, admin_required=False):
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if admin_required:
            headers['X-Admin-Password'] = self.admin_password

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                self.log_test(name, False, f"Unsupported method: {method}")
                return None

            success = response.status_code == expected_status
            if success:
                try:
                    result = response.json() if response.content else {}
                    self.log_test(name, True, f"Status: {response.status_code}")
                    return result
                except json.JSONDecodeError:
                    result = {"status": "success", "content": response.text[:100]}
                    self.log_test(name, True, f"Status: {response.status_code}")
                    return result
            else:
                error_msg = f"Expected {expected_status}, got {response.status_code}"
                try:
                    error_detail = response.json()
                    if 'detail' in error_detail:
                        error_msg += f" - {error_detail['detail']}"
                except:
                    error_msg += f" - {response.text[:200]}"
                self.log_test(name, False, error_msg)
                return None

        except requests.exceptions.RequestException as e:
            self.log_test(name, False, f"Request error: {str(e)}")
            return None

    def test_basic_connectivity(self):
        """Test basic API connectivity"""
        print("\n🔍 Testing Basic API Connectivity...")
        result = self.run_test("API Root Endpoint", "GET", "/")
        return result is not None

    def test_seed_data(self):
        """Test seeding database with sample data"""
        print("\n🌱 Testing Database Seeding...")
        result = self.run_test("Seed Database", "POST", "/seed-data", 200, {}, admin_required=True)
        return result is not None

    def test_roles_crud(self):
        """Test roles CRUD operations"""
        print("\n👥 Testing Roles Management...")
        
        # Get roles
        roles = self.run_test("Get All Roles", "GET", "/roles")
        if not roles:
            return False
            
        # Test role creation
        new_role = {
            "name": "Test Role",
            "hourly_rate": 300,
            "monthly_salary": 30000,
            "description": "Test role for API testing"
        }
        
        created_role = self.run_test("Create Role", "POST", "/roles", 200, new_role, admin_required=True)
        if not created_role:
            return False
            
        role_id = created_role.get('id')
        if not role_id:
            self.log_test("Role Creation ID Check", False, "No ID returned from creation")
            return False
            
        # Test role update
        updated_role = {**new_role, "hourly_rate": 350}
        update_result = self.run_test("Update Role", "PUT", f"/roles/{role_id}", 200, updated_role, admin_required=True)
        
        # Test role deletion
        delete_result = self.run_test("Delete Role", "DELETE", f"/roles/{role_id}", 200, admin_required=True)
        
        return created_role and update_result and delete_result

    def test_calculation_engines(self):
        """Test pricing calculation engines"""
        print("\n🧮 Testing Calculation Engines...")
        
        # Get roles for calculations
        roles = self.run_test("Get Roles for Calculations", "GET", "/roles")
        if not roles or len(roles) == 0:
            self.log_test("Roles Available for Testing", False, "No roles found for calculations")
            return False

        # Test simple calculation
        simple_calc_data = {
            "team_members": [
                {
                    "role_id": roles[0]['id'],
                    "role_name": roles[0]['name'],
                    "hours": 40,
                    "hourly_rate": roles[0]['hourly_rate']
                }
            ],
            "vendors": [
                {
                    "service_name": "Test Vendor",
                    "cost": 5000,
                    "markup_percent": 15
                }
            ],
            "target_margin_percent": 30
        }
        
        simple_result = self.run_test("Simple Pricing Calculation", "POST", "/calculate/simple", 200, simple_calc_data)
        if simple_result:
            # Validate calculation results
            required_fields = ['selling_price', 'internal_labor_cost', 'vendor_cost', 'contribution_margin', 'cogs']
            missing_fields = [field for field in required_fields if field not in simple_result]
            if missing_fields:
                self.log_test("Simple Calculation Fields", False, f"Missing fields: {missing_fields}")
            else:
                self.log_test("Simple Calculation Fields", True, f"All required fields present")
                
                # Validate some calculations
                expected_labor = 40 * roles[0]['hourly_rate']
                actual_labor = simple_result.get('internal_labor_cost', 0)
                if abs(expected_labor - actual_labor) < 0.01:
                    self.log_test("Labor Cost Calculation", True, f"Expected: {expected_labor}, Got: {actual_labor}")
                else:
                    self.log_test("Labor Cost Calculation", False, f"Expected: {expected_labor}, Got: {actual_labor}")

        # Test structured opportunity calculation
        opportunity_data = {
            "client": "Test Client",
            "opportunity_name": "Test Opportunity",
            "sales_owner": "Test Sales Owner",
            "risk_level": "Low",
            "target_margin_percent": 30,
            "scopes": [
                {
                    "name": "Test Scope",
                    "scope_type": "standard",
                    "products": [
                        {
                            "name": "Test Product",
                            "team_members": [
                                {
                                    "role_id": roles[0]['id'],
                                    "role_name": roles[0]['name'],
                                    "hours": 30,
                                    "hourly_rate": roles[0]['hourly_rate']
                                }
                            ]
                        }
                    ],
                    "vendors": [],
                    "tools_cost": 1000,
                    "extras_cost": 500
                }
            ]
        }
        
        opportunity_result = self.run_test("Opportunity Pricing Calculation", "POST", "/calculate/opportunity", 200, opportunity_data)
        if opportunity_result:
            # Validate structured calculation
            if 'summary' in opportunity_result and 'scopes' in opportunity_result:
                self.log_test("Opportunity Calculation Structure", True, "Contains summary and scopes")
                
                summary = opportunity_result['summary']
                required_summary_fields = ['total_revenue', 'internal_labor_cost', 'contribution_margin', 'net_profit']
                missing_summary = [field for field in required_summary_fields if field not in summary]
                if missing_summary:
                    self.log_test("Opportunity Summary Fields", False, f"Missing: {missing_summary}")
                else:
                    self.log_test("Opportunity Summary Fields", True, "All summary fields present")
            else:
                self.log_test("Opportunity Calculation Structure", False, "Missing summary or scopes")

        return simple_result and opportunity_result

    def test_admin_configuration(self):
        """Test admin configuration endpoints"""
        print("\n⚙️ Testing Admin Configuration...")
        
        # Test overhead rates
        overhead_result = self.run_test("Get Overhead Rates", "GET", "/overhead-rates")
        if overhead_result:
            # Test overhead update
            overhead_update = {
                "total_company_overhead": 600000,
                "total_billable_hours": 24000
            }
            update_result = self.run_test("Update Overhead Rates", "PUT", "/overhead-rates", 200, overhead_update, admin_required=True)
            if update_result:
                expected_rate = 600000 / 24000
                actual_rate = update_result.get('rate_per_hour', 0)
                if abs(expected_rate - actual_rate) < 0.01:
                    self.log_test("Overhead Rate Calculation", True, f"Rate: {actual_rate}/hr")
                else:
                    self.log_test("Overhead Rate Calculation", False, f"Expected: {expected_rate}, Got: {actual_rate}")

        # Test sales incentives
        incentive_result = self.run_test("Get Sales Incentives", "GET", "/sales-incentives")
        if incentive_result:
            current_percent = incentive_result.get('percent', 5)
            new_percent = 7.5
            update_result = self.run_test("Update Sales Incentives", "PUT", f"/sales-incentives?percent={new_percent}", 200, {}, admin_required=True)
            
        # Test theme settings
        theme_result = self.run_test("Get Theme Settings", "GET", "/theme-settings")
        if theme_result:
            theme_update = {
                "primary_color": "#1a1a1a",
                "brand_color": "#6366f1",
                "company_name": "ZAN Test"
            }
            theme_update_result = self.run_test("Update Theme Settings", "PUT", "/theme-settings", 200, theme_update, admin_required=True)

        return overhead_result and incentive_result and theme_result

    def test_templates_and_services(self):
        """Test product/scope templates and vendor services"""
        print("\n📋 Testing Templates and Services...")
        
        # Test product templates
        product_templates = self.run_test("Get Product Templates", "GET", "/product-templates")
        
        # Test scope templates
        scope_templates = self.run_test("Get Scope Templates", "GET", "/scope-templates")
        
        # Test vendor services
        vendor_services = self.run_test("Get Vendor Services", "GET", "/vendor-services")
        
        # Test payment terms
        payment_terms = self.run_test("Get Payment Terms", "GET", "/payment-terms")
        
        # Test risk multipliers
        risk_multipliers = self.run_test("Get Risk Multipliers", "GET", "/risk-multipliers")
        
        # Validate that all have data (should be seeded)
        validations = [
            ("Product Templates", product_templates and len(product_templates) > 0),
            ("Scope Templates", scope_templates and len(scope_templates) > 0),
            ("Vendor Services", vendor_services and len(vendor_services) > 0),
            ("Payment Terms", payment_terms and len(payment_terms) > 0),
            ("Risk Multipliers", risk_multipliers and len(risk_multipliers) > 0)
        ]
        
        for name, is_valid in validations:
            if is_valid:
                self.log_test(f"{name} Data Availability", True, "Data found")
            else:
                self.log_test(f"{name} Data Availability", False, "No data found")
        
        return all(result for _, result in validations)

    def test_opportunities_crud(self):
        """Test opportunities CRUD operations"""
        print("\n💼 Testing Opportunities Management...")
        
        # Get existing opportunities
        opportunities = self.run_test("Get All Opportunities", "GET", "/opportunities")
        
        # Get roles for opportunity creation
        roles = self.run_test("Get Roles for Opportunity", "GET", "/roles")
        if not roles or len(roles) == 0:
            self.log_test("Opportunity CRUD", False, "No roles available for opportunity creation")
            return False
        
        # Create test opportunity
        opportunity_data = {
            "client": "Test API Client",
            "opportunity_name": "API Test Opportunity",
            "sales_owner": "API Tester",
            "risk_level": "Low",
            "target_margin_percent": 25,
            "scopes": [
                {
                    "name": "API Test Scope",
                    "scope_type": "standard",
                    "products": [
                        {
                            "name": "API Test Product",
                            "team_members": [
                                {
                                    "role_id": roles[0]['id'],
                                    "role_name": roles[0]['name'],
                                    "hours": 20,
                                    "hourly_rate": roles[0]['hourly_rate']
                                }
                            ]
                        }
                    ],
                    "vendors": [],
                    "tools_cost": 500,
                    "extras_cost": 300
                }
            ]
        }
        
        created_opp = self.run_test("Create Opportunity", "POST", "/opportunities", 200, opportunity_data)
        if not created_opp:
            return False
            
        opp_id = created_opp.get('id')
        if not opp_id:
            self.log_test("Opportunity Creation ID Check", False, "No ID returned from creation")
            return False
        
        # Verify opportunity has calculations
        if 'calculations' in created_opp and created_opp['calculations']:
            self.log_test("Opportunity Calculations", True, "Calculations included in response")
        else:
            self.log_test("Opportunity Calculations", False, "No calculations in response")
        
        # Test opportunity retrieval
        retrieved_opp = self.run_test("Get Opportunity by ID", "GET", f"/opportunities/{opp_id}")
        
        # Test opportunity update
        updated_data = {**opportunity_data, "target_margin_percent": 35}
        updated_opp = self.run_test("Update Opportunity", "PUT", f"/opportunities/{opp_id}", 200, updated_data)
        
        # Test opportunity deletion
        delete_result = self.run_test("Delete Opportunity", "DELETE", f"/opportunities/{opp_id}", 200)
        
        return created_opp and retrieved_opp and updated_opp and delete_result

    def run_all_tests(self):
        """Run all test suites"""
        print(f"🚀 Starting ZAN Pricing Engine API Tests")
        print(f"📍 Testing against: {self.base_url}")
        print(f"🔑 Using admin password: {'*' * len(self.admin_password)}")
        print("=" * 80)
        
        test_suites = [
            ("Basic Connectivity", self.test_basic_connectivity),
            ("Database Seeding", self.test_seed_data),
            ("Roles CRUD Operations", self.test_roles_crud),
            ("Templates and Services", self.test_templates_and_services),
            ("Calculation Engines", self.test_calculation_engines),
            ("Admin Configuration", self.test_admin_configuration),
            ("Opportunities CRUD", self.test_opportunities_crud),
        ]
        
        suite_results = []
        
        for suite_name, test_func in test_suites:
            print(f"\n📊 Running {suite_name} Tests...")
            try:
                result = test_func()
                suite_results.append((suite_name, result))
            except Exception as e:
                print(f"❌ FATAL ERROR in {suite_name}: {str(e)}")
                suite_results.append((suite_name, False))
        
        # Print final results
        print("\n" + "=" * 80)
        print("📈 TEST RESULTS SUMMARY")
        print("=" * 80)
        
        print(f"\n🎯 Individual Tests: {self.tests_passed}/{self.tests_run} passed")
        
        print(f"\n📊 Test Suites:")
        for suite_name, result in suite_results:
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"  {status} {suite_name}")
        
        if self.failures:
            print(f"\n❌ Failed Tests:")
            for i, failure in enumerate(self.failures, 1):
                print(f"  {i}. {failure}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"\n🏆 Overall Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 90:
            print("🎉 Excellent! API is working very well.")
        elif success_rate >= 75:
            print("👍 Good! Most functionality is working.")
        elif success_rate >= 50:
            print("⚠️  Warning: Several issues found.")
        else:
            print("🚨 Critical: Major functionality issues detected.")
            
        return success_rate >= 75

def main():
    """Run the test suite"""
    tester = ZANPricingEngineAPITester()
    
    try:
        success = tester.run_all_tests()
        return 0 if success else 1
    except KeyboardInterrupt:
        print("\n🛑 Tests interrupted by user")
        return 2
    except Exception as e:
        print(f"\n🚨 Fatal error running tests: {str(e)}")
        return 3

if __name__ == "__main__":
    sys.exit(main())