# accounts/serializers.py
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
import os

User = get_user_model()

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ("username", "password", "email", "role")

    def create(self, validated_data):
        role = validated_data.get("role", User.Roles.USER)
        user = User(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            role=role,
        )
        user.set_password(validated_data["password"])

        # 승인 정책: 운영자/딜러 → 대기, 일반인 → 즉시 승인
        if role in (User.Roles.OPERATOR, User.Roles.DEALER):
            user.approval_status = User.Approvals.PENDING
            user.is_active = False
        else:
            user.approval_status = User.Approvals.APPROVED
            user.is_active = True

        user.save()
        return user
