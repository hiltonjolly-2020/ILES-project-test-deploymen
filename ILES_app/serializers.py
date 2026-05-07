from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from rest_framework import serializers
from datetime import timedelta

from .models import Evaluation, InternshipPlacement, User, WeeklyLog, Department, Company

class UserSerializer(serializers.ModelSerializer):
    department_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 
                  'role', 'student_id', 'staff_id', 'department', 'department_name','is_approved',]
    
    def get_department_name(self, obj):
        if obj.department_fk:
            return obj.department_fk.name
        return obj.department or "Not set"


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['id', 'name', 'code', 'college']


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    
    def validate_email(self, value):
        try:
            user = User.objects.get(email=value)
            return value
        except User.DoesNotExist:
            raise serializers.ValidationError("No user found with this email address")


class ResetPasswordSerializer(serializers.Serializer):
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)
    
    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match"})
        return data                  


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ['id', 'name', 'address', 'phone', 'email', 'is_approved', 'approved_at']
        read_only_fields = ['is_approved', 'approved_at']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    company_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name',
                  'role', 'student_id', 'staff_id', 'department', 'department_fk', 
                  'company', 'company_name']
    
    def validate(self, data):
        role = data.get('role')
        
        if role == 'workplace':
            company = data.get('company')
            if company and hasattr(company, 'id'):
                data['company'] = company.id
            elif company and isinstance(company, dict) and 'id' in company:
                data['company'] = company['id']
        
        if role == 'student' and not data.get('student_id'):
            raise serializers.ValidationError({"student_id": "Please enter student ID"})
        
        if role in ['workplace', 'academic', 'admin'] and not data.get('staff_id'):
            raise serializers.ValidationError({"staff_id": "Please enter staff ID"})
        
        if role == 'workplace':
            company_id = data.get('company')
            company_name = data.get('company_name')
            
            if not company_id and not company_name:
                raise serializers.ValidationError(
                    {"company": "Please select an existing company or enter a new company name"}
                )
        
        if role in ['student', 'academic'] and not data.get('department_fk'):
            raise serializers.ValidationError({"department_fk": "Please select your department"})
        
        if role == 'student' and data.get('student_id'):
            if User.objects.filter(student_id=data['student_id']).exists():
                raise serializers.ValidationError({"student_id": "Student ID already exists"})
        
        if role in ['workplace', 'academic', 'admin'] and data.get('staff_id'):
            if User.objects.filter(staff_id=data['staff_id']).exists():
                raise serializers.ValidationError({"staff_id": "Staff ID already exists"})

        password = data.get("password")
        if password:
            provisional = User(
                username=data.get("username", ""),
                email=data.get("email", ""),
                first_name=data.get("first_name", ""),
                last_name=data.get("last_name", ""),
            )
            try:
                validate_password(password, user=provisional)
            except DjangoValidationError as exc:
                raise serializers.ValidationError({"password": list(exc.messages)})

        return data
       
    def create(self, validated_data):
        role = validated_data.get('role')
        company_id = validated_data.pop('company', None)
        company_name = validated_data.pop('company_name', None)
        
        if company_id and hasattr(company_id, 'id'):
            company_id = company_id.id
        elif company_id and isinstance(company_id, dict) and 'id' in company_id:
            company_id = company_id['id']
        
        user = User.objects.create_user(**validated_data)
        
        if role == 'workplace':
            company = None
            
            if company_id:
                try:
                    company = Company.objects.get(id=company_id)
                    user.company = company
                except Company.DoesNotExist:
                    pass
            
            if not company and company_name:
                company, created = Company.objects.get_or_create(
                    name=company_name,
                    defaults={'created_by': user}
                )
                user.company = company
            
            if company and company.is_approved:
                user.is_approved = True
                user.is_active = True
            else:
                user.is_active = True
                user.is_approved = False
                
        elif role == 'student':
            user.is_active = True
            user.is_approved = True
        
        elif role == 'academic':
            user.is_active = True
            user.is_approved = False
        
        elif role == 'admin':
            user.is_active = True
            user.is_approved = False
        
        user.is_superuser = False
        user.is_staff = False     
        user.save()
        return user


class ApproveStaffSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    approve = serializers.BooleanField()
    
    def validate_user_id(self, value):
        try:
            user = User.objects.get(
                id=value, 
                role__in=['workplace', 'academic', 'admin']
            )
            return value
        except User.DoesNotExist:
            raise serializers.ValidationError("Staff user not found")



class ApplyForPlacementSerializer(serializers.ModelSerializer):
    student_id = serializers.CharField(write_only=True)
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    
    class Meta:
        model = InternshipPlacement
        fields = ['student_id', 'student_name', 'company_name', 
                  'start_date', 'end_date', 'status', 'created_at']
        read_only_fields = ['id', 'status', 'created_at', 'student_name']
    
    def validate_student_id(self, value):
        try:
            student = User.objects.get(student_id=value, role='student')
            return value
        except User.DoesNotExist:
            raise serializers.ValidationError("No student found with this ID. Please register first.")
    
    def validate(self, data):
        if data['start_date'] >= data['end_date']:
            raise serializers.ValidationError("End date must be after start date")
        
        student = User.objects.get(student_id=data['student_id'], role='student')
        existing = InternshipPlacement.objects.filter(
            student=student,
            status__in=['pending', 'approved']
        ).exists() 
        if existing:
            raise serializers.ValidationError("You already have a pending or approved placement")
        return data
    
    def create(self, validated_data):
        student_id = validated_data.pop('student_id')
        student = User.objects.get(student_id=student_id, role='student')
        
        placement = InternshipPlacement.objects.create(
            student=student,
            company_name=validated_data['company_name'],
            start_date=validated_data['start_date'],
            end_date=validated_data['end_date'],
            status='pending'
        )
        return placement


class InternshipPlacementSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    student_id = serializers.CharField(source='student.student_id', read_only=True)
    workplace_supervisor_name = serializers.CharField(source='workplace_supervisor.get_full_name', read_only=True, default=None)
    academic_supervisor_name = serializers.CharField(source='academic_supervisor.get_full_name', read_only=True, default=None)
    
    academic_supervisor_student_count = serializers.SerializerMethodField()
    
    exception_status = serializers.SerializerMethodField()
    exception_reason = serializers.CharField(read_only=True)
    log_exception_requested = serializers.BooleanField(read_only=True)
    exception_request_type = serializers.CharField(read_only=True)  
    
    class Meta:
        model = InternshipPlacement
        fields = ['id', 'student', 'student_id', 'student_name', 'company_name', 
                  'workplace_supervisor', 'workplace_supervisor_name',
                  'academic_supervisor', 'academic_supervisor_name',
                  'academic_supervisor_student_count',
                  'start_date', 'end_date', 'status', 'created_at',
                  'exception_status', 'exception_reason', 'log_exception_requested',
                  'exception_request_type']  
        read_only_fields = ['id', 'student', 'status', 'created_at',
                           'exception_status', 'exception_reason', 'log_exception_requested',
                           'academic_supervisor_student_count', 'exception_request_type']  
    
    def get_exception_status(self, obj):
        return obj.exception_status

    def get_academic_supervisor_student_count(self, obj):
        if obj.academic_supervisor:
            return InternshipPlacement.objects.filter(
                academic_supervisor=obj.academic_supervisor,
                status='approved'
            ).count()
        return 0

