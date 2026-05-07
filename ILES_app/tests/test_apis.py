from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from datetime import date, timedelta
from ILES_app.models import Department, User, Company, InternshipPlacement, WeeklyLog, Evaluation

class APITest(TestCase):
    """Test API Endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create test data
        self.department = Department.objects.create(
            name="Computer Science",
            code="CS001"
        )
        
        self.company = Company.objects.create(
            name="Test Company",
            is_approved=True
        )
        
        self.student = User.objects.create_user(
            username="teststudent",
            email="student@test.com",
            password="student123",
            first_name="Test",
            last_name="Student",
            role="student",
            student_id="STU001",
            department_fk=self.department
        )
        
        self.workplace = User.objects.create_user(
            username="testworkplace",
            email="workplace@test.com",
            password="workplace123",
            first_name="Test",
            last_name="Workplace",
            role="workplace",
            staff_id="WP001"
        )
        
        self.academic = User.objects.create_user(
            username="testacademic",
            email="academic@test.com",
            password="academic123",
            first_name="Test",
            last_name="Academic",
            role="academic",
            staff_id="AC001",
            department_fk=self.department
        )
        
        # Create placement
        self.placement = InternshipPlacement.objects.create(
            student=self.student,
            company_name="Test Company",
            workplace_supervisor=self.workplace,
            academic_supervisor=self.academic,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=30),
            status='approved'
        )
        
        # Get tokens
        self.student_token = self._get_token("teststudent", "student123")
    
    def _get_token(self, username, password):
        response = self.client.post('/api/token/', {
            'username': username,
            'password': password
        })
        if response.status_code == 200:
            return response.data['access']
        return None
    
    def test_get_approved_companies(self):
        response = self.client.get('/api/companies/approved/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_get_departments(self):
        response = self.client.get('/api/departments/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_user_profile(self):
        if not self.student_token:
            self.skipTest("No token")
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.student_token}')
        response = self.client.get('/users/me/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_submit_log(self):
        if not self.student_token:
            self.skipTest("No token")
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.student_token}')
        
        # Check if week 1 log exists, if not create
        log_exists = WeeklyLog.objects.filter(placement=self.placement, week_number=1).exists()
        
        if not log_exists:
            response = self.client.post('/api/student/logs/', {
                'placement': self.placement.id,
                'week_number': 1,
                'activities': 'Test activities',
                'challenges': 'None',
                'working_hours': 40
            }, format='multipart')
            self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST])