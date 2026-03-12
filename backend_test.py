import requests
import sys
import json
from datetime import datetime, timedelta
import uuid

class AgencyOSAPITester:
    def __init__(self, base_url="https://project-profit-1.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_ids = {
            'user_id': None,
            'client_id': None,
            'service_id': None,
            'project_id': None,
            'quote_id': None,
            'invoice_id': None,
            'deadline_id': None
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, params=params)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"   Response: {response.text}")
                except:
                    pass
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    # Authentication Tests
    def test_register_admin(self):
        """Test admin registration (first user)"""
        test_data = {
            "email": "test@agenzia.it",
            "password": "test123456",
            "nome": "Test",
            "cognome": "Admin",
            "ruolo": "admin"
        }
        success, response = self.run_test(
            "Register Admin User", "POST", "/auth/register", 200, test_data
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.created_ids['user_id'] = response['user']['id']
            return True
        return False

    def test_login(self):
        """Test login with registered user"""
        success, response = self.run_test(
            "Login", "POST", "/auth/login", 200, 
            {"email": "test@agenzia.it", "password": "test123456"}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            return True
        return False

    def test_get_me(self):
        """Test get current user info"""
        success, response = self.run_test(
            "Get Current User", "GET", "/auth/me", 200
        )
        return success

    # Client Tests
    def test_create_client(self):
        """Test client creation"""
        client_data = {
            "nome": "Test Client SRL",
            "email": "client@test.com",
            "telefono": "+39 123456789",
            "azienda": "Test Company",
            "partita_iva": "IT12345678901",
            "indirizzo": "Via Test 123, Milano",
            "note": "Client di test"
        }
        success, response = self.run_test(
            "Create Client", "POST", "/clients", 200, client_data
        )
        if success and 'id' in response:
            self.created_ids['client_id'] = response['id']
            return True
        return False

    def test_get_clients(self):
        """Test get all clients"""
        success, response = self.run_test(
            "Get All Clients", "GET", "/clients", 200
        )
        return success and isinstance(response, list)

    def test_get_client_by_id(self):
        """Test get specific client"""
        if not self.created_ids['client_id']:
            return False
        success, response = self.run_test(
            "Get Client by ID", "GET", f"/clients/{self.created_ids['client_id']}", 200
        )
        return success

    def test_update_client(self):
        """Test client update"""
        if not self.created_ids['client_id']:
            return False
        update_data = {"nome": "Updated Client Name", "email": "updated@test.com"}
        success, response = self.run_test(
            "Update Client", "PUT", f"/clients/{self.created_ids['client_id']}", 200, update_data
        )
        return success

    # Service Tests
    def test_create_service(self):
        """Test service creation"""
        service_data = {
            "nome": "Sviluppo Sito Web",
            "tipo": "sito_aziendale",
            "descrizione": "Sviluppo sito web aziendale responsive",
            "prezzo_base": 2500.00,
            "costo_orario": 50.00,
            "is_active": True
        }
        success, response = self.run_test(
            "Create Service", "POST", "/services", 200, service_data
        )
        if success and 'id' in response:
            self.created_ids['service_id'] = response['id']
            return True
        return False

    def test_get_services(self):
        """Test get all services"""
        success, response = self.run_test(
            "Get All Services", "GET", "/services", 200
        )
        return success and isinstance(response, list)

    # Project Tests
    def test_create_project(self):
        """Test project creation"""
        if not self.created_ids['client_id'] or not self.created_ids['service_id']:
            return False
        
        project_data = {
            "nome": "Progetto Test Website",
            "client_id": self.created_ids['client_id'],
            "servizi": [self.created_ids['service_id']],
            "descrizione": "Sviluppo del nuovo sito web aziendale",
            "budget": 3000.00,
            "data_inizio": datetime.now().isoformat(),
            "data_fine_prevista": (datetime.now() + timedelta(days=30)).isoformat(),
            "team_members": [self.created_ids['user_id']] if self.created_ids['user_id'] else []
        }
        success, response = self.run_test(
            "Create Project", "POST", "/projects", 200, project_data
        )
        if success and 'id' in response:
            self.created_ids['project_id'] = response['id']
            return True
        return False

    def test_get_projects(self):
        """Test get all projects"""
        success, response = self.run_test(
            "Get All Projects", "GET", "/projects", 200
        )
        return success and isinstance(response, list)

    def test_update_project_status(self):
        """Test project status update"""
        if not self.created_ids['project_id']:
            return False
        success, response = self.run_test(
            "Update Project Status", "PUT", f"/projects/{self.created_ids['project_id']}/status", 200,
            params={"stato": "in_corso"}
        )
        return success

    # Quote Tests
    def test_create_quote(self):
        """Test quote creation"""
        if not self.created_ids['client_id']:
            return False
        
        quote_data = {
            "titolo": "Preventivo Sito Web",
            "client_id": self.created_ids['client_id'],
            "descrizione": "Preventivo per sviluppo sito web",
            "importo": 2500.00,
            "data_validita": (datetime.now() + timedelta(days=30)).isoformat(),
            "servizi": [self.created_ids['service_id']] if self.created_ids['service_id'] else []
        }
        success, response = self.run_test(
            "Create Quote", "POST", "/quotes", 200, quote_data
        )
        if success and 'id' in response:
            self.created_ids['quote_id'] = response['id']
            return True
        return False

    def test_get_quotes(self):
        """Test get all quotes"""
        success, response = self.run_test(
            "Get All Quotes", "GET", "/quotes", 200
        )
        return success and isinstance(response, list)

    def test_update_quote_status(self):
        """Test quote status update"""
        if not self.created_ids['quote_id']:
            return False
        success, response = self.run_test(
            "Update Quote Status", "PUT", f"/quotes/{self.created_ids['quote_id']}/status", 200,
            params={"stato": "inviato"}
        )
        return success

    # Invoice Tests
    def test_create_invoice(self):
        """Test invoice creation"""
        if not self.created_ids['client_id']:
            return False
        
        invoice_data = {
            "titolo": "Fattura Acconto Sito Web",
            "client_id": self.created_ids['client_id'],
            "project_id": self.created_ids['project_id'],
            "importo": 1000.00,
            "tipo": "acconto",
            "data_scadenza": (datetime.now() + timedelta(days=30)).isoformat(),
            "note": "Acconto 40% per progetto sito web"
        }
        success, response = self.run_test(
            "Create Invoice", "POST", "/invoices", 200, invoice_data
        )
        if success and 'id' in response:
            self.created_ids['invoice_id'] = response['id']
            return True
        return False

    def test_get_invoices(self):
        """Test get all invoices"""
        success, response = self.run_test(
            "Get All Invoices", "GET", "/invoices", 200
        )
        return success and isinstance(response, list)

    def test_update_invoice_status(self):
        """Test invoice status update"""
        if not self.created_ids['invoice_id']:
            return False
        success, response = self.run_test(
            "Update Invoice Status", "PUT", f"/invoices/{self.created_ids['invoice_id']}/status", 200,
            params={"stato": "emessa"}
        )
        return success

    # Deadline Tests
    def test_create_deadline(self):
        """Test deadline creation"""
        if not self.created_ids['client_id']:
            return False
        
        deadline_data = {
            "titolo": "Consegna prototipo sito",
            "descrizione": "Consegnare il prototipo del sito web al cliente",
            "data_scadenza": (datetime.now() + timedelta(days=15)).isoformat(),
            "client_id": self.created_ids['client_id'],
            "project_id": self.created_ids['project_id'],
            "promemoria_giorni": 7
        }
        success, response = self.run_test(
            "Create Deadline", "POST", "/deadlines", 200, deadline_data
        )
        if success and 'id' in response:
            self.created_ids['deadline_id'] = response['id']
            return True
        return False

    def test_get_deadlines(self):
        """Test get all deadlines"""
        success, response = self.run_test(
            "Get All Deadlines", "GET", "/deadlines", 200
        )
        return success and isinstance(response, list)

    # Dashboard Tests
    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        success, response = self.run_test(
            "Get Dashboard Stats", "GET", "/dashboard/stats", 200
        )
        return success and isinstance(response, dict)

    def test_dashboard_projects_in_progress(self):
        """Test dashboard projects in progress"""
        success, response = self.run_test(
            "Get Projects in Progress", "GET", "/dashboard/projects-in-progress", 200
        )
        return success and isinstance(response, list)

    def test_dashboard_revenue_chart(self):
        """Test dashboard revenue chart data"""
        success, response = self.run_test(
            "Get Revenue Chart Data", "GET", "/dashboard/revenue-chart", 200
        )
        return success and isinstance(response, list)

    def test_dashboard_services_distribution(self):
        """Test dashboard services distribution"""
        success, response = self.run_test(
            "Get Services Distribution", "GET", "/dashboard/services-distribution", 200
        )
        return success and isinstance(response, list)

    # Settings Tests
    def test_get_settings(self):
        """Test get settings"""
        success, response = self.run_test(
            "Get Settings", "GET", "/settings", 200
        )
        return success and isinstance(response, dict)

    def test_update_settings(self):
        """Test update settings"""
        settings_data = {
            "agenzia_nome": "Test Agency",
            "agenzia_indirizzo": "Via Test 123, Milano",
            "agenzia_partita_iva": "IT12345678901",
            "costo_orario_default": 60.0,
            "email": {
                "enabled": False,
                "smtp_host": "smtp.example.com",
                "smtp_port": 587,
                "from_email": "noreply@testagency.com"
            }
        }
        success, response = self.run_test(
            "Update Settings", "PUT", "/settings", 200, settings_data
        )
        return success

    def run_all_tests(self):
        """Run all API tests in sequence"""
        print("🚀 Starting AgencyOS API Tests")
        print(f"Base URL: {self.base_url}")
        
        test_methods = [
            # Authentication
            self.test_register_admin,
            self.test_get_me,
            
            # Core Entities
            self.test_create_client,
            self.test_get_clients,
            self.test_get_client_by_id,
            self.test_update_client,
            
            self.test_create_service,
            self.test_get_services,
            
            self.test_create_project,
            self.test_get_projects,
            self.test_update_project_status,
            
            self.test_create_quote,
            self.test_get_quotes,
            self.test_update_quote_status,
            
            self.test_create_invoice,
            self.test_get_invoices,
            self.test_update_invoice_status,
            
            self.test_create_deadline,
            self.test_get_deadlines,
            
            # Dashboard
            self.test_dashboard_stats,
            self.test_dashboard_projects_in_progress,
            self.test_dashboard_revenue_chart,
            self.test_dashboard_services_distribution,
            
            # Settings
            self.test_get_settings,
            self.test_update_settings,
        ]
        
        for test_method in test_methods:
            try:
                test_method()
            except Exception as e:
                print(f"❌ Test {test_method.__name__} failed with exception: {e}")
        
        # Print final results
        print(f"\n📊 Tests completed: {self.tests_passed}/{self.tests_run}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = AgencyOSAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())