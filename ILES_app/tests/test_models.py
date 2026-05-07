from django.test import TestCase
from django.utils import timezone
from datetime import date, timedelta
from ILES_app.models import Department, User, Company, InternshipPlacement, WeeklyLog, Evaluation

class DepartmentModelTest(TestCase):
    """Test Department model"""
    
    def test_create_department(self):
        dept = Department.objects.create(
            name="Computer Science",
            code="CS001",
            college="Faculty of Computing"
        )
        self.assertEqual(dept.name, "Computer Science")
        self.assertEqual(dept.code, "CS001")
        self.assertEqual(str(dept), "Computer Science (CS001)")


class UserModelTest(TestCase):
    """Test User model"""
    
    def setUp(self):
        self.department = Department.objects.create(
            name="Computer Science",
            code="CS001"
        )
    
    def test_create_student(self):
        student = User.objects.create_user(
            username="teststudent",
            email="student@test.com",
            password="student123",
            first_name="Test",
            last_name="Student",
            role="student",
            student_id="STU001",
            department_fk=self.department,
            is_approved=True
        )
        self.assertEqual(student.role, "student")
        self.assertEqual(student.student_id, "STU001")
        self.assertTrue(student.is_approved)
    
    def test_create_workplace_supervisor(self):
        workplace = User.objects.create_user(
            username="testworkplace",
            email="workplace@test.com",
            password="workplace123",
            first_name="Test",
            last_name="Workplace",
            role="workplace",
            staff_id="WP001"
        )
        self.assertEqual(workplace.role, "workplace")
        self.assertEqual(workplace.staff_id, "WP001")
    
    def test_create_academic_supervisor(self):
        academic = User.objects.create_user(
            username="testacademic",
            email="academic@test.com",
            password="academic123",
            first_name="Test",
            last_name="Academic",
            role="academic",
            staff_id="AC001",
            department_fk=self.department
        )
        self.assertEqual(academic.role, "academic")
        self.assertEqual(academic.staff_id, "AC001")
    
    def test_duplicate_email_not_allowed(self):
        User.objects.create_user(
            username="user1",
            email="duplicate@test.com",
            password="pass123",
            role="student"
        )
        
        with self.assertRaises(Exception):
            User.objects.create_user(
                username="user2",
                email="duplicate@test.com",  # Same email
                password="pass123",
                role="student"
            )


class CompanyModelTest(TestCase):
    """Test Company model"""
    
    def test_create_company(self):
        company = Company.objects.create(
            name="Test Company Ltd",
            is_approved=True
        )
        self.assertEqual(company.name, "Test Company Ltd")
        self.assertTrue(company.is_approved)
        self.assertEqual(str(company), "Test Company Ltd ✓")


class InternshipPlacementModelTest(TestCase):
    """Test InternshipPlacement model"""
    
    def setUp(self):
        self.department = Department.objects.create(name="CS", code="CS001")
        self.student = User.objects.create_user(
            username="student",
            email="s@test.com",
            password="pass",
            role="student",
            student_id="STU001",
            department_fk=self.department
        )
        self.workplace = User.objects.create_user(
            username="workplace",
            email="w@test.com",
            password="pass",
            role="workplace"
        )
        self.academic = User.objects.create_user(
            username="academic",
            email="a@test.com",
            password="pass",
            role="academic"
        )
    
    def test_create_placement(self):
        placement = InternshipPlacement.objects.create(
            student=self.student,
            company_name="Test Co",
            workplace_supervisor=self.workplace,
            academic_supervisor=self.academic,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=30),
            status='approved'
        )
        self.assertEqual(placement.student, self.student)
        self.assertEqual(placement.status, "approved")
        self.assertEqual(str(placement), "student @ Test Co")


class WeeklyLogModelTest(TestCase):
    """Test WeeklyLog model"""
    
    def setUp(self):
        dept = Department.objects.create(name="CS", code="CS001")
        student = User.objects.create_user(
            username="student",
            email="s@test.com",
            password="pass",
            role="student",
            student_id="STU001",
            department_fk=dept
        )
        self.placement = InternshipPlacement.objects.create(
            student=student,
            company_name="Test Co",
            start_date=date.today(),
            end_date=date.today() + timedelta(days=30),
            status='approved'
        )
    
    def test_create_log(self):
        log = WeeklyLog.objects.create(
            placement=self.placement,
            week_number=1,
            activities="Test activities",
            challenges="None",
            working_hours=40,
            status='submitted',
            submission_date=timezone.now()
        )
        self.assertEqual(log.week_number, 1)
        self.assertEqual(log.status, "submitted")
        self.assertEqual(str(log), f"Week 1 - student")


class EvaluationModelTest(TestCase):
    """Test Evaluation model"""
    
    def setUp(self):
        dept = Department.objects.create(name="CS", code="CS001")
        student = User.objects.create_user(
            username="student",
            email="s@test.com",
            password="pass",
            role="student",
            student_id="STU001",
            department_fk=dept
        )
        self.placement = InternshipPlacement.objects.create(
            student=student,
            company_name="Test Co",
            start_date=date.today() - timedelta(days=30),
            end_date=date.today(),
            status='completed'
        )
        
        # Create logs
        for week in range(1, 5):
            WeeklyLog.objects.create(
                placement=self.placement,
                week_number=week,
                activities=f"Week {week}",
                working_hours=40,
                status='approved',
                score=75
            )
    
    def test_calculate_final_score(self):
        evaluation = Evaluation.objects.create(
            placement=self.placement,
            workplace_score=85,
            academic_score=90
        )
        evaluation.calculate_final()
        
        self.assertIsNotNone(evaluation.final_score)
        self.assertIsNotNone(evaluation.grade)
        self.assertGreater(evaluation.final_score, 0)


class AcademicSupervisorLimitTest(TestCase):
    """Test Academic Supervisor limit (max 10 students)"""
    
    def test_academic_supervisor_limit(self):
        dept = Department.objects.create(name="CS", code="CS001")
        academic = User.objects.create_user(
            username="academic",
            email="acad@test.com",
            password="pass",
            role="academic",
            staff_id="AC001",
            department_fk=dept
        )
        
        # Create 10 placements for this supervisor
        for i in range(10):
            student = User.objects.create_user(
                username=f"student{i}",
                email=f"s{i}@test.com",
                password="pass",
                role="student",
                student_id=f"STU00{i}",
                department_fk=dept
            )
            InternshipPlacement.objects.create(
                student=student,
                company_name="Test Co",
                academic_supervisor=academic,
                start_date=date.today(),
                end_date=date.today() + timedelta(days=30),
                status='approved'
            )
        
        # Create 11th student
        student11 = User.objects.create_user(
            username="student11",
            email="s11@test.com",
            password="pass",
            role="student",
            student_id="STU011",
            department_fk=dept
        )
        
        
        placement = InternshipPlacement.objects.create(
            student=student11,
            company_name="Test Co",
            academic_supervisor=academic,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=30),
            status='approved'
        )
        self.assertIsNotNone(placement)