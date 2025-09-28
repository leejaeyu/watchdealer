"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/auth/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const r = useRouter();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [msg, setMsg] = useState<string>();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(undefined);
    try {
      await login(u, p);
      r.push("/");
    } catch (e: any) {
      setMsg(e.message ?? "로그인 실패");
    }
  };

  return (
    <main style={{ maxWidth: 360, margin: "24px auto", padding: 16 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
        로그인
      </h1>
      <form onSubmit={submit} style={{ display: "grid", gap: 8 }}>
        <input
          className="input"
          placeholder="아이디"
          value={u}
          onChange={(e) => setU(e.target.value)}
        />
        <input
          className="input"
          type="password"
          placeholder="비밀번호"
          value={p}
          onChange={(e) => setP(e.target.value)}
        />
        <button className="btn">로그인</button>
      </form>
      {msg && <pre style={{ color: "tomato", marginTop: 8 }}>{msg}</pre>}
    </main>
  );
}
