from logging import log
from django.db.models import Q
from rest_framework import viewsets,generics, status
from rest_framework import viewsets, generics, status
from django.core.mail import send_mail
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView 
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django.utils import timezone
from .models import *
from .serializers import *
from django.contrib.auth import logout
from django.conf import settings
from datetime import timedelta


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        logout(request)
        return Response({
            'message': 'Logged out successfully',
            'success': True
        })


class IsStudent(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role == 'student'

class IsWorkplace(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role == 'workplace'

class IsAcademic(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role == 'academic'

class IsAdmin(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role == 'admin'

class IsSupervisor(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role in ['workplace', 'academic']


def send_email(to_email, subject, message):
    """Simple email sender"""
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[to_email],
            fail_silently=False,
        )
    except:
        pass

from .models import Department, Company

class DepartmentListView(generics.ListAPIView):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [AllowAny]

class CompanyListView(generics.ListAPIView):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [AllowAny]

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]
    
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def register(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        return Response({
            'user': UserSerializer(request.user).data,
            'role': request.user.role
        })
    
    
    @action(detail=False, methods=['get'], permission_classes=[IsAdmin])
    def pending_staff(self, request):
        users = User.objects.filter(
            role__in=['workplace', 'academic', 'admin'],
            is_approved=False,  
            is_superuser=False
        )
        
        if not request.user.is_superuser and request.user.department_fk:
            users = users.filter(department_fk=request.user.department_fk)
        
        return Response(UserSerializer(users, many=True).data)
        


class ApproveStaffAPIView(APIView):
    permission_classes = [IsAdmin]
    
    def post(self, request):
        if not (request.user.is_superuser or request.user.role == 'admin'):
            return Response({"error": "Only superuser or admin can approve staff"}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = ApproveStaffSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user_id = serializer.validated_data['user_id']
        approve = serializer.validated_data['approve']
        
        try:
            staff_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "Staff user not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Check department permission
        if not request.user.is_superuser and request.user.department_fk:
            if staff_user.department_fk != request.user.department_fk:
                return Response({"error": "You can only approve staff from your own department"}, status=status.HTTP_403_FORBIDDEN)
        
        if approve:
            staff_user.is_approved = True
            staff_user.is_active = True
            staff_user.save()
            
            # Send email notification
            send_email(
                staff_user.email,
                'Account Approved - ILES',
                f'Hello {staff_user.get_full_name() or staff_user.username},\n\nYour account has been approved.\n\nLogin: http://localhost:3000/login\n\nUsername: {staff_user.username}\n\n- ILES Team'
            )
            
            return Response({"message": f"Staff {staff_user.username} approved successfully"}, status=status.HTTP_200_OK)
        else:
            staff_user.delete()
            return Response({"message": f"Staff registration rejected and deleted"}, status=status.HTTP_200_OK)
class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        return Response({
            "message": "Use POST to request password reset",
            "instructions": "Send a POST request with {'email': 'your@email.com'}"
        })
    
    def post(self, request):
        email = request.data.get('email')
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"error": "No account with this email"}, status=404)
        
        PasswordReset.objects.filter(user=user).delete()
        reset = PasswordReset.objects.create(user=user)
        
        reset_link = f"http://localhost:3000/reset-password?token={reset.token}"
        send_mail(
            'Reset Your Password',
            f'Click: {reset_link}',
            'noreply@iles.com',
            [email],
            fail_silently=False,
        )
        
        return Response({"message": "Reset link sent to your email"})


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        token = request.data.get('token')
        new_password = request.data.get('new_password')
        confirm_password = request.data.get('confirm_password')
        
        if new_password != confirm_password:
            return Response({"error": "Passwords don't match"}, status=400)
        
        try:
            reset = PasswordReset.objects.get(token=token)
        except PasswordReset.DoesNotExist:
            return Response({"error": "Invalid token"}, status=400)
        
        if not reset.is_valid():
            return Response({"error": "Token expired"}, status=400)
        
        user = reset.user
        user.set_password(new_password)
        user.save()
        reset.delete()
        
        return Response({"message": "Password reset successful"})


class InternshipPlacementViewSet(viewsets.ModelViewSet):
    queryset = InternshipPlacement.objects.all()
    serializer_class = InternshipPlacementSerializer
    permission_classes = [IsAdmin]
    
    @action(detail=False, methods=['get'], permission_classes=[IsAdmin])
    def pending(self, request):
        placements = InternshipPlacement.objects.filter(status='pending')
        
        if not request.user.is_superuser and request.user.department_fk:
            placements = placements.filter(student__department_fk=request.user.department_fk)
        
        return Response(self.get_serializer(placements, many=True).data)
    
    @action(detail=True, methods=['get', 'post'], permission_classes=[IsAdmin])
    def assign_supervisors(self, request, pk=None):
        placement = self.get_object()
        
        if request.method == 'GET':
            def get_available(role):
                if role == 'workplace':
                    
                    supervisors = User.objects.filter(
                        role=role, 
                        is_active=True,
                        company__name=placement.company_name
                    )
                    return supervisors
                else: 
                    
                    all_academics = User.objects.filter(
                        role=role, 
                        is_active=True,
                        department_fk=placement.student.department_fk  #  ONLY SAME DEPRTMENT
                    )
                    
                    available = []
                    for sup in all_academics:
                        current_count = InternshipPlacement.objects.filter(
                            academic_supervisor=sup,
                            status='approved'
                        ).count()
                        if current_count < 10:
                            available.append(sup)
                    
                    # Exclude current supervisor if already assigned
                    if placement.academic_supervisor:
                        available = [s for s in available if s.id != placement.academic_supervisor.id]
                    
                    return available
            
            return Response({
                'current': {
                    'workplace': placement.workplace_supervisor_id,
                    'academic': placement.academic_supervisor_id
                },
                'available_workplace': [
                    {
                        'id': s.id, 
                        'name': s.get_full_name(), 
                        'company': s.company.name if s.company else 'N/A'
                    } 
                    for s in get_available('workplace')
                ],
                'available_academic': [
                    {'id': s.id, 'name': s.get_full_name()} 
                    for s in get_available('academic')
                ]
            })
        
        serializer = AssignSupervisorsSerializer(
            data=request.data,
            context={'placement': placement}
        )
        serializer.is_valid(raise_exception=True)
        
        workplace_assigned = False
        academic_assigned = False
        
        if serializer.validated_data.get('workplace_id'):
            placement.workplace_supervisor_id = serializer.validated_data['workplace_id']
            workplace_assigned = True
        
        if serializer.validated_data.get('academic_id'):
            placement.academic_supervisor_id = serializer.validated_data['academic_id']
            academic_assigned = True
        
        if workplace_assigned and academic_assigned:
            placement.status = 'approved'
            placement.save()
            
            send_email(
                placement.student.email,
                'Placement Approved - ILES',
                f'Hello {placement.student.get_full_name()},\n\nYour internship placement has been APPROVED!\n\nCompany: {placement.company_name}\nStart: {placement.start_date}\nEnd: {placement.end_date}\n\nYou can now submit your weekly logs.\n\n- ILES Team'
            )
            return Response({"message": "Both supervisors assigned. Placement approved!"})
        else:
            placement.save()
            
            if workplace_assigned and not academic_assigned:
                return Response({
                    "message": "Workplace supervisor assigned. Please also assign an academic supervisor to approve the placement.",
                    "status": "partial"
                })
            elif academic_assigned and not workplace_assigned:
                return Response({
                    "message": "Academic supervisor assigned. Please also assign a workplace supervisor to approve the placement.",
                    "status": "partial"
                })
            else:
                return Response({"message": "No changes made.", "status": "no_change"})


class WeeklyLogViewSet(viewsets.ModelViewSet):
    queryset = WeeklyLog.objects.all()
    serializer_class = WeeklyLogSerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'student':
            return WeeklyLog.objects.filter(placement__student=user)
        elif user.role == 'workplace':
            return WeeklyLog.objects.filter(placement__workplace_supervisor=user)
        elif user.role == 'academic':
            return WeeklyLog.objects.filter(placement__academic_supervisor=user)
        return WeeklyLog.objects.all()
    
    @action(detail=False, methods=['post'], permission_classes=[IsStudent])
    def submit(self, request):
        placement = InternshipPlacement.objects.filter(
            student=request.user, status='approved'
        ).first()
        if not placement:
            return Response({"error": "No approved placement"}, status=400)
        
        serializer = SubmitLogSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(placement=placement)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'], permission_classes=[IsSupervisor])
    def pending(self, request):
        user = request.user
        logs = WeeklyLog.objects.filter(
            status='submitted',
            **{f'placement__{user.role}_supervisor': user}
        )
        return Response(WeeklyLogSerializer(logs, many=True).data)
    
    @action(detail=True, methods=['put'], permission_classes=[IsSupervisor])
    def review(self, request, pk=None):
        log = self.get_object()
        old_status = log.status
        serializer = ReviewLogSerializer(log, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(reviewed_by=request.user, reviewed_at=timezone.now())
        
        if log.status in ['approved', 'rejected'] and old_status != log.status:
            send_email(
                log.placement.student.email,
                f'Week {log.week_number} Log - {log.status.upper()}',
                f'Hello {log.placement.student.get_full_name()},\n\nYour weekly log for Week {log.week_number} has been {log.status}.\n\nScore: {log.score}/100\nFeedback: {log.feedback or "No additional feedback"}\n\n- ILES Team'
            )
        
        return Response({"message": "Log reviewed"})


class EvaluationViewSet(viewsets.ModelViewSet):
    queryset = Evaluation.objects.all()
    serializer_class = EvaluationSerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'student':
            return Evaluation.objects.filter(placement__student=user)
        elif user.role == 'workplace':
            return Evaluation.objects.filter(placement__workplace_supervisor=user)
        elif user.role == 'academic':
            return Evaluation.objects.filter(placement__academic_supervisor=user)
        return Evaluation.objects.all()
    
    @action(detail=False, methods=['post'], permission_classes=[IsWorkplace])
    def workplace(self, request):
        return self._submit_evaluation(request, 'workplace')
    
    @action(detail=False, methods=['post'], permission_classes=[IsAcademic])
    def academic(self, request):
        return self._submit_evaluation(request, 'academic')
    
    def _submit_evaluation(self, request, role):
        placement_id = request.data.get('placement_id')
        placement = get_object_or_404(InternshipPlacement, id=placement_id)
        
        if getattr(placement, f'{role}_supervisor') != request.user:
            return Response({"error": "Not your student"}, status=403)
        
        if role == 'academic':
            total_days = (placement.end_date - placement.start_date).days
           
            total_weeks = (total_days // 7) + 1 if total_days % 7 != 0 else (total_days // 7)
            if total_weeks < 1:
                total_weeks = 1#same 8 days =2wks

           #DAYS LOGIC
            total_weeks = (total_days // 7) + 1 if total_days % 7 != 0 else (total_days // 7)
            if total_weeks < 1:
                total_weeks = 1
            
            
            final_week_log = WeeklyLog.objects.filter(
                placement=placement,
                week_number=total_weeks,
                status='approved'
            ).exists()
            
            if not final_week_log and placement.exception_status != 'approved':
                return Response({
                    "error": f"Cannot evaluate yet. Student must complete and get approval for Week {total_weeks} (final week) log first, OR an admin must approve a log exception."
                }, status=400)
        
        evaluation, _ = Evaluation.objects.get_or_create(placement=placement)
        serializer = WorkplaceEvaluationSerializer if role == 'workplace' else AcademicEvaluationSerializer
        ser = serializer(evaluation, data=request.data)
        ser.is_valid(raise_exception=True)
        ser.save(**{f'{role}_submitted_at': timezone.now()})
        
        evaluation.refresh_from_db()
        if evaluation.workplace_score is not None and evaluation.academic_score is not None:
            evaluation.calculate_final()
            if placement.status != 'completed':
                placement.status = 'completed'
                placement.save()
                print(f"Placement {placement.id} marked as completed")
            
            send_email(
                placement.student.email,
                'Internship Evaluation Complete - ILES',
                f'Hello {placement.student.get_full_name()},\n\n'
                f'Your internship evaluation is complete!\n\n'
                f'Please log in to the dashboard to view your results.\n\n'
                f'- ILES Team'
            )
        
        return Response({"message": f"{role.title()} evaluation submitted"})


class RequestLogExceptionView(APIView):
    permission_classes = [IsStudent]
    
    def post(self, request):
        student = request.user
        placement = InternshipPlacement.objects.filter(student=student).first()
        
        if not placement:
            return Response({"error": "No placement found"}, status=404)
        
        reason = request.data.get('reason')
        request_type = request.data.get('request_type', 'count_existing')
        
        if not reason:
            return Response({"error": "Please provide a reason"}, status=400)
        
        if placement.log_exception_requested:
            return Response({"error": "You have already requested an exception"}, status=400)
        
        total_days = (placement.end_date - placement.start_date).days
        total_weeks = (total_days // 7) + 1 if total_days % 7 != 0 else (total_days // 7)
        if total_weeks < 1:
            total_weeks = 1
        
        has_final_week = WeeklyLog.objects.filter(
            placement=placement, week_number=total_weeks
        ).exists()
        
        if not has_final_week:
            return Response({"error": "You must submit the final week log before requesting an exception"}, status=400)
        
        placement.log_exception_requested = True
        placement.exception_reason = reason
        placement.exception_request_type = request_type
        
        if request_type == 'count_existing':
            placement.exception_status = 'pending'
        else:
            placement.exception_status = 'late_pending'
        
        placement.save()
        
        # Send email to admin (using DEFAULT_FROM_EMAIL)
        send_email(
            settings.DEFAULT_FROM_EMAIL,
            f'[ILES] Exception Request - {student.get_full_name()}',
            f'Student: {student.get_full_name()}\n'
            f'Student ID: {student.student_id or "N/A"}\n'
            f'Request Type: {request_type}\n'
            f'Reason: {reason}\n\n'
            f'Please login to the admin dashboard to review this request.\n'
            f'Admin URL: http://localhost:3000/admin'
        )
        
        return Response({
            "message": f"Exception request submitted successfully. Admin will review your case.",
            "status": placement.exception_status,
            "request_type": request_type
        }, status=status.HTTP_200_OK)

class ApproveCountExistingView(APIView):
    permission_classes = [IsAdmin]
    
    def post(self, request, pk):
        placement = get_object_or_404(InternshipPlacement, id=pk)
        
        if placement.exception_request_type != 'count_existing':
            return Response({"error": "This request is not for count existing"}, status=400)
        
        if placement.exception_status != 'pending':
            return Response({"error": "This request has already been processed"}, status=400)
        
        placement.exception_status = 'approved'
        placement.exception_approved_by = request.user
        placement.exception_approved_at = timezone.now()
        placement.save()
        
        # Recalculate final grade
        evaluation = Evaluation.objects.filter(placement=placement).first()
        if evaluation:
            evaluation.calculate_final()
        
        send_email(
            placement.student.email,
            '[ILES] Exception Request Approved',
            f'Dear {placement.student.get_full_name()},\n\n'
            f'Your request for a log exception has been APPROVED.\n'
            f'Your missing weeks will be ignored.\n'
            f'Your grade has been recalculated.\n\n'
            f'- ILES Team'
        )
        
        return Response({"message": "Count existing request approved. Grade recalculated."})


class NotifyWorkplaceForLateSubmissionView(APIView):
    permission_classes = [IsAdmin]
    
    def post(self, request, pk):
        placement = get_object_or_404(InternshipPlacement, id=pk)
        
        if placement.exception_request_type != 'late_submission':
            return Response({"error": "This request is not for late submission"}, status=400)
        
        if placement.exception_status != 'late_pending':
            return Response({"error": "This request has already been processed"}, status=400)
        
        placement.exception_status = 'workplace_pending'
        placement.workplace_notified_at = timezone.now()
        placement.save()
        
        # Send notification to workplace supervisor
        if placement.workplace_supervisor:
            send_email(
                placement.workplace_supervisor.email,
                f'[ILES] Late Submission Request - {placement.student.get_full_name()}',
                f'Dear {placement.workplace_supervisor.get_full_name()},\n\n'
                f'A student under your supervision has requested to submit missing logs late.\n\n'
                f'Student: {placement.student.get_full_name()}\n'
                f'Company: {placement.company_name}\n'
                f'Reason: {placement.exception_reason}\n\n'
                f'Please login to review and make a decision.\n'
                f'Login: http://localhost:3000/login\n\n'
                f'- ILES Team'
            )
        
        return Response({"message": "Workplace supervisor notified. Waiting for their decision."})


class WorkplaceLateSubmissionDecisionView(APIView):
    permission_classes = [IsWorkplace]
    
    def post(self, request, pk):
        placement = get_object_or_404(InternshipPlacement, id=pk)
        
        if placement.workplace_supervisor != request.user:
            return Response({"error": "Not your student"}, status=403)
        
        if placement.exception_status != 'workplace_pending':
            return Response({"error": "This request is not pending your decision"}, status=400)
        
        decision = request.data.get('decision')  # 'approve' or 'reject'
        reason = request.data.get('reason', '')
        
        if decision not in ['approve', 'reject']:
            return Response({"error": "Invalid decision"}, status=400)
        
        if decision == 'approve':
            placement.exception_status = 'late_approved'
            
        else:
            placement.exception_status = 'late_rejected'
            placement.workplace_decision_reason = reason
        
        placement.workplace_decision_at = timezone.now()
        placement.save()
        
        send_email(
            placement.student.email,
            f'[ILES] Late Submission Request {decision.upper()}',
            f'Dear {placement.student.get_full_name()},\n\n'
            f'Your request for late submission of missing logs has been {decision} by your workplace supervisor.\n'
            f'Reason: {reason if reason else "No reason provided"}\n\n'
            f'- ILES Team'
        )
        
        return Response({"message": f"Late submission {decision}d"})
class PendingExceptionsView(generics.ListAPIView):
    serializer_class = InternshipPlacementSerializer
    permission_classes = [IsAdmin]
    
    def get_queryset(self):
        # Include BOTH 'pending' AND 'late_pending'
        queryset = InternshipPlacement.objects.filter(
            log_exception_requested=True,
            exception_status__in=['pending', 'late_pending']  
        )
        
        if not self.request.user.is_superuser and self.request.user.department_fk:
            queryset = queryset.filter(student__department_fk=self.request.user.department_fk)
        
        return queryset

class ApproveExceptionView(APIView):
    permission_classes = [IsAdmin]
    
    def post(self, request, pk):
        placement = get_object_or_404(InternshipPlacement, id=pk)
        
        if not request.user.is_superuser and request.user.department_fk:
            if placement.student.department_fk != request.user.department_fk:
                return Response({"error": "You can only approve exceptions from your own department"}, status=403)
        
        if placement.exception_status != 'pending':
            return Response({"error": "This request has already been processed"}, status=400)
        
        placement.exception_status = 'approved'
        placement.exception_approved_by = request.user
        placement.exception_approved_at = timezone.now()
        placement.save()
        
        send_email(
            placement.student.email,
            '[ILES] Log Exception Approved',
            f'Dear {placement.student.get_full_name()},\n\n'
            f'Your request for a log exception has been APPROVED.\n'
            f'Reason: {placement.exception_reason}\n\n'
            f'Your final grade will now be calculated based on the logs you submitted.\n\n'
            f'- ILES Team'
        )
        
        return Response({"message": "Exception approved successfully"})


class RejectExceptionView(APIView):
    permission_classes = [IsAdmin]
    
    def post(self, request, pk):
        placement = get_object_or_404(InternshipPlacement, id=pk)
        
        if not request.user.is_superuser and request.user.department_fk:
            if placement.student.department_fk != request.user.department_fk:
                return Response({"error": "You can only reject exceptions from your own department"}, status=403)
        
        if placement.exception_status != 'pending':
            return Response({"error": "This request has already been processed"}, status=400)
        
        placement.exception_status = 'rejected'
        placement.save()
        
        send_email(
            placement.student.email,
            '[ILES] Log Exception Rejected',
            f'Dear {placement.student.get_full_name()},\n\n'
            f'Your request for a log exception has been REJECTED.\n'
            f'Reason: {placement.exception_reason}\n\n'
            f'Please contact your supervisor to resolve missing logs.\n\n'
            f'- ILES Team'
        )
        
        return Response({"message": "Exception rejected"})




class ApplyForPlacementView(generics.CreateAPIView):
    queryset = InternshipPlacement.objects.all()
    serializer_class = ApplyForPlacementSerializer
    permission_classes = [IsStudent]
    
    def get(self, request):
        return Response({
            "message": "Use POST to apply",
            "fields": ["student_id", "company_name", "start_date", "end_date"]
        })

class ConfirmEvaluationViewView(APIView):
    permission_classes = [IsStudent]
    
    def post(self, request):
        student = request.user
        placement_id = request.data.get('placement_id')
        
        if placement_id:
            evaluation = Evaluation.objects.filter(placement_id=placement_id).first()
        else:
            placement = InternshipPlacement.objects.filter(
                student=student,
                status='completed'
            ).order_by('-created_at').first()
            evaluation = Evaluation.objects.filter(placement=placement).first() if placement else None
        
        if evaluation and not evaluation.student_confirmed_view:
            evaluation.student_confirmed_view = True
            evaluation.student_confirmed_view_at = timezone.now()
            evaluation.save()
            return Response({"message": "Evaluation confirmed as viewed", "success": True})
        
        return Response({"message": "Already confirmed or no evaluation found", "success": False}, status=400)
class StudentPlacementStatusView(generics.RetrieveAPIView):
    serializer_class = InternshipPlacementSerializer
    permission_classes = [IsStudent]
    
    def get_object(self):
        placement = InternshipPlacement.objects.filter(
            student=self.request.user
        ).order_by('-created_at').first()
        return placement
    
    def get(self, request):
        placement = self.get_object()
        if not placement:
            return Response({"message": "No placement found"}, status=404)
        return Response(self.get_serializer(placement).data)


class StudentLogsListView(generics.ListCreateAPIView):
    serializer_class = SubmitLogSerializer
    permission_classes = [IsStudent]
    
    def get_queryset(self):
        # Get placement that is approved OR has late_approved exception
        placement = InternshipPlacement.objects.filter(
            student=self.request.user
        ).filter(
            Q(status='approved') | Q(exception_status='late_approved')
        ).first()
        
        if placement:
            return WeeklyLog.objects.filter(placement=placement)
        return WeeklyLog.objects.none()
    
    def get(self, request):
        queryset = self.get_queryset()
        if not queryset.exists():
            return Response({"message": "No logs found", "logs": []})
        return Response(WeeklyLogSerializer(queryset, many=True).data)
    
    def post(self, request):
        # Allow submission if placement approved OR late_approved exception
        placement = InternshipPlacement.objects.filter(
            student=request.user
        ).filter(
            Q(status='approved') | Q(exception_status='late_approved')
        ).first()
        
        if not placement:
            return Response({"error": "No approved placement or late submission approval. Please contact your supervisor."}, status=400)
        
        serializer = SubmitLogSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(placement=placement)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
class StudentDashboardView(generics.RetrieveAPIView):
    serializer_class = StudentDashboardSerializer
    permission_classes = [IsStudent]
    def get_object(self):
        return self.request.user


class SupervisorDashboardView(generics.RetrieveAPIView):
    serializer_class = SupervisorDashboardSerializer
    permission_classes = [IsSupervisor]
    def get_object(self):
        return self.request.user


class AdminDashboardView(generics.RetrieveAPIView):
    serializer_class = AdminDashboardSerializer
    permission_classes = [IsAdmin]
    
    def get_object(self):
        user = self.request.user
        admin_dept = user.department_fk if not user.is_superuser else None
        
        students = User.objects.filter(role='student')
        supervisors = User.objects.filter(role__in=['workplace', 'academic'])
        applications = InternshipPlacement.objects.filter(status='pending')
        internships = InternshipPlacement.objects.filter(status='approved')
        exceptions = InternshipPlacement.objects.filter(
            log_exception_requested=True, 
            exception_status='pending'
        )
        
        if admin_dept:
            students = students.filter(department_fk=admin_dept)
            supervisors = supervisors.filter(department_fk=admin_dept)
            applications = applications.filter(student__department_fk=admin_dept)
            internships = internships.filter(student__department_fk=admin_dept)
            exceptions = exceptions.filter(student__department_fk=admin_dept)
        
        user.total_students = students.count()
        user.total_supervisors = supervisors.count()
        user.pending_applications = applications.count()
        user.active_internships = internships.count()
        user.pending_exceptions = exceptions.count()
        
        self.admin_department = admin_dept
        
        return user
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['admin_department'] = getattr(self, 'admin_department', None)
        return context


class AssignedStudentsView(generics.ListAPIView):
    serializer_class = InternshipPlacementSerializer
    permission_classes = [IsSupervisor]
    def get_queryset(self):
        user = self.request.user
        return InternshipPlacement.objects.filter(
            **{f'{user.role}_supervisor': user},
            status='approved'
        )


class PendingLogsView(generics.ListAPIView):
    serializer_class = WeeklyLogSerializer
    permission_classes = [IsSupervisor]
    def get_queryset(self):
        user = self.request.user
        return WeeklyLog.objects.filter(
            status='submitted',
            **{f'placement__{user.role}_supervisor': user}
        )




class PendingCompaniesView(generics.ListAPIView):
    serializer_class = CompanySerializer
    permission_classes = [IsAdmin]
    
    def get_queryset(self):
        queryset = Company.objects.filter(is_approved=False)
        
        if not self.request.user.is_superuser and self.request.user.department_fk:
            queryset = queryset.filter(created_by__department_fk=self.request.user.department_fk)
        
        return queryset


class ApproveCompanyView(APIView):
    permission_classes = [IsAdmin]
    
    def post(self, request, pk):
        company = get_object_or_404(Company, id=pk)
        
        if not request.user.is_superuser and request.user.department_fk:
            if company.created_by and company.created_by.department_fk != request.user.department_fk:
                return Response({"error": "You can only approve companies from your own department"}, status=403)
        
        if company.is_approved:
            return Response({"error": "Company already approved"}, status=400)
        
        company.is_approved = True
        company.approved_by = request.user
        company.approved_at = timezone.now()
        company.save()
        
        if company.created_by and company.created_by.role == 'workplace':
            user = company.created_by
            user.is_active = True
            user.save()
            
            send_email(
                user.email,
                'Company Approved & Account Activated - ILES',
                f'Hello {user.get_full_name() or user.username},\n\n'
                f'Your company "{company.name}" has been APPROVED!\n\n'
                f'Your account has been activated. You can now login.\n\n'
                f'Login: http://localhost:3000/login\n'
                f'Username: {user.username}\n\n'
                f'- ILES Team'
            )
        
        return Response({"message": f"Company '{company.name}' approved successfully"})


class PartnerCompaniesView(generics.ListAPIView):
    serializer_class = CompanySerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        return Company.objects.filter(is_approved=True).order_by('name')


class RejectCompanyView(APIView):
    permission_classes = [IsAdmin]
    
    def post(self, request, pk):
        company = get_object_or_404(Company, id=pk)
        
        if not request.user.is_superuser and request.user.department_fk:
            if company.created_by and company.created_by.department_fk != request.user.department_fk:
                return Response({"error": "You can only reject companies from your own department"}, status=403)
        
        if company.is_approved:
            return Response({"error": "Company already approved, cannot reject"}, status=400)
        
        rejection_reason = request.data.get('reason', 'No reason provided')
        
        if company.created_by:
            send_email(
                company.created_by.email,
                'Company Registration Rejected - ILES',
                f'Hello {company.created_by.get_full_name() or company.created_by.username},\n\n'
                f'Your company "{company.name}" has been REJECTED.\n\n'
                f'Reason: {rejection_reason}\n\n'
                f'Please contact the administrator for more information.\n\n'
                f'- ILES Team'
            )
        
        company.delete()
        
        return Response({"message": "Company rejected and removed"})
class DepartmentStudentsView(APIView):
    permission_classes = [IsAdmin]
    
    def get(self, request):
        user = request.user
        # Get students in admin's department
        students = User.objects.filter(
            role='student',
            department_fk=user.department_fk
        )
        
        data = []
        for student in students:
            placement = InternshipPlacement.objects.filter(
                student=student,
                status='approved'
            ).first()
            
            data.append({
                'id': student.id,
                'name': f"{student.first_name} {student.last_name}",
                'student_id': student.student_id,
                'email': student.email,
                'company_name': placement.company_name if placement else None,
                'has_active_placement': placement is not None,
                'placement_period': {
                    'start_date': str(placement.start_date) if placement else None,
                    'end_date': str(placement.end_date) if placement else None
                } if placement else None
            })
        
        return Response(data)


class DepartmentSupervisorsView(APIView):
    permission_classes = [IsAdmin]
    
    def get(self, request):
        user = request.user
        
        supervisors = User.objects.filter(
            role__in=['academic', 'workplace'],
            department_fk=user.department_fk
        )
        
        data = []
        for supervisor in supervisors:
            
            if supervisor.role == 'academic':
                assigned_count = InternshipPlacement.objects.filter(
                    academic_supervisor=supervisor,
                    status='approved'
                ).count()
            else:
                assigned_count = InternshipPlacement.objects.filter(
                    workplace_supervisor=supervisor,
                    status='approved'
                ).count()
            
            data.append({
                'id': supervisor.id,
                'name': f"{supervisor.first_name} {supervisor.last_name}",
                'staff_id': supervisor.staff_id,
                'email': supervisor.email,
                'role': supervisor.role,
                'assigned_students_count': assigned_count,
                'is_approved': supervisor.is_approved
            })
        
        return Response(data)
class AcademicDashboardView(generics.RetrieveAPIView):
    permission_classes = [IsAcademic]
    
    def get(self, request):
        user = request.user
        
        # Get assigned students
        placements = InternshipPlacement.objects.filter(
            academic_supervisor=user,
            status='approved'
        )
        
        # Get pending logs
        pending_logs = WeeklyLog.objects.filter(
            placement__academic_supervisor=user,
            status='submitted'
        )
        
        # Get reviewed logs
        reviewed_logs = WeeklyLog.objects.filter(
            placement__academic_supervisor=user,
            status__in=['approved', 'rejected']
        )
        
        return Response({
            'first_name': user.first_name,
            'last_name': user.last_name,
            'department': user.department,
            'staff_id': user.staff_id,
            'assigned_students': [
                {
                    'id': p.id,
                    'student_name': f"{p.student.first_name} {p.student.last_name}",
                    'student_id': p.student.student_id,
                    'company_name': p.company_name,
                    'status': p.status,
                    'start_date': str(p.start_date),
                    'end_date': str(p.end_date),
                }
                for p in placements
            ],
            'pending_logs': [
                {
                    'id': log.id,
                    'student_name': f"{log.placement.student.first_name} {log.placement.student.last_name}",
                    'week_number': log.week_number,
                    'activities': log.activities,
                    'challenges': log.challenges,
                    'working_hours': str(log.working_hours),
                    'status': log.status,
                    'submission_date': str(log.submission_date),
                    'attachment': log.attachment.url if log.attachment else None,
                }
                for log in pending_logs
            ],
            'reviewed_logs': [
                {
                    'id': log.id,
                    'student_name': f"{log.placement.student.first_name} {log.placement.student.last_name}",
                    'week_number': log.week_number,
                    'status': log.status,
                    'score': log.score,
                    'feedback': log.feedback,
                    'reviewed_at': str(log.reviewed_at),
                }
                for log in reviewed_logs
            ]
        }) 