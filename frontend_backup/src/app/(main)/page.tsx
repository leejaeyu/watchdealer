"use client";
import { useAuth } from "@/auth/AuthContext";

export default function Home() {
  const { user, loading, logout } = useAuth();

  if (loading) return <main style={{ padding: 16 }}>로딩중...</main>;

  return (
    <main style={{ maxWidth: 720, margin: "24px auto", padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>메인</h1>

      {!user ? (
        <div style={{ display: "grid", gap: 8 }}>
          <p>로그인이 필요합니다.</p>
          <div style={{ display: "flex", gap: 8 }}>
            <a className="btn" href="/login">
              로그인
            </a>
            <a className="btn" href="/register">
              회원가입
            </a>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          <p>
            <b>{user.username}</b>님 환영합니다. (<b>{user.role}</b>)
          </p>
          <p>이메일: {user.email || "-"}</p>
          <p>스태프: {user.is_staff ? "예" : "아니오"}</p>
          <button onClick={logout} className="btn" style={{ width: 160 }}>
            로그아웃
          </button>
        </div>
      )}
    </main>
  );
}
