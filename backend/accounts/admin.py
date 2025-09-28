from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django.contrib.auth import get_user_model

User = get_user_model()

@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    # 필요한 컬럼만 추가
    list_display = ("id", "username", "email", "role", "approval_status", "is_active", "date_joined")
    list_filter = ("role", "approval_status", "is_active")

    # 기존 fieldsets 복사 후 role, approval_status만 추가
    fieldsets = DjangoUserAdmin.fieldsets + (
        ("Roles & Approval", {"fields": ("role", "approval_status")}),
    )

    actions = ["approve_users", "reject_users"]

    @admin.action(description="선택한 사용자 승인")
    def approve_users(self, request, queryset):
        updated = queryset.update(approval_status=User.Approvals.APPROVED, is_active=True)
        self.message_user(request, f"{updated}명 승인 완료")

    @admin.action(description="선택한 사용자 반려")
    def reject_users(self, request, queryset):
        updated = queryset.update(approval_status=User.Approvals.REJECTED, is_active=False)
        self.message_user(request, f"{updated}명 반려 완료")
