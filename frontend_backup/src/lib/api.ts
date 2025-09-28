// src/lib/api.ts
const BASE = process.env.NEXT_PUBLIC_API_BASE!;
if (!BASE) console.warn("NEXT_PUBLIC_API_BASE is not set");

type Json = Record<string, any>;

async function safeJson(res: Response): Promise<Json> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

function pickRegisterPayload(p: {
  username: string;
  email?: string;
  password: string;
  role: "operator" | "dealer" | "user";
}) {
  // 서버에는 필요한 필드만 보냅니다.
  return {
    username: p.username,
    email: p.email ?? "",
    password: p.password,
    role: p.role, // 아래에서 operator는 차단됨
  };
}

export type RegisterResponse = {
  id: number;
  username: string;
  role: "user" | "dealer";
  approval_status: "approved" | "pending" | "rejected";
  detail?: string;
};

export async function apiRegister(p: {
  username: string;
  email?: string;
  password: string;
  password2?: string; // 폼 전용, 서버 전송 X
  role: "operator" | "dealer" | "user";
  invite_code?: string; // 운영자만, 서버 전송 X
}): Promise<RegisterResponse> {
  // 클라 방어: 운영자 직접 가입 금지
  if (p.role === "operator") {
    throw new Error("운영자 계정은 관리자만 생성할 수 있습니다.");
  }
  // 비밀번호 확인(있다면)
  if (p.password2 !== undefined && p.password !== p.password2) {
    throw new Error("비밀번호가 일치하지 않습니다.");
  }

  const body = pickRegisterPayload({
    username: p.username,
    email: p.email,
    password: p.password,
    role: p.role === "dealer" ? "dealer" : "user", // 안전 고정
  });

  const r = await fetch(`${BASE}/auth/register/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });

  const data = await safeJson(r);
  if (!r.ok) {
    throw new Error(
      data?.detail ||
        data?.message ||
        Object.values(data || {})?.[0]?.[0] || // DRF 필드 에러 1건 노출
        "회원가입 실패"
    );
  }
  // 서버가 approval_status/role을 내려준다는 전제(백엔드 예시대로 구현)
  return data as RegisterResponse;
}

// 편의 함수: 화면을 두 개로 나눴을 때 사용
export async function apiRegisterUser(p: {
  username: string;
  email?: string;
  password: string;
  password2?: string;
}) {
  return apiRegister({ ...p, role: "user" });
}
export async function apiRegisterDealer(p: {
  username: string;
  email?: string;
  password: string;
  password2?: string;
}) {
  return apiRegister({ ...p, role: "dealer" });
}

export type MeResponse = {
  username: string;
  email: string;
  role: "user" | "dealer" | "operator";
  approval_status: "approved" | "pending" | "rejected";
  is_staff: boolean;
};

export async function apiLogin(username: string, password: string) {
  const r = await fetch(`${BASE}/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    credentials: "include",
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = data?.detail?.toLowerCase?.().includes("inactive")
      ? "승인 대기 중이거나 비활성화된 계정입니다."
      : data?.detail || "로그인 실패";
    throw new Error(msg);
  }
  // 백엔드가 access + user 일부만 돌려줘도, 곧바로 /me로 전체를 가져옵니다.
  return data as { access: string; user?: any };
}

export async function apiRefresh() {
  const r = await fetch(`${BASE}/auth/refresh/`, {
    method: "POST",
    credentials: "include",
  });
  if (!r.ok) throw new Error("토큰 갱신 실패");
  return (await safeJson(r)) as { access: string };
}

export async function apiMe(access: string) {
  const r = await fetch(`${BASE}/auth/me/`, {
    headers: { Authorization: `Bearer ${access}` },
    credentials: "include",
  });
  if (!r.ok) throw new Error("인증 필요");
  return (await r.json()) as MeResponse;
}

export async function apiLogout() {
  await fetch(`${BASE}/auth/logout/`, {
    method: "POST",
    credentials: "include",
  });
}
