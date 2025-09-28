# backend/accounts/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Roles(models.TextChoices):
        OPERATOR = "operator", "운영자"
        DEALER   = "dealer",   "딜러"
        USER     = "user",     "일반인"

    class Approvals(models.TextChoices):
        PENDING  = "pending",  "승인대기"
        APPROVED = "approved", "승인완료"
        REJECTED = "rejected", "반려"

    role = models.CharField(max_length=16, choices=Roles.choices, default=Roles.USER)

    # 승인 상태(관리 편의상 별도 보관; is_active와 동기화)
    approval_status = models.CharField(
        max_length=16, choices=Approvals.choices, default=Approvals.APPROVED
    )

    def __str__(self):
        return f"{self.username} ({self.role})"



