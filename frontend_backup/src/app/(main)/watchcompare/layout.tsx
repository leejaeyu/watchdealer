"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/auth/AuthContext";

export default function OperatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login"); // 미로그인 → 로그인 페이지
    } else if (user.role !== "operator") {
      router.replace("/"); // 운영자 외 사용자 → 홈으로
    }
  }, [loading, user, router]);

  if (loading || !user || user.role !== "operator") {
    return null; // 로딩 중일 때나 권한 없을 때는 아무것도 렌더 안 함
  }

  return <>{children}</>;
}