class AssignSupervisorsSerializer(serializers.Serializer):
    workplace_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    academic_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    
    def validate_supervisor_id(self, value, role):
        if value is not None:
            try:
                if role == 'workplace':
                    supervisor = User.objects.get(id=value, role=role, is_active=True)
                else:
                    supervisor = User.objects.get(id=value, role=role, is_active=True, is_approved=True)
                return supervisor
            except User.DoesNotExist:
                raise serializers.ValidationError(
                    f"{role.replace('_', ' ').title()} supervisor not found or inactive"
                )
        return None
    
    def validate_workplace_id(self, value):
        return self.validate_supervisor_id(value, 'workplace')
    
    def validate_academic_id(self, value):
        return self.validate_supervisor_id(value, 'academic')
    
    def validate(self, data):
        if not data.get('workplace_id') and not data.get('academic_id'):
            raise serializers.ValidationError("You must assign at least one supervisor")
        
        academic_supervisor = data.get('academic_id')
        placement = self.context.get('placement')
        
        if academic_supervisor and placement:
            student = placement.student
            supervisor_dept = academic_supervisor.department_fk
            student_dept = student.department_fk
            
            if not supervisor_dept or not student_dept:
                raise serializers.ValidationError(
                    "Cannot assign: Student or supervisor does not have a department assigned."
                )
            
            if supervisor_dept.id != student_dept.id:
                raise serializers.ValidationError(
                    f"Cannot assign: Student is from {student_dept.name} but supervisor is from {supervisor_dept.name}. "
                    f"Academic supervisor must be from the same department."
                )
            
            current_count = InternshipPlacement.objects.filter(
                academic_supervisor=academic_supervisor,
                status='approved'
            ).count()
            
            if current_count >= 10:
                raise serializers.ValidationError(
                    f"Cannot assign: {academic_supervisor.get_full_name()} already has {current_count}/10 students. "
                    f"Maximum limit reached."
                )
        
        return data


class WeeklyLogSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='placement.student.get_full_name', read_only=True)
    reviewer_name = serializers.CharField(source='reviewed_by.get_full_name', read_only=True, default=None)
    
    class Meta:
        model = WeeklyLog
        fields = ['id', 'placement', 'student_name', 'week_number', 'working_hours', 'attachment',
                  'activities', 'challenges', 'status', 'submission_date', 'is_late', 'late_reason',
                  'feedback', 'reviewed_by', 'reviewer_name', 'score', 'created_at']
        read_only_fields = ['id', 'submission_date', 'reviewed_by', 'created_at', 'is_late', 'late_reason']


class SubmitLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeeklyLog
        fields = ['placement', 'week_number', 'activities', 'challenges', 'attachment', 'working_hours']
    
    def validate(self, data):
        placement = data['placement']
        week = data['week_number']
        hours = data.get('working_hours', 0)
        
       
        if placement.status != 'approved' and placement.exception_status != 'late_approved':
            raise serializers.ValidationError("Your placement must be approved before submitting logs")
        
        
        total_days = (placement.end_date - placement.start_date).days
        total_weeks = (total_days // 7) + 1 if total_days % 7 > 0 else (total_days // 7)
        if total_weeks < 1:
            total_weeks = 1
        
        if week < 1 or week > total_weeks:
            raise serializers.ValidationError(
                f"Week {week} does not exist. Your internship has only {total_weeks} week(s). "
                f"Valid weeks are 1 to {total_weeks}."
            )
          
        if not placement.workplace_supervisor:
            raise serializers.ValidationError(
                "Cannot submit logs: Workplace supervisor has not been assigned yet. "
                "Please contact the administrator."
            )
        
        if not placement.academic_supervisor:
            raise serializers.ValidationError(
                "Cannot submit logs: Academic supervisor has not been assigned yet. "
                "Please contact the administrator."
            )
        
        if WeeklyLog.objects.filter(placement=placement, week_number=week).exists():
            raise serializers.ValidationError(f"Log for week {week} already exists")
        
        if hours is not None and hours <= 0:
            raise serializers.ValidationError("Working hours must be greater than 0")
        
        return data
    
    def create(self, validated_data):
        placement = validated_data['placement']
        week = validated_data['week_number']
        
        week_start = placement.start_date + timedelta(days=(week-1)*7)
        week_end = week_start + timedelta(days=6)
        is_late = timezone.now().date() > week_end
        
        log = WeeklyLog.objects.create(
            **validated_data,
            status='submitted',
            submission_date=timezone.now(),
            is_late=is_late,
            late_reason=f"Submitted on {timezone.now().date()}, expected by {week_end}" if is_late else ""
        )
        
        if is_late and placement.workplace_supervisor:
            from django.core.mail import send_mail
            from django.conf import settings
            send_mail(
                subject=f' Late Log Submission - Week {week}',
                message=f'Student: {placement.student.get_full_name()}\nCompany: {placement.company_name}\nWeek: {week}\nExpected by: {week_end}\nSubmitted on: {timezone.now().date()}\n\nPlease review at your earliest convenience.',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[placement.workplace_supervisor.email],
                fail_silently=True,
            )
        
        return log


class ReviewLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeeklyLog
        fields = ['status', 'feedback', 'score']
    
    def validate_score(self, value):
        if value and (value < 0 or value > 100):
            raise serializers.ValidationError("Score must be between 0 and 100")
        return value
    
    def validate_status(self, value):
        if value not in ['approved', 'rejected']:
            raise serializers.ValidationError("Status can only be 'approved' or 'rejected'")
        return value


# ==================== EVALUATION SERIALIZERS ====================

class EvaluationSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='placement.student.get_full_name', read_only=True)
    student_id = serializers.CharField(source='placement.student.student_id', read_only=True)
    company_name = serializers.CharField(source='placement.company_name', read_only=True)
    
    class Meta:
        model = Evaluation
        fields = ['placement', 'student_name', 'student_id', 'company_name',
                  'workplace_score', 'academic_score',
                  'workplace_comments', 'academic_comments',
                  'workplace_submitted_at', 'academic_submitted_at',
                  'final_score', 'grade', 'created_at', 'updated_at',
                  'student_confirmed_view', 'student_confirmed_view_at']
        read_only_fields = [
            'id', 'final_score', 'grade',
            'workplace_submitted_at', 'academic_submitted_at',
            'created_at', 'updated_at',
        ]


class WorkplaceEvaluationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Evaluation
        fields = ['workplace_score', 'workplace_comments']
    
    def validate_workplace_score(self, value):
        if value and (value < 0 or value > 100):
            raise serializers.ValidationError("Score must be between 0 and 100")
        return value


class AcademicEvaluationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Evaluation
        fields = ['academic_score', 'academic_comments']
    
    def validate_academic_score(self, value):
        if value and (value < 0 or value > 100):
            raise serializers.ValidationError("Score must be between 0 and 100")
        return value


# ==================== DASHBOARD SERIALIZERS ====================

class StudentDashboardSerializer(serializers.ModelSerializer):
    placement = serializers.SerializerMethodField()
    recent_logs = serializers.SerializerMethodField()
    evaluation = serializers.SerializerMethodField()
    can_request_exception = serializers.SerializerMethodField()
    exception_status = serializers.SerializerMethodField()
    exception_reason = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()
    log_exception_requested = serializers.SerializerMethodField()
    evaluation_history = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['username', 'first_name', 'last_name', 'student_id', 
                  'department', 'department_name', 'placement', 'recent_logs', 'evaluation',
                  'can_request_exception', 'exception_status', 'exception_reason',
                  'log_exception_requested', 'evaluation_history'] 
    
    def get_department_name(self, obj):
        if obj.department_fk:
            return obj.department_fk.name
        return obj.department or "Not set"
    
    def get_placement(self, obj):
        """Get current placement - show active OR completed if late_approved"""
        
        # First try active placement (pending or approved)
        placement = InternshipPlacement.objects.filter(
            student=obj,
            status__in=['pending', 'approved']
        ).order_by('-created_at').first()
        
        # If no active placement, check for completed with late_approved
        if not placement:
            placement = InternshipPlacement.objects.filter(
                student=obj,
                status='completed',
                exception_status='late_approved'
            ).order_by('-created_at').first()
        
        # If still none, get most recent completed
        if not placement:
            placement = InternshipPlacement.objects.filter(
                student=obj,
                status='completed'
            ).order_by('-created_at').first()
        
        if placement:
            return InternshipPlacementSerializer(placement).data
        return None
    
    def get_recent_logs(self, obj):
        """Get logs from current placement (active or late_approved)"""
        
        # First try active placement
        placement = InternshipPlacement.objects.filter(
            student=obj,
            status__in=['pending', 'approved']
        ).first()
        
        # If no active, check for completed with late_approved
        if not placement:
            placement = InternshipPlacement.objects.filter(
                student=obj,
                status='completed',
                exception_status='late_approved'
            ).first()
        
        # If still none, get most recent completed
        if not placement:
            placement = InternshipPlacement.objects.filter(
                student=obj,
                status='completed'
            ).order_by('-created_at').first()
        
        if placement:
            logs = WeeklyLog.objects.filter(placement=placement).order_by('-created_at')[:5]
            return WeeklyLogSerializer(logs, many=True).data
        return []
        
    def get_evaluation(self, obj):
        """Get evaluation for current placement (active or most recent completed)"""
        # First try active placement
        placement = InternshipPlacement.objects.filter(
            student=obj,
            status__in=['pending', 'approved']
        ).order_by('-created_at').first()
        
        # If no active, get most recent completed
        if not placement:
            placement = InternshipPlacement.objects.filter(
                student=obj,
                status='completed'
            ).order_by('-created_at').first()
        
        if not placement:
            return None
        
        evaluation = Evaluation.objects.filter(placement=placement).first()
        if evaluation:
            data = EvaluationSerializer(evaluation).data
            
            total_days = (placement.end_date - placement.start_date).days
            total_weeks = (total_days // 7) + 1 if total_days % 7 > 0 else (total_days // 7)
            if total_weeks < 1:
                total_weeks = 1
                
            submitted_logs = placement.logs.filter(score__isnull=False)
            submitted_weeks = set(submitted_logs.values_list('week_number', flat=True))
            
            if placement.exception_status == 'approved':
                if submitted_logs.exists():
                    total_score = sum([log.score for log in submitted_logs])
                    log_avg = total_score / submitted_logs.count()
                else:
                    log_avg = 0
            else:
                total_score = 0
                for week in range(1, total_weeks + 1):
                    if week in submitted_weeks:
                        log = placement.logs.get(week_number=week)
                        total_score += log.score if log.score else 0
                    else:
                        total_score += 0
                log_avg = total_score / total_weeks if total_weeks > 0 else 0
            
            data['log_avg_score'] = round(log_avg, 2)
            return data
        
        return None
    
    def get_can_request_exception(self, obj):
        """Check if student can request a log exception (ONLY AFTER both evaluations are done)"""
        # Only for completed placements
        placement = InternshipPlacement.objects.filter(
            student=obj,
            status='completed'
        ).order_by('-created_at').first()
        
        if not placement:
            return False
        
        # Don't show if already requested
        if placement.log_exception_requested:
            return False
        
        # Don't show if already processed
        if placement.exception_status in ['approved', 'rejected']:
            return False
        
        # Both evaluations should be done for completed placements
        evaluation = Evaluation.objects.filter(placement=placement).first()
        if not evaluation:
            return False
        
        # Calculate total weeks in internship
        total_days = (placement.end_date - placement.start_date).days
        total_weeks = (total_days // 7) + 1 if total_days >= 0 else 1
        if total_weeks < 1:
            total_weeks = 1
        
        # Check if final week is submitted
        has_final_week = WeeklyLog.objects.filter(
            placement=placement, week_number=total_weeks
        ).exists()
        if not has_final_week:
            return False
        
        # Check if there are missing logs
        submitted_logs = WeeklyLog.objects.filter(placement=placement).count()
        missing_logs = total_weeks - submitted_logs
        
        return missing_logs > 0
    
    def get_exception_status(self, obj):
        """Return exception status ONLY if an exception was actually requested"""
        placement = InternshipPlacement.objects.filter(student=obj).first()
        if placement and placement.log_exception_requested:
            return placement.exception_status
        return None
    
    def get_exception_reason(self, obj):
        placement = InternshipPlacement.objects.filter(student=obj).first()
        if placement and placement.log_exception_requested:
            return placement.exception_reason
        return None
    
    def get_log_exception_requested(self, obj):
        """Return whether an exception was requested"""
        placement = InternshipPlacement.objects.filter(student=obj).first()
        if placement:
            return placement.log_exception_requested
        return False
    
    def get_evaluation_history(self, obj):
        """Get ALL completed placements except the most recent one (for history)"""
        # Get all completed placements
        all_completed = InternshipPlacement.objects.filter(
            student=obj,
            status='completed'
        ).order_by('-end_date')
        
        # Get the most recent placement (will be shown as current)
        most_recent = InternshipPlacement.objects.filter(
            student=obj,
            status__in=['pending', 'approved', 'completed']
        ).order_by('-created_at').first()
        
        # Exclude the most recent from history
        history_placements = all_completed.exclude(id=most_recent.id) if most_recent else all_completed
        
        history = []
        for placement in history_placements:
            evaluation = Evaluation.objects.filter(placement=placement).first()
            history.append({
                'id': placement.id,
                'company_name': placement.company_name,
                'start_date': str(placement.start_date),
                'end_date': str(placement.end_date),
                'workplace_supervisor_name': placement.workplace_supervisor.get_full_name() if placement.workplace_supervisor else None,
                'academic_supervisor_name': placement.academic_supervisor.get_full_name() if placement.academic_supervisor else None,
                'evaluation': {
                    'workplace_score': evaluation.workplace_score if evaluation else None,
                    'academic_score': evaluation.academic_score if evaluation else None,
                    'final_score': evaluation.final_score if evaluation else None,
                    'grade': evaluation.grade if evaluation else None,
                    'student_confirmed_view': evaluation.student_confirmed_view if evaluation else False,
                    'student_confirmed_view_at': evaluation.student_confirmed_view_at if evaluation else None,
                } if evaluation else None,
                'logs': [
                    {
                        'week_number': log.week_number,
                        'status': log.status,
                        'score': log.score,
                        'feedback': log.feedback
                    }
                    for log in placement.logs.filter(score__isnull=False).order_by('week_number')
                ] if evaluation else []
            })
        return history

class SupervisorDashboardSerializer(serializers.ModelSerializer):
    assigned_students = serializers.SerializerMethodField()
    completed_students = serializers.SerializerMethodField()
    pending_reviews = serializers.SerializerMethodField()
    pending_late_requests = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['username', 'first_name', 'last_name', 'staff_id', 
                  'department', 'assigned_students', 'completed_students', 
                  'pending_reviews', 'pending_late_requests']
    
    def get_assigned_students(self, obj):
        """Get active students (approved placements, not evaluated yet)"""
        if obj.role == 'workplace':
            placements = InternshipPlacement.objects.filter(
                workplace_supervisor=obj,
                status='approved'
            )
        elif obj.role == 'academic':
            placements = InternshipPlacement.objects.filter(
                academic_supervisor=obj,
                status='approved'
            )
        else:
            placements = InternshipPlacement.objects.none()
        
        data = []
        for placement in placements:
            evaluation = Evaluation.objects.filter(placement=placement).first()
            
            # Check if evaluation already submitted by this supervisor
            if obj.role == 'workplace':
                evaluation_submitted = evaluation and evaluation.workplace_score is not None
            else:
                evaluation_submitted = evaluation and evaluation.academic_score is not None
            
            # Only include if evaluation NOT submitted yet
            if not evaluation_submitted:
                data.append({
                    'id': placement.id,
                    'student_name': placement.student.get_full_name(),
                    'student_id': placement.student.student_id,
                    'company_name': placement.company_name,
                    'status': placement.status,
                    'start_date': str(placement.start_date),
                    'end_date': str(placement.end_date),
                    'evaluation_submitted': evaluation_submitted,
                })
        
        return data
    
    def get_completed_students(self, obj):
        """Get completed/evaluated students"""
        if obj.role == 'workplace':
            placements = InternshipPlacement.objects.filter(
                workplace_supervisor=obj,
                status='approved'
            )
        elif obj.role == 'academic':
            placements = InternshipPlacement.objects.filter(
                academic_supervisor=obj,
                status='approved'
            )
        else:
            placements = InternshipPlacement.objects.none()
        
        data = []
        for placement in placements:
            evaluation = Evaluation.objects.filter(placement=placement).first()
            
            if obj.role == 'workplace':
                evaluation_submitted = evaluation and evaluation.workplace_score is not None
            else:
                evaluation_submitted = evaluation and evaluation.academic_score is not None
            
            # Only include if evaluation IS submitted
            if evaluation_submitted:
                data.append({
                    'id': placement.id,
                    'student_name': placement.student.get_full_name(),
                    'student_id': placement.student.student_id,
                    'company_name': placement.company_name,
                    'status': placement.status,
                    'start_date': str(placement.start_date),
                    'end_date': str(placement.end_date),
                    'evaluation_submitted': evaluation_submitted,
                    'workplace_score': evaluation.workplace_score if evaluation else None,
                    'academic_score': evaluation.academic_score if evaluation else None,
                    'final_score': evaluation.final_score if evaluation else None,
                    'grade': evaluation.grade if evaluation else None,
                })
        
        return data
    
    def get_pending_reviews(self, obj):
        if obj.role == 'workplace':
            logs = WeeklyLog.objects.filter(
                placement__workplace_supervisor=obj,
                status='submitted'
            )
        elif obj.role == 'academic':
            logs = WeeklyLog.objects.filter(
                placement__academic_supervisor=obj,
                status='submitted'
            )
        else:
            logs = WeeklyLog.objects.none()
        
        return WeeklyLogSerializer(logs, many=True).data
    
    def get_pending_late_requests(self, obj):
        """Get late submission requests pending workplace supervisor decision"""
        if obj.role != 'workplace':
            return []
        
        
        pending_requests = InternshipPlacement.objects.filter(
            workplace_supervisor=obj,
            log_exception_requested=True,
            exception_request_type='late_submission',
            exception_status='workplace_pending'
        )
        
        result = []
        for p in pending_requests:
            # Calculate missing weeks
            total_days = (p.end_date - p.start_date).days
            total_weeks = (total_days // 7) + 1 if total_days % 7 != 0 else (total_days // 7)
            if total_weeks < 1:
                total_weeks = 1
            
            submitted_weeks = set(p.logs.values_list('week_number', flat=True))
            missing_weeks = [w for w in range(1, total_weeks + 1) if w not in submitted_weeks]
            
            result.append({
                'id': p.id,
                'student_name': p.student.get_full_name(),
                'student_id': p.student.student_id,
                'company_name': p.company_name,
                'exception_reason': p.exception_reason,
                'missing_weeks': missing_weeks,
                'submitted_weeks': list(submitted_weeks),
                'requested_at': p.created_at,
                'total_weeks': total_weeks
            })
        
        return result
class AdminDashboardSerializer(serializers.ModelSerializer):
    total_students = serializers.IntegerField(read_only=True)
    total_supervisors = serializers.IntegerField(read_only=True)
    pending_applications = serializers.IntegerField(read_only=True)
    active_internships = serializers.IntegerField(read_only=True)
    pending_exceptions = serializers.IntegerField(read_only=True)
    recent_applications = serializers.SerializerMethodField()
    recent_exceptions = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['username', 'total_students', 'total_supervisors', 
                  'pending_applications', 'active_internships', 
                  'pending_exceptions', 'recent_applications', 'recent_exceptions']
    
    def get_recent_applications(self, obj):
        admin_dept = self.context.get('admin_department')
        
        placements = InternshipPlacement.objects.filter(status='pending')
        
        if admin_dept:
            placements = placements.filter(student__department_fk=admin_dept)
        
        placements = placements.order_by('-created_at')[:10]
        return InternshipPlacementSerializer(placements, many=True).data
    
    def get_recent_exceptions(self, obj):
        admin_dept = self.context.get('admin_department')
        
        exceptions = InternshipPlacement.objects.filter(
            log_exception_requested=True,
            exception_status='pending'
        )
        
        if admin_dept:
            exceptions = exceptions.filter(student__department_fk=admin_dept)
        
        exceptions = exceptions.order_by('-created_at')[:10]
        return InternshipPlacementSerializer(exceptions, many=True).data