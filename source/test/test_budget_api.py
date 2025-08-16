import unittest
import json
from flask import Flask
from source.routes.budget import budget_bp

class BudgetApiTestCase(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.register_blueprint(budget_bp, url_prefix='/api')
        self.client = self.app.test_client()

    def test_allocate_budget_success(self):
        payload = {
            "company_name": "TestCo",
            "monthly_budget": 10000,
            "primary_goal": "leads",
            "constraints": {
                "google_min": 25,
                "meta_min": 20,
                "tiktok_min": 10,
                "linkedin_min": 20
            }
        }
        response = self.client.post('/api/allocate', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn('allocation', data)
        self.assertIn('confidence_intervals', data)
        self.assertIn('explanation', data)

    def test_allocate_budget_missing_fields(self):
        payload = {
            "company_name": "TestCo"
            # missing monthly_budget and primary_goal
        }
        response = self.client.post('/api/allocate', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(response.status_code, 400)
        data = response.get_json()
        self.assertIn('error', data)

if __name__ == '__main__':
    unittest.main()
