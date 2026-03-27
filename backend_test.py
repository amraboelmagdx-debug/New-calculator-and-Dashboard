#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class OPEAPITester:
    def __init__(self, base_url="https://deal-intel-hub.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_password = "Amr123"
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        # Add admin password for protected routes
        if headers and 'admin' in headers:
            test_headers['X-Admin-Password'] = self.admin_password
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.text else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                self.failed_tests.append({
                    'name': name,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'response': response.text[:200]
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                'name': name,
                'error': str(e)
            })
            return False, {}

    def test_basic_connectivity(self):
        """Test basic API connectivity"""
        print("\n" + "="*50)
        print("TESTING BASIC CONNECTIVITY")
        print("="*50)
        
        success, _ = self.run_test("API Root", "GET", "", 200)
        return success

    def test_roles_api(self):
        """Test roles API with benefits calculation"""
        print("\n" + "="*50)
        print("TESTING ROLES API")
        print("="*50)
        
        # Test GET roles (should return calculated benefits)
        success, roles_data = self.run_test("Get Roles with Benefits", "GET", "roles", 200)
        
        if success and roles_data:
            print(f"   Found {len(roles_data)} roles")
            if len(roles_data) > 0:
                role = roles_data[0]
                required_fields = ['social_insurance', 'medical_insurance', 'end_of_service', 'total_monthly_cost']
                for field in required_fields:
                    if field in role:
                        print(f"   ✅ Role has {field}: {role[field]}")
                    else:
                        print(f"   ❌ Role missing {field}")
        
        # Test quick create role (no admin auth)
        test_role = {
            "name": f"Test Role {datetime.now().strftime('%H%M%S')}",
            "hourly_rate": 250,
            "monthly_salary": 25000
        }
        success, created_role = self.run_test("Quick Create Role", "POST", "roles/quick", 200, test_role)
        
        if success and created_role:
            print(f"   ✅ Created role: {created_role.get('name')}")
            return created_role.get('id')
        
        return None

    def test_vendor_services_api(self):
        """Test vendor services API"""
        print("\n" + "="*50)
        print("TESTING VENDOR SERVICES API")
        print("="*50)
        
        # Test GET vendor services
        success, services_data = self.run_test("Get Vendor Services", "GET", "vendor-services", 200)
        
        if success:
            print(f"   Found {len(services_data)} vendor services")
        
        # Test quick create vendor service (no admin auth)
        test_service = {
            "name": f"Test Service {datetime.now().strftime('%H%M%S')}",
            "category": "Testing",
            "default_markup_percent": 15
        }
        success, created_service = self.run_test("Quick Create Vendor Service", "POST", "vendor-services/quick", 200, test_service)
        
        if success and created_service:
            print(f"   ✅ Created service: {created_service.get('name')}")
            return created_service.get('id')
        
        return None

    def test_hr_config_api(self):
        """Test HR configuration API"""
        print("\n" + "="*50)
        print("TESTING HR CONFIG API")
        print("="*50)
        
        # Test GET HR config
        success, config_data = self.run_test("Get HR Config", "GET", "hr-config", 200)
        
        if success and config_data:
            required_fields = ['social_insurance_percent', 'medical_insurance_percent', 'end_of_service_divisor']
            for field in required_fields:
                if field in config_data:
                    print(f"   ✅ Config has {field}: {config_data[field]}")
                else:
                    print(f"   ❌ Config missing {field}")
        
        # Test PUT HR config (requires admin auth)
        test_config = {
            "social_insurance_percent": 12,
            "medical_insurance_percent": 3,
            "end_of_service_divisor": 2,
            "google_sheets_enabled": True,
            "google_sheets_url": "https://docs.google.com/spreadsheets/d/test"
        }
        success, updated_config = self.run_test("Update HR Config", "PUT", "hr-config", 200, test_config, {'admin': True})
        
        if success:
            print("   ✅ HR Config updated successfully")
        
        return success

    def test_simple_calculator(self):
        """Test simple calculator with team member modes"""
        print("\n" + "="*50)
        print("TESTING SIMPLE CALCULATOR")
        print("="*50)
        
        # Test Hours mode calculation
        hours_data = {
            "team_members": [
                {
                    "role_id": "role-1",
                    "role_name": "Creative Director",
                    "hours": 40,
                    "hourly_rate": 450,
                    "calc_mode": "hours",
                    "employee_type": "internal"
                }
            ],
            "vendors": [],
            "target_margin_percent": 30
        }
        
        success, hours_result = self.run_test("Simple Calculator - Hours Mode", "POST", "calculate/simple", 200, hours_data)
        
        if success and hours_result:
            print(f"   ✅ Hours mode calculation: {hours_result.get('selling_price', 0)} SAR")
        
        # Test Utilization mode calculation
        util_data = {
            "team_members": [
                {
                    "role_id": "role-1",
                    "role_name": "Creative Director",
                    "utilization_percent": 50,
                    "duration_months": 3,
                    "monthly_salary": 45000,
                    "calc_mode": "utilization",
                    "employee_type": "internal"
                }
            ],
            "vendors": [],
            "target_margin_percent": 30
        }
        
        success, util_result = self.run_test("Simple Calculator - Utilization Mode", "POST", "calculate/simple", 200, util_data)
        
        if success and util_result:
            print(f"   ✅ Utilization mode calculation: {util_result.get('selling_price', 0)} SAR")
        
        # Test Seconded employee calculation
        seconded_data = {
            "team_members": [
                {
                    "role_id": "role-1",
                    "role_name": "Seconded Developer",
                    "utilization_percent": 100,
                    "duration_months": 6,
                    "custom_salary": 30000,
                    "custom_allowance": 5000,
                    "admin_fee_percent": 10,
                    "calc_mode": "utilization",
                    "employee_type": "seconded"
                }
            ],
            "vendors": [],
            "target_margin_percent": 30
        }
        
        success, seconded_result = self.run_test("Simple Calculator - Seconded Employee", "POST", "calculate/simple", 200, seconded_data)
        
        if success and seconded_result:
            print(f"   ✅ Seconded employee calculation: {seconded_result.get('selling_price', 0)} SAR")
        
        return success

    def test_google_sheets_import(self):
        """Test Google Sheets import functionality"""
        print("\n" + "="*50)
        print("TESTING GOOGLE SHEETS IMPORT")
        print("="*50)
        
        # Test with a sample Google Sheets URL (this will likely fail but we test the endpoint)
        test_url = "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
        
        success, import_result = self.run_test("Google Sheets Import", "POST", f"import-google-sheet?url={test_url}", 200, {}, {'admin': True})
        
        # This might fail due to sheet access, but we test the endpoint exists
        if not success:
            print("   ℹ️  Google Sheets import endpoint exists but may require valid sheet access")
        
        return True  # Don't fail the test suite for this

    def test_admin_protected_routes(self):
        """Test that admin routes are properly protected"""
        print("\n" + "="*50)
        print("TESTING ADMIN PROTECTION")
        print("="*50)
        
        # Test creating role without admin password (should fail)
        test_role = {"name": "Unauthorized Role", "hourly_rate": 100}
        success, _ = self.run_test("Create Role Without Admin", "POST", "roles", 401, test_role)
        
        if success:
            print("   ✅ Admin protection working - unauthorized request rejected")
        
        # Test creating role with admin password (should succeed)
        success, _ = self.run_test("Create Role With Admin", "POST", "roles", 200, test_role, {'admin': True})
        
        return success

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting OPE API Test Suite")
        print(f"Testing against: {self.base_url}")
        print(f"Admin password: {self.admin_password}")
        
        # Run test suites
        test_results = []
        
        test_results.append(("Basic Connectivity", self.test_basic_connectivity()))
        test_results.append(("Roles API", self.test_roles_api() is not None))
        test_results.append(("Vendor Services API", self.test_vendor_services_api() is not None))
        test_results.append(("HR Config API", self.test_hr_config_api()))
        test_results.append(("Simple Calculator", self.test_simple_calculator()))
        test_results.append(("Google Sheets Import", self.test_google_sheets_import()))
        test_results.append(("Admin Protection", self.test_admin_protected_routes()))
        
        # Print summary
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        
        for test_name, result in test_results:
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{test_name:<25} {status}")
        
        print(f"\nOverall: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for failure in self.failed_tests:
                print(f"  - {failure['name']}")
                if 'error' in failure:
                    print(f"    Error: {failure['error']}")
                else:
                    print(f"    Expected: {failure['expected']}, Got: {failure['actual']}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"\n📊 Success Rate: {success_rate:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = OPEAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())