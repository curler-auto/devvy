#!/usr/bin/env python3
"""
Backend API Testing for DevTools Suite - REST API Tester and gRPC Tester
Tests authentication, tool configuration, and gRPC proxy endpoints
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# Backend URL from frontend/.env
BACKEND_URL = "https://apidev-hub.preview.emergentagent.com/api"

# Test credentials
TEST_ADMIN_EMAIL = "admin@devtools.com"
TEST_ADMIN_PASSWORD = "admin123"

class APITester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })
    
    def make_request(self, method: str, endpoint: str, headers: Dict = None, data: Dict = None) -> requests.Response:
        """Make HTTP request with proper error handling"""
        url = f"{BACKEND_URL}{endpoint}"
        
        default_headers = {"Content-Type": "application/json"}
        if headers:
            default_headers.update(headers)
            
        try:
            if method.upper() == "GET":
                response = self.session.get(url, headers=default_headers, timeout=30)
            elif method.upper() == "POST":
                response = self.session.post(url, headers=default_headers, json=data, timeout=30)
            elif method.upper() == "PUT":
                response = self.session.put(url, headers=default_headers, json=data, timeout=30)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, headers=default_headers, timeout=30)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
                
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            raise
    
    def test_anonymous_tool_config(self):
        """Test 1: Anonymous access to tool configuration"""
        try:
            response = self.make_request("GET", "/tools/config")
            
            if response.status_code == 200:
                data = response.json()
                tools = data.get("tools", [])
                
                # Check if api-tester and grpc-tester are present
                api_tester_found = False
                grpc_tester_found = False
                
                for tool in tools:
                    if tool.get("tool_id") == "api-tester":
                        api_tester_found = True
                        if not tool.get("is_premium", False):
                            self.log_test("Anonymous Tool Config", False, "api-tester should be marked as premium")
                            return
                    elif tool.get("tool_id") == "grpc-tester":
                        grpc_tester_found = True
                        if not tool.get("is_premium", False):
                            self.log_test("Anonymous Tool Config", False, "grpc-tester should be marked as premium")
                            return
                
                if api_tester_found and grpc_tester_found:
                    self.log_test("Anonymous Tool Config", True, f"Found {len(tools)} tools including api-tester and grpc-tester as premium")
                else:
                    missing = []
                    if not api_tester_found:
                        missing.append("api-tester")
                    if not grpc_tester_found:
                        missing.append("grpc-tester")
                    self.log_test("Anonymous Tool Config", False, f"Missing tools: {', '.join(missing)}")
            else:
                self.log_test("Anonymous Tool Config", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Anonymous Tool Config", False, f"Exception: {str(e)}")
    
    def test_admin_login(self):
        """Test 2: Admin authentication"""
        try:
            login_data = {
                "email": TEST_ADMIN_EMAIL,
                "password": TEST_ADMIN_PASSWORD
            }
            
            response = self.make_request("POST", "/auth/login", data=login_data)
            
            if response.status_code == 200:
                data = response.json()
                token = data.get("access_token")
                user_info = data.get("user", {})
                
                if token and user_info.get("email") == TEST_ADMIN_EMAIL:
                    self.auth_token = token
                    self.log_test("Admin Login", True, f"Logged in as {user_info.get('role', 'unknown role')}")
                else:
                    self.log_test("Admin Login", False, "Missing token or user info in response")
            else:
                self.log_test("Admin Login", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Admin Login", False, f"Exception: {str(e)}")
    
    def test_authenticated_tool_config(self):
        """Test 3: Authenticated access to tool configuration"""
        if not self.auth_token:
            self.log_test("Authenticated Tool Config", False, "No auth token available")
            return
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            response = self.make_request("GET", "/tools/config", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                tools = data.get("tools", [])
                
                api_tester_found = any(tool.get("tool_id") == "api-tester" for tool in tools)
                grpc_tester_found = any(tool.get("tool_id") == "grpc-tester" for tool in tools)
                
                if api_tester_found and grpc_tester_found:
                    self.log_test("Authenticated Tool Config", True, f"Found {len(tools)} tools with authentication")
                else:
                    self.log_test("Authenticated Tool Config", False, "Missing api-tester or grpc-tester in authenticated response")
            else:
                self.log_test("Authenticated Tool Config", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Authenticated Tool Config", False, f"Exception: {str(e)}")
    
    def test_license_validation(self):
        """Test 4: License validation for premium tools"""
        if not self.auth_token:
            self.log_test("License Validation", False, "No auth token available")
            return
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            response = self.make_request("GET", "/license/validate", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                is_premium = data.get("is_premium", False)
                license_tier = data.get("license_tier", "unknown")
                
                self.log_test("License Validation", True, f"License tier: {license_tier}, Premium: {is_premium}")
            else:
                self.log_test("License Validation", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("License Validation", False, f"Exception: {str(e)}")
    
    def test_tool_access_check(self):
        """Test 5: Check access to specific premium tools"""
        if not self.auth_token:
            self.log_test("Tool Access Check", False, "No auth token available")
            return
            
        tools_to_check = ["api-tester", "grpc-tester"]
        
        for tool_id in tools_to_check:
            try:
                headers = {"Authorization": f"Bearer {self.auth_token}"}
                response = self.make_request("GET", f"/tools/check-access/{tool_id}", headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    has_access = data.get("has_access", False)
                    is_premium_tool = data.get("is_premium_tool", False)
                    
                    if is_premium_tool:
                        self.log_test(f"Tool Access Check ({tool_id})", True, f"Premium tool, Access: {has_access}")
                    else:
                        self.log_test(f"Tool Access Check ({tool_id})", False, f"Tool should be marked as premium")
                else:
                    self.log_test(f"Tool Access Check ({tool_id})", False, f"HTTP {response.status_code}: {response.text}")
                    
            except Exception as e:
                self.log_test(f"Tool Access Check ({tool_id})", False, f"Exception: {str(e)}")
    
    def test_grpc_endpoint_error_handling(self):
        """Test 6: gRPC endpoint error handling with invalid proto content"""
        try:
            # Test without authentication first
            invalid_grpc_data = {
                "server_url": "localhost:50051",
                "service": "TestService",
                "method": "TestMethod",
                "request": {},
                "metadata": {},
                "proto_content": ""  # Empty proto content should cause error
            }
            
            response = self.make_request("POST", "/grpc/call", data=invalid_grpc_data)
            
            # Should return 401 or 403 for unauthenticated request
            if response.status_code in [401, 403]:
                self.log_test("gRPC Endpoint (No Auth)", True, f"Correctly rejected unauthenticated request (HTTP {response.status_code})")
            else:
                self.log_test("gRPC Endpoint (No Auth)", False, f"Expected 401 or 403, got {response.status_code}")
            
            # Test with authentication but invalid proto
            if self.auth_token:
                headers = {"Authorization": f"Bearer {self.auth_token}"}
                response = self.make_request("POST", "/grpc/call", headers=headers, data=invalid_grpc_data)
                
                if response.status_code == 400:
                    error_detail = response.json().get("detail", "")
                    if "proto" in error_detail.lower():
                        self.log_test("gRPC Endpoint (Invalid Proto)", True, f"Correctly validated proto content: {error_detail}")
                    else:
                        self.log_test("gRPC Endpoint (Invalid Proto)", True, f"Returned 400 error: {error_detail}")
                else:
                    self.log_test("gRPC Endpoint (Invalid Proto)", False, f"Expected 400, got {response.status_code}: {response.text}")
            
        except Exception as e:
            self.log_test("gRPC Endpoint Error Handling", False, f"Exception: {str(e)}")
    
    def test_grpc_endpoint_with_malformed_proto(self):
        """Test 7: gRPC endpoint with malformed proto content"""
        if not self.auth_token:
            self.log_test("gRPC Malformed Proto", False, "No auth token available")
            return
            
        try:
            malformed_grpc_data = {
                "server_url": "localhost:50051",
                "service": "TestService", 
                "method": "TestMethod",
                "request": {"test": "data"},
                "metadata": {},
                "proto_content": "syntax = \"proto3\";\n\nservice TestService {\n  // Missing closing brace"
            }
            
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            response = self.make_request("POST", "/grpc/call", headers=headers, data=malformed_grpc_data)
            
            if response.status_code == 400:
                error_detail = response.json().get("detail", "")
                self.log_test("gRPC Malformed Proto", True, f"Correctly rejected malformed proto: {error_detail}")
            else:
                self.log_test("gRPC Malformed Proto", False, f"Expected 400, got {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("gRPC Malformed Proto", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all backend tests"""
        print(f"🚀 Starting Backend API Tests for DevTools Suite")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        # Test sequence
        self.test_anonymous_tool_config()
        self.test_admin_login()
        self.test_authenticated_tool_config()
        self.test_license_validation()
        self.test_tool_access_check()
        self.test_grpc_endpoint_error_handling()
        self.test_grpc_endpoint_with_malformed_proto()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        
        if total - passed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['details']}")
        
        return passed == total

if __name__ == "__main__":
    tester = APITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)