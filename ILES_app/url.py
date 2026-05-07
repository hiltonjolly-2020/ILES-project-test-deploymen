from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *
from rest_framework_simplejwt.views import ( 

    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)
from .views import (
    PartnerCompaniesView,
    PendingCompaniesView,
    ApproveCompanyView,
    RejectCompanyView,
)

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'placements', InternshipPlacementViewSet)
router.register(r'logs', WeeklyLogViewSet)
router.register(r'evaluations', EvaluationViewSet)

urlpatterns = [
    # SPECIFIC STUDENT URLS FIRST
    path('api/placements/apply/', ApplyForPlacementView.as_view(), name='apply'),
    path('api/student/placement-status/', StudentPlacementStatusView.as_view(), name='placement-status'),
    path('api/student/logs/', StudentLogsListView.as_view(), name='student-logs'),
    
    # DASHBOARDS
    path('api/student/dashboard/', StudentDashboardView.as_view(), name='student-dashboard'),
    path('api/supervisor/dashboard/', SupervisorDashboardView.as_view(), name='supervisor-dashboard'),
    path('api/admin/dashboard/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('api/supervisor/academic/dashboard/', AcademicDashboardView.as_view(), name='academic-dashboard'),
    path('api/student/confirm-evaluation-view/', ConfirmEvaluationViewView.as_view(), name='confirm-evaluation-view'),
    # SUPERVISOR HELPERS
    path('api/supervisor/assigned-students/', AssignedStudentsView.as_view(), name='assigned-students'),
    path('api/supervisor/pending-logs/', PendingLogsView.as_view(), name='pending-logs'),
    
    path('api/departments/', DepartmentListView.as_view(), name='departments'),
    path('api/companies/', CompanyListView.as_view(), name='companies'),
     # Company URLs
    path('api/companies/approved/', PartnerCompaniesView.as_view(), name='partner-companies'),
    path('api/admin/pending-companies/', PendingCompaniesView.as_view(), name='pending-companies'),
    path('api/admin/approve-company/<int:pk>/', ApproveCompanyView.as_view(), name='approve-company'),
    path('api/admin/reject-company/<int:pk>/', RejectCompanyView.as_view(), name='reject-company'),
    # AUTH
    path('api/logout/', LogoutView.as_view(), name='logout'),
    
    # JWT AUTH - These now work because we imported them
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    
    # ROUTER LAST
    path('', include(router.urls)),
    #confirm password
    path('api/token/forgot-password/', ForgotPasswordView.as_view()),
    path('api/token/forgot-password/reset-password/', ResetPasswordView.as_view()),
    # Exception Request URLs
    path('api/student/request-exception/', RequestLogExceptionView.as_view(), name='request-exception'),
    path('api/admin/pending-exceptions/', PendingExceptionsView.as_view(), name='pending-exceptions'),
    path('api/admin/approve-count-existing/<int:pk>/', ApproveCountExistingView.as_view(), name='approve-count-existing'),
    path('api/admin/notify-workplace/<int:pk>/', NotifyWorkplaceForLateSubmissionView.as_view(), name='notify-workplace'),
    path('api/workplace/late-decision/<int:pk>/', WorkplaceLateSubmissionDecisionView.as_view(), name='workplace-late-decision'),
    # Keep old one for backward compatibility
    path('api/admin/approve-exception/<int:pk>/', ApproveExceptionView.as_view(), name='approve-exception'),
    path('api/admin/reject-exception/<int:pk>/', RejectExceptionView.as_view(), name='reject-exception'),
    #admin-dashboard
    path('api/admin/department-students/', DepartmentStudentsView.as_view(), name='department-students'),
    path('api/admin/department-supervisors/', DepartmentSupervisorsView.as_view(), name='department-supervisors'),
    path('api/approve-staff/', ApproveStaffAPIView.as_view(), name='approve-staff'),
]
    




#AUTHENTICATION =
# POST   /api/token/                 - Login
# POST   /api/token/refresh/         - Refresh token
# POST   /api/token/verify/          - Verify token
# POST   /api/logout/                - Logout

#  STUDENT ENDPOINTS 
# GET    /api/student/dashboard/      - Student dashboard
# GET    /api/student/placement-status/ - Check placement status
# GET    /api/student/logs/           - View all logs
# POST   /api/student/logs/           - Submit new log
# POST   /api/placements/apply/       - Apply for internship

# WORKPLACE SUPERVISOR
# GET    /api/supervisor/dashboard/   - Supervisor dashboard
# GET    /api/supervisor/assigned-students/ - View assigned students
# GET    /api/supervisor/pending-logs/ - View pending logs
# GET    /logs/pending/               - Pending logs (router)
# PUT    /logs/{id}/review/           - Review log (id required)
# POST   /api/evaluations/workplace/  - Submit workplace evaluation

#ACADEMIC SUPERVISOR 
# GET    /api/supervisor/dashboard/   - Supervisor dashboard
# GET    /api/supervisor/assigned-students/ - View assigned students
# GET    /api/supervisor/pending-logs/ - View pending logs
# GET    /logs/pending/               - Pending logs (router)
# PUT    /logs/{id}/review/           - Review log (id required)
# POST   /api/evaluations/academic/   - Submit academic evaluation

# ADMIN ENDPOINTS 
# GET    /api/admin/dashboard/        - Admin dashboard
# GET    /users/                      - List all users
# GET    /users/pending_staff/        - List pending staff
# POST   /users/approve_staff/        - Approve staff
# GET    /placements/                 - List all placements
# GET    /placements/pending/         - List pending placements
# GET    /placements/{id}/assign_supervisors/ - Get available supervisors (id required)
# POST   /placements/{id}/assign_supervisors/ - Assign supervisors (id required)

#  ROUTER ENDPOINTS (NO /api/ PREFIX) 
# GET/POST   /users/                  - User management
# GET        /users/me/               - Current user profile
# GET/POST   /users/register/         - Registration
# GET        /users/pending_staff/    - Pending staff list
# POST       /users/approve_staff/    - Approve/reject staff
# GET/POST   /placements/             - Placement management
# GET        /placements/pending/     - Pending placements
# GET/POST   /placements/{id}/assign_supervisors/ - Assign supervisors
# GET/POST   /logs/                   - Log management
# GET        /logs/pending/           - Pending logs
# PUT        /logs/{id}/review/       - Review log
# GET/POST   /evaluations/            - Evaluation management

# USER REGISTRATION 
# POST   /users/register/            
