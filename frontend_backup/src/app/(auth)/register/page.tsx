"use client";

import { useState } from "react";
import { apiRegister } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const r = useRouter();
  const [f, setF] = useState({
    username: "",
    email: "",
    password: "",
    password2: "",
    role: "user" as "user" | "dealer" | "operator",
    invite_code: "",
  });
  const [msg, setMsg] = useState<string>();

  const on = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(undefined);
    try {
      await apiRegister(f);
      setMsg("회원가입 완료! 로그인 페이지로 이동합니다.");
      setTimeout(() => r.push("/login"), 800);
    } catch (e: any) {
      setMsg(e.message);
    }
  };

  return (
    <main style={{ maxWidth: 420, margin: "24px auto", padding: 16 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
        회원가입
      </h1>
      <form onSubmit={submit} style={{ display: "grid", gap: 8 }}>
        <input
          className="input"
          placeholder="아이디"
          value={f.username}
          onChange={on("username")}
        />
        <input
          className="input"
          placeholder="이메일(선택)"
          value={f.email}
          onChange={on("email")}
        />
        <input
          className="input"
          type="password"
          placeholder="비밀번호"
          value={f.password}
          onChange={on("password")}
        />
        <input
          className="input"
          type="password"
          placeholder="비밀번호 확인"
          value={f.password2}
          onChange={on("password2")}
        />
        <select className="input" value={f.role} onChange={on("role")}>
          <option value="user">일반인</option>
          <option value="dealer">딜러</option>
          <option value="operator">운영자</option>
        </select>
        {f.role === "operator" && (
          <input
            className="input"
            placeholder="운영자 초대코드"
            value={f.invite_code}
            onChange={on("invite_code")}
          />
        )}
        <button className="btn">가입하기</button>
      </form>
      {msg && (
        <pre
          style={{
            color: msg.includes("완료") ? "green" : "tomato",
            marginTop: 8,
          }}
        >
          {msg}
        </pre>
      )}
    </main>
  );
}
