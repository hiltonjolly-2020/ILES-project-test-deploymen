from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.core.validators import MinValueValidator, MaxValueValidator

import uuid
from django.utils import timezone
from datetime import timedelta

class Department(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    college = models.CharField(max_length=100, blank=True)
    
    def __str__(self):
        return f"{self.name} ({self.code})"
    
    class Meta:
        ordering = ['name']


class UserManager(BaseUserManager):
    def create_user(self, username, email=None, password=None, **extra_fields):
        """Create and save a regular user"""
        if not username:
            raise ValueError('The Username must be set')
        email = self.normalize_email(email)
        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, username, email=None, password=None, **extra_fields):
        """Create and save a superuser"""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('is_approved', True)
        extra_fields.setdefault('role', 'admin')
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(username, email, password, **extra_fields)


class User(AbstractUser):
    
    ROLE_CHOICES = [
        ('student', 'Student'),
        ('workplace', 'Workplace Supervisor'),
        ('academic', 'Academic Supervisor'),
        ('admin', 'Administrator'),
    ]
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='student')
    student_id = models.CharField(max_length=50, blank=True, null=True)
    staff_id = models.CharField(max_length=50, blank=True, null=True)
    department = models.CharField(max_length=100, blank=True)
    email = models.EmailField(unique=True)
    ACADEMIC_RANK_CHOICES = [
        ('assistant_lecturer', 'Assistant Lecturer'),
        ('lecturer', 'Lecturer'),
        ('senior_lecturer', 'Senior Lecturer'),
        ('associate_professor', 'Associate Professor'),
        ('professor', 'Professor'),
    ]
    
    department_fk = models.ForeignKey(
        Department, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='users'
    )
    academic_rank = models.CharField(
        max_length=30, 
        choices=ACADEMIC_RANK_CHOICES, 
        blank=True, 
        null=True
    )
    company = models.ForeignKey(
        'Company', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='supervisors'
    )
    
    is_approved = models.BooleanField(default=False, help_text="Designates whether the user has been approved by admin")
    
    objects = UserManager()  
    
    groups = models.ManyToManyField(
        'auth.Group',
        related_name='iles_app_user_set',
        blank=True,
        help_text='The groups this user belongs to.',
        verbose_name='groups',
    )
    
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='iles_app_user_set_permissions',
        blank=True,
        help_text='Specific permissions for this user.',
        verbose_name='user permissions',
    )


class Company(models.Model):
    name = models.CharField(max_length=200, unique=True)
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    email = models.CharField(max_length=200, blank=True)
    is_approved = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        'User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_companies'
    )
    approved_by = models.ForeignKey(
        'User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_companies'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.name} {'✓' if self.is_approved else '⏳'}"


class PasswordReset(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    token = models.CharField(max_length=100, unique=True, default=uuid.uuid4)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def is_valid(self):
        return timezone.now() < self.created_at + timedelta(hours=1)


class InternshipPlacement(models.Model):
 
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('completed', 'Completed'),
    ]
    
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='placements')
    company_name = models.CharField(max_length=200)
    workplace_supervisor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='workplace_placements')
    academic_supervisor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='academic_placements')
    
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    created_at = models.DateTimeField(auto_now_add=True)
    log_exception_requested = models.BooleanField(default=False)
    EXCEPTION_REQUEST_CHOICES = [
        ('count_existing', 'Count Existing Only'),
        ('late_submission', 'Request Late Submission'),
    ]
    
    exception_request_type = models.CharField(
        max_length=20,
        choices=EXCEPTION_REQUEST_CHOICES,
        blank=True,
        null=True
    )
    workplace_notified_at = models.DateTimeField(null=True, blank=True)
    workplace_decision_reason = models.TextField(blank=True)
    exception_reason = models.TextField(blank=True)
    exception_status = models.CharField(
        max_length=20,
        choices=[('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected')],
        default='pending'
    )
    exception_approved_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_exceptions'
    )
    exception_approved_at = models.DateTimeField(null=True, blank=True)
    
    def get_academic_supervisor_student_count(self):
        if self.academic_supervisor:
            return InternshipPlacement.objects.filter(
                academic_supervisor=self.academic_supervisor,
                status='approved'
            ).count()
        return 0

    def can_assign_academic_supervisor(self, supervisor):
        if not supervisor:
            return False
        current_count = InternshipPlacement.objects.filter(
            academic_supervisor=supervisor,
            status='approved'
        ).count()
        return current_count < 10
    
    def __str__(self):
        return f"{self.student.username} @ {self.company_name}"


class WeeklyLog(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('reviewed', 'Reviewed'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    placement = models.ForeignKey(InternshipPlacement, on_delete=models.CASCADE, related_name='logs')
    week_number = models.IntegerField()
    
    activities = models.TextField()
    challenges = models.TextField(blank=True)
    working_hours = models.DecimalField(decimal_places=4, max_digits=6, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    submission_date = models.DateTimeField(null=True, blank=True)
    attachment = models.FileField(upload_to='attachments/', blank=True, null=True)
    
    is_late = models.BooleanField(default=False)
    late_reason = models.TextField(blank=True)
    
    feedback = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    score = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(0), MaxValueValidator(100)])
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['placement', 'week_number']
    
    def __str__(self):
        return f"Week {self.week_number} - {self.placement.student.username}"


class Evaluation(models.Model):
  
    placement = models.OneToOneField(InternshipPlacement, on_delete=models.CASCADE, related_name='evaluation')
    
    workplace_score = models.IntegerField(null=True, blank=True)
    academic_score = models.IntegerField(null=True, blank=True)
    
    workplace_comments = models.TextField(blank=True)
    academic_comments = models.TextField(blank=True)
    
    final_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    grade = models.CharField(max_length=2, blank=True)

    workplace_submitted_at = models.DateTimeField(null=True, blank=True)
    academic_submitted_at = models.DateTimeField(null=True, blank=True)
        
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    student_confirmed_view = models.BooleanField(default=False)
    student_confirmed_view_at = models.DateTimeField(null=True, blank=True)
    def __str__(self):
        return f"Evaluation - {self.placement}"
    
    def calculate_final(self):
        if self.workplace_score is not None and self.academic_score is not None:
            placement = self.placement
            
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
            
            self.final_score = (
                (self.workplace_score * 0.4) +
                (self.academic_score * 0.3) +
                (log_avg * 0.3)
            )
            
            self.final_score = round(self.final_score, 2)
            
            if self.final_score >= 80:
                self.grade = 'A'
            elif self.final_score >= 75:
                self.grade = 'B+'
            elif self.final_score >= 70:
                self.grade = 'B'
            elif self.final_score >= 65:
                self.grade = 'C+'
            elif self.final_score >= 60:
                self.grade = 'C'
            elif self.final_score >= 50:
                self.grade = 'D'
            else:
                self.grade = 'F'
            
            self.save()