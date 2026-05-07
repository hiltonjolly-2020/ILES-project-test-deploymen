from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from datetime import date, timedelta
from ILES_app.models import Department, User, Company, InternshipPlacement, Evaluation

class AuthViewTest(TestCase):
    """Test Authentication Views"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser",
            email="test@test.com",
            password="testpass123",
            first_name="Test",
            last_name="User",
            role="student",
            student_id="STU001"
        )
    
    def test_login_success(self):
        response = self.client.post('/api/token/', {
            'username': 'testuser',
            'password': 'testpass123'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
    
    def test_login_failure(self):
        response = self.client.post('/api/token/', {
            'username': 'testuser',
            'password': 'wrongpassword'
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class DashboardViewTest(TestCase):
    """Test Dashboard Views"""
    
    def setUp(self):
        self.client = APIClient()
        self.department = Department.objects.create(name="CS", code="CS001")
        
        self.student = User.objects.create_user(
            username="student",
            email="s@test.com",
            password="pass123",
            role="student",
            student_id="STU001",
            department_fk=self.department
        )
        
        self.workplace = User.objects.create_user(
            username="workplace",
            email="w@test.com",
            password="pass123",
            role="workplace",
            staff_id="WP001"
        )
        
        self.academic = User.objects.create_user(
            username="academic",
            email="a@test.com",
            password="pass123",
            role="academic",
            staff_id="AC001",
            department_fk=self.department
        )
        
        # Get tokens
        self.student_token = self._get_token("student", "pass123")
        self.workplace_token = self._get_token("workplace", "pass123")
        self.academic_token = self._get_token("academic", "pass123")
    
    def _get_token(self, username, password):
        response = self.client.post('/api/token/', {
            'username': username,
            'password': password
        })
        if response.status_code == 200:
            return response.data['access']
        return None
    
    def test_student_dashboard(self):
        if not self.student_token:
            self.skipTest("No token")
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.student_token}')
        response = self.client.get('/api/student/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_workplace_dashboard(self):
        if not self.workplace_token:
            self.skipTest("No token")
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.workplace_token}')
        response = self.client.get('/api/supervisor/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_academic_dashboard(self):
        if not self.academic_token:
            self.skipTest("No token")
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.academic_token}')
        response = self.client.get('/api/supervisor/academic/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)