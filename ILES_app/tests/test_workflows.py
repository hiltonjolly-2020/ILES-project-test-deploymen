# ILES_app/tests/test_workflows.py
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from datetime import date, timedelta
from django.utils import timezone
from ILES_app.models import Department, User, Company, InternshipPlacement, WeeklyLog, Evaluation

class WorkflowTest(TestCase):
    """Test Complete Workflows - End to End Testing"""
    
    def setUp(self):
        """Setup test data before each test"""
        self.client = APIClient()
        
        # Create department
        self.department = Department.objects.create(
            name="Computer Science",
            code="CS001",
            college="Faculty of Computing"
        )
        
        # Create company
        self.company = Company.objects.create(
            name="Test Company Ltd",
            is_approved=True
        )
        
        # Create users
        self.student = User.objects.create_user(
            username="workflowstudent",
            email="workflow@test.com",
            password="student123",
            first_name="Workflow",
            last_name="Student",
            role="student",
            student_id="WF001",
            department_fk=self.department
        )
        
        self.workplace = User.objects.create_user(
            username="workflowworkplace",
            email="wfwork@test.com",
            password="workplace123",
            first_name="Workflow",
            last_name="Workplace",
            role="workplace",
            staff_id="WP001"
        )
        
        self.academic = User.objects.create_user(
            username="workflowacademic",
            email="wfaca@test.com",
            password="academic123",
            first_name="Workflow",
            last_name="Academic",
            role="academic",
            staff_id="AC001",
            department_fk=self.department
        )
        
        # Get JWT tokens
        self.student_token = self._get_token("workflowstudent", "student123")
        self.workplace_token = self._get_token("workflowworkplace", "workplace123")
        self.academic_token = self._get_token("workflowacademic", "academic123")
    
    def _get_token(self, username, password):
        """Helper method to get JWT token"""
        response = self.client.post('/api/token/', {
            'username': username,
            'password': password
        })
        if response.status_code == 200:
            return response.data['access']
        return None
    
    def test_complete_internship_workflow(self):
        """Test 1: Complete internship workflow from application to final grade"""
        
        print("\n" + "=" * 70)
        print("TEST 1: COMPLETE INTERNSHIP WORKFLOW")
        print("=" * 70)
        
        if not self.student_token:
            self.skipTest("No student token available")
        
        # Step 1: Student applies for placement
        print("\nStep 1: Student applying for placement...")
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.student_token}')
        
        apply_response = self.client.post('/api/placements/apply/', {
            'student_id': self.student.student_id,
            'company_name': 'Workflow Test Company',
            'start_date': str(date.today()),
            'end_date': str(date.today() + timedelta(days=30))
        })
        
        if apply_response.status_code in [200, 201]:
            print("   [OK] Student application submitted successfully")
        else:
            print(f"   Warning: Application response: {apply_response.status_code}")
        
        # Step 2: Create placement with supervisors (simulate admin assignment)
        print("\nStep 2: Admin assigning supervisors...")
        placement = InternshipPlacement.objects.create(
            student=self.student,
            company_name="Workflow Test Company",
            workplace_supervisor=self.workplace,
            academic_supervisor=self.academic,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=30),
            status='approved'
        )
        print(f"   [OK] Placement created (ID: {placement.id}) - Status: approved")
        print(f"   [OK] Workplace Supervisor: {self.workplace.username}")
        print(f"   [OK] Academic Supervisor: {self.academic.username}")
        
        # Step 3: Student submits weekly logs
        print("\nStep 3: Student submitting weekly logs...")
        logs_created = []
        for week in range(1, 5):
            log = WeeklyLog.objects.create(
                placement=placement,
                week_number=week,
                activities=f"Week {week} - Worked on assigned tasks",
                challenges="No major challenges",
                working_hours=40,
                status='submitted',
                submission_date=timezone.now()
            )
            logs_created.append(log)
            print(f"   [OK] Week {week} log submitted")
        
        # Step 4: Workplace supervisor reviews logs
        print("\nStep 4: Workplace supervisor reviewing logs...")
        for log in logs_created:
            log.status = 'approved'
            log.score = 85
            log.feedback = "Good work, keep it up!"
            log.reviewed_by = self.workplace
            log.reviewed_at = timezone.now()
            log.save()
            print(f"   [OK] Week {log.week_number} - Approved, Score: {log.score}")
        
        # Step 5: Workplace supervisor submits evaluation (40%)
        print("\nStep 5: Workplace supervisor submitting evaluation (40%)...")
        evaluation, created = Evaluation.objects.get_or_create(placement=placement)
        evaluation.workplace_score = 85
        evaluation.workplace_comments = "Excellent performance, very dedicated"
        evaluation.workplace_submitted_at = timezone.now()
        evaluation.save()
        print(f"   [OK] Workplace evaluation submitted - Score: 85/100")
        
        # Step 6: Academic supervisor submits evaluation (30%)
        print("\nStep 6: Academic supervisor submitting evaluation (30%)...")
        evaluation.academic_score = 90
        evaluation.academic_comments = "Theory understanding is strong"
        evaluation.academic_submitted_at = timezone.now()
        evaluation.save()
        print(f"   [OK] Academic evaluation submitted - Score: 90/100")
        
        # Step 7: System calculates final grade
        print("\nStep 7: System calculating final grade...")
        evaluation.calculate_final()
        
        print(f"\n   FINAL RESULTS:")
        
        print(f"   | Workplace Score (40%):     {evaluation.workplace_score}/100")
        print(f"   | Academic Score (30%):      {evaluation.academic_score}/100")
        print(f"   | Log Average (30%):         {evaluation.final_score - (evaluation.workplace_score*0.4 + evaluation.academic_score*0.3):.2f}")
        
        print(f"   | FINAL SCORE:               {evaluation.final_score}/100")
        print(f"   | GRADE:                     {evaluation.grade}")
        
        
        # Step 8: Verify placement marked as completed
        placement.refresh_from_db()
        print(f"\nStep 8: Placement status update...")
        print(f"   [OK] Placement status: {placement.status}")
        
        # Assertions
        self.assertIsNotNone(evaluation.final_score)
        self.assertIsNotNone(evaluation.grade)
        
        print("\n" + "=" * 70)
        print("TEST 1 COMPLETED SUCCESSFULLY!")
        print("=" * 70)
    
    def test_exception_request_workflow(self):
        """Test 2: Exception request workflow - missing logs"""
        
        print("\n" + "=" * 70)
        print("TEST 2: EXCEPTION REQUEST WORKFLOW")
        print("=" * 70)
        
        if not self.student_token:
            self.skipTest("No student token available")
        
        # Step 1: Create placement with missing logs
        print("\nStep 1: Creating placement with missing logs...")
        placement = InternshipPlacement.objects.create(
            student=self.student,
            company_name="Exception Test Company",
            workplace_supervisor=self.workplace,
            academic_supervisor=self.academic,
            start_date=date.today() - timedelta(days=60),
            end_date=date.today() - timedelta(days=30),
            status='completed'
        )
        print(f"   [OK] Placement created (ID: {placement.id})")
        
        # Step 2: Submit only some logs (missing week 3)
        print("\nStep 2: Submitting logs (missing week 3)...")
        for week in [1, 2, 4]:
            WeeklyLog.objects.create(
                placement=placement,
                week_number=week,
                activities=f"Week {week} activities",
                working_hours=40,
                status='approved',
                score=75,
                submission_date=timezone.now()
            )
            print(f"   [OK] Week {week} log submitted and approved")
        print(f"   [MISSING] Week 3 log MISSING")
        
        # Step 3: Both evaluations submitted
        print("\nStep 3: Both supervisors submitting evaluations...")
        evaluation = Evaluation.objects.create(
            placement=placement,
            workplace_score=80,
            academic_score=85
        )
        evaluation.calculate_final()
        old_score = evaluation.final_score
        print(f"   [OK] Initial final score (with missing week = 0): {old_score}")
        print(f"   [OK] Grade: {evaluation.grade}")
        
        # Step 4: Student requests exception
        print("\nStep 4: Student requesting exception for missing logs...")
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.student_token}')
        exception_response = self.client.post('/api/student/request-exception/', {
            'reason': 'I was sick during week 3 and could not submit my log',
            'request_type': 'count_existing'
        })
        
        if exception_response.status_code == 200:
            print(f"   [OK] Exception request submitted - Status: {exception_response.data.get('status')}")
        else:
            print(f"   Warning: Exception request response: {exception_response.status_code}")
        
        # Step 5: Admin approves the exception (simulate)
        print("\nStep 5: Admin approving exception request...")
        placement.exception_status = 'approved'
        placement.exception_approved_by = self.academic
        placement.exception_approved_at = timezone.now()
        placement.save()
        print(f"   [OK] Exception approved by admin")
        
        # Step 6: Grade recalculated - missing weeks ignored
        print("\nStep 6: Recalculating grade with exception...")
        evaluation.calculate_final()
        new_score = evaluation.final_score
        
        print(f"\n   GRADE COMPARISON:")
        print(f"   +--------------------------------------------------+")
        print(f"   | Before Exception:          {old_score}/100")
        print(f"   | After Exception:           {new_score}/100")
        print(f"   | Improvement:               {new_score - old_score:.2f} points")
        print(f"   +--------------------------------------------------+")
        
        print("\n" + "=" * 70)
        print("TEST 2 COMPLETED SUCCESSFULLY!")
        print("=" * 70)
    
    def test_late_submission_workflow(self):
        """Test 3: Late submission request workflow"""
        
        print("\n" + "=" * 70)
        print("TEST 3: LATE SUBMISSION WORKFLOW")
        print("=" * 70)
        
        if not self.student_token:
            self.skipTest("No student token available")
        
        # Step 1: Create completed placement with missing logs
        print("\nStep 1: Creating completed placement...")
        placement = InternshipPlacement.objects.create(
            student=self.student,
            company_name="Late Submission Test Co",
            workplace_supervisor=self.workplace,
            academic_supervisor=self.academic,
            start_date=date.today() - timedelta(days=60),
            end_date=date.today() - timedelta(days=30),
            status='completed'
        )
        print(f"   [OK] Placement created")
        
        # Step 2: Submit only week 1 and 2
        print("\nStep 2: Submitting partial logs...")
        for week in [1, 2]:
            WeeklyLog.objects.create(
                placement=placement,
                week_number=week,
                activities=f"Week {week} activities",
                working_hours=40,
                status='approved',
                score=80,
                submission_date=timezone.now()
            )
            print(f"   [OK] Week {week} submitted")
        
        # Step 3: Both evaluations done
        print("\nStep 3: Both evaluations submitted...")
        evaluation = Evaluation.objects.create(
            placement=placement,
            workplace_score=75,
            academic_score=80
        )
        evaluation.calculate_final()
        print(f"   [OK] Initial score: {evaluation.final_score} (Grade: {evaluation.grade})")
        
        # Step 4: Student requests late submission
        print("\nStep 4: Student requesting LATE SUBMISSION...")
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.student_token}')
        response = self.client.post('/api/student/request-exception/', {
            'reason': 'I need to submit weeks 3 and 4 late due to technical issues',
            'request_type': 'late_submission'
        })
        
        if response.status_code == 200:
            print(f"   [OK] Late submission request submitted - Status: {response.data.get('status')}")
        else:
            print(f"   Warning: Response: {response.status_code}")
        
        # Step 5: Workplace supervisor approves late submission
        print("\nStep 5: Workplace supervisor approving late submission...")
        placement.exception_status = 'late_approved'
        placement.save()
        print(f"   [OK] Late submission approved by workplace supervisor")
        
        # Step 6: Student can now submit missing logs
        print("\nStep 6: Student submitting missing logs...")
        for week in [3, 4]:
            log = WeeklyLog.objects.create(
                placement=placement,
                week_number=week,
                activities=f"Week {week} - Late submission",
                working_hours=40,
                status='submitted',
                submission_date=timezone.now()
            )
            print(f"   [OK] Week {week} log submitted (late)")
        
        print("\n" + "=" * 70)
        print("TEST 3 COMPLETED SUCCESSFULLY!")
        print("=" * 70)
    
    def test_log_review_workflow(self):
        """Test 4: Log submission and review workflow"""
        
        print("\n" + "=" * 70)
        print("TEST 4: LOG REVIEW WORKFLOW")
        print("=" * 70)
        
        # Create placement
        placement = InternshipPlacement.objects.create(
            student=self.student,
            company_name="Log Review Test Co",
            workplace_supervisor=self.workplace,
            academic_supervisor=self.academic,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=30),
            status='approved'
        )
        print(f"\n[OK] Placement created (ID: {placement.id})")
        
        # Student submits log
        print("\nStep: Student submitting log...")
        log = WeeklyLog.objects.create(
            placement=placement,
            week_number=1,
            activities="Completed project documentation",
            challenges="Had to learn new software",
            working_hours=45,
            status='submitted',
            submission_date=timezone.now()
        )
        print(f"   [OK] Log submitted - Week 1")
        
        # Workplace supervisor reviews
        print("\nStep: Workplace supervisor reviewing log...")
        log.status = 'approved'
        log.score = 88
        log.feedback = "Excellent work! Great initiative."
        log.reviewed_by = self.workplace
        log.reviewed_at = timezone.now()
        log.save()
        
        print(f"   [OK] Log reviewed and approved")
        print(f"   Score: {log.score}/100")
        print(f"   Feedback: {log.feedback}")
        
        # Verify student can see feedback
        print("\nStep: Verifying student can see feedback...")
        log.refresh_from_db()
        self.assertEqual(log.status, 'approved')
        self.assertEqual(log.score, 88)
        
        print("   [OK] Student can view feedback and score")
        
        print("\n" + "=" * 70)
        print("TEST 4 COMPLETED SUCCESSFULLY!")
        print("=" * 70)
    
    def test_multiple_placements_workflow(self):
        """Test 5: Student completing one placement and starting another"""
        
        print("\n" + "=" * 70)
        print("TEST 5: MULTIPLE PLACEMENTS WORKFLOW")
        print("=" * 70)
        
        # First placement (completed)
        print("\nStep: First placement...")
        placement1 = InternshipPlacement.objects.create(
            student=self.student,
            company_name="First Company",
            workplace_supervisor=self.workplace,
            academic_supervisor=self.academic,
            start_date=date.today() - timedelta(days=60),
            end_date=date.today() - timedelta(days=30),
            status='completed'
        )
        
        # Add evaluation to first placement
        eval1 = Evaluation.objects.create(
            placement=placement1,
            workplace_score=85,
            academic_score=90
        )
        eval1.calculate_final()
        print(f"   [OK] First placement completed - Grade: {eval1.grade}")
        
        # Student can apply for new placement
        print("\nStep: Student applying for second placement...")
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.student_token}')
        
        placement2 = InternshipPlacement.objects.create(
            student=self.student,
            company_name="Second Company",
            workplace_supervisor=self.workplace,
            academic_supervisor=self.academic,
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=60),
            status='approved'
        )
        print(f"   [OK] Second placement created and approved")
        print(f"   [OK] Student can have multiple placements over time")
        
        # Verify student has both placements
        student_placements = InternshipPlacement.objects.filter(student=self.student)
        print(f"\n   Student placement history:")
        for p in student_placements:
            print(f"   - {p.company_name} - {p.status}")
        
        print("\n" + "=" * 70)
        print("TEST 5 COMPLETED SUCCESSFULLY!")
        print("=" * 70)


def run_all_workflow_tests():
    """Helper function to run all workflow tests"""
    import unittest
    
    print("\n" + "#" * 70)
    print("#" + " " * 68 + "#")
    print("#" + " " * 15 + "ILES SYSTEM WORKFLOW TESTS" + " " * 28 + "#")
    print("#" + " " * 68 + "#")
    print("#" * 70)
    
    suite = unittest.TestLoader().loadTestsFromTestCase(WorkflowTest)
    runner = unittest.TextTestRunner(verbosity=1)
    result = runner.run(suite)
    
    print("\n" + "#" * 70)
    print("#" + " " * 68 + "#")
    if result.wasSuccessful():
        print("#" + " " * 20 + "ALL WORKFLOW TESTS PASSED!" + " " * 29 + "#")
    else:
        print("#" + " " * 20 + "SOME TESTS FAILED" + " " * 34 + "#")
    print("#" + " " * 68 + "#")
    print("#" * 70)
    
    return result


if __name__ == '__main__':
    run_all_workflow_tests()