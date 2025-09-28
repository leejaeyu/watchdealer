from rest_framework.permissions import BasePermission, SAFE_METHODS

class IsOperator(BasePermission):
    def has_permission(self, req, view):
        return req.user.is_authenticated and getattr(req.user, "role", None) == "operator"

class IsDealer(BasePermission):
    def has_permission(self, req, view):
        return req.user.is_authenticated and getattr(req.user, "role", None) == "dealer"
    
class IsOperatorOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        u = request.user
        return bool(u and u.is_authenticated and getattr(u, "role", "") == "operator")