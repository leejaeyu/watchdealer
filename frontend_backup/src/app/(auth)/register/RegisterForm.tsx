"use client";

import * as React from "react";
import { useState } from "react";
import {
  TextField,
  Button,
  Alert,
  Box,
  Stack,
  Typography,
} from "@mui/material";

type Props = {
  defaultRole: "user" | "dealer";
  title: string;
  subtitle?: string;
};

export default function RegisterForm({ defaultRole, title, subtitle }: Props) {
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setOk(null);
    setErr(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      username: String(fd.get("username") || "").trim(),
      email: String(fd.get("email") || "").trim(),
      password: String(fd.get("password") || ""),
      role: defaultRole, // 고정 주입
    };

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/auth/register/`, // 예: http://127.0.0.1:8000/api
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "include",
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("register error =", data);
        throw new Error(
          data?.detail || data?.message || `가입 실패 (${res.status})`
        );
      }

      // 서버가 approval_status를 내려준다 가정 (원하면 응답에 포함)
      const data = await res.json().catch(() => ({}));
      const status =
        data?.approval_status ??
        (defaultRole === "dealer" ? "pending" : "approved");

      if (status === "approved") {
        setOk("가입이 완료되었습니다. 이제 로그인할 수 있어요!");
      } else {
        setOk(
          "딜러 가입 신청이 접수되었습니다. 운영자 승인 후 로그인할 수 있어요."
        );
      }
    } catch (e: any) {
      setErr(e.message || "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box maxWidth={420} mx="auto" mt={6} px={2}>
      <Stack spacing={2}>
        <Typography variant="h5">{title}</Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}

        {ok && <Alert severity="success">{ok}</Alert>}
        {err && <Alert severity="error">{err}</Alert>}

        <form onSubmit={onSubmit}>
          <Stack spacing={2}>
            <TextField name="username" label="아이디" required fullWidth />
            <TextField name="email" label="이메일" type="email" fullWidth />
            <TextField
              name="password"
              label="비밀번호"
              type="password"
              required
              fullWidth
            />
            {/* role은 hidden으로 고정 */}
            <input type="hidden" name="role" value={defaultRole} />
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              fullWidth
            >
              {loading ? "처리 중..." : "가입하기"}
            </Button>
          </Stack>
        </form>

        {/* UX 안내 */}
        {defaultRole === "dealer" ? (
          <Alert severity="info">
            딜러는 운영자 승인 후 로그인 가능합니다.
          </Alert>
        ) : (
          <Alert severity="success">일반인은 즉시 로그인 가능합니다.</Alert>
        )}
      </Stack>
    </Box>
  );
}
