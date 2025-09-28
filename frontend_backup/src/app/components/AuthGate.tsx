// src/components/AuthGate.tsx
"use client";
import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/auth/AuthContext";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const r = useRouter();
  useEffect(() => {
    if (!loading && !user) r.replace("/login");
  }, [loading, user, r]);
  if (loading) return null; // 스켈레톤/스피너 가능
  if (!user) return null;
  return <>{children}</>;
}

export function RequireRole({
  roles,
  children,
  fallback,
}: {
  roles: Array<"user" | "dealer" | "operator">;
  children: ReactNode;
  fallback?: ReactNode; // 403 화면 등
}) {
  const { user, loading, hasRole } = useAuth();
  if (loading) return null;
  if (!user) return fallback ?? null;
  return hasRole(...roles) ? (
    <>{children}</>
  ) : (
    fallback ?? <div>접근 권한이 없습니다.</div>
  );
}

export function RequireApprovedDealer({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { loading, isApprovedDealer } = useAuth();
  if (loading) return null;
  return isApprovedDealer() ? (
    <>{children}</>
  ) : (
    fallback ?? <div>딜러 승인 대기 중입니다.</div>
  );
}
