from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import Department, User, InternshipPlacement, WeeklyLog, Evaluation
from .models import Company

@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'email']
    search_fields = ['name']

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'college']
    search_fields = ['name', 'code']
    list_filter = ['college']

class UserAdmin(BaseUserAdmin):
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Extra Info', {'fields': ('role', 'student_id', 'staff_id', 'department')}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Extra Info', {'fields': ('role', 'student_id', 'staff_id', 'department')}),
    )

admin.site.register(User, UserAdmin)
admin.site.register(InternshipPlacement)
admin.site.register(WeeklyLog)
admin.site.register(Evaluation)