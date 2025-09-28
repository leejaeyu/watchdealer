"use client";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { apiLogin, apiLogout, apiRefresh, apiMe } from "@/lib/api";

type Role = "user" | "dealer" | "operator";
type Approval = "approved" | "pending" | "rejected";

type User = {
  username: string;
  email: string;
  role: Role;
  approval_status: Approval;
  is_staff: boolean;
};

type AuthContextType = {
  user: User | null;
  access?: string;
  loading: boolean;
  login: (u: string, p: string) => Promise<void>;
  logout: () => Promise<void>;
  ensureAccess: () => Promise<string | undefined>;
  hasRole: (...roles: Role[]) => boolean;
  isApprovedDealer: () => boolean; // 딜러 + 승인완료
};

const AuthCtx = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [access, setAccess] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const timer = useRef<NodeJS.Timeout | null>(null);

  // 첫 진입: refresh → me
  useEffect(() => {
    (async () => {
      try {
        const { access } = await apiRefresh();
        setAccess(access);
        const me = await apiMe(access);
        setUser(me);
      } catch {
        setUser(null);
        setAccess(undefined);
      } finally {
        setLoading(false);
      }
    })();

    // ACCESS 15분 가정 → 12분마다 rotate
    timer.current = setInterval(async () => {
      try {
        const { access } = await apiRefresh();
        setAccess(access);
      } catch {
        setUser(null);
        setAccess(undefined);
      }
    }, 12 * 60 * 1000);

    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const login = async (u: string, p: string) => {
    const { access } = await apiLogin(u, p);
    setAccess(access);
    const me = await apiMe(access);
    setUser(me);
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
    setAccess(undefined);
  };

  const ensureAccess = async () => {
    if (access) return access;
    try {
      const { access: a } = await apiRefresh();
      setAccess(a);
      return a;
    } catch {
      setUser(null);
      return undefined;
    }
  };

  // 권한 헬퍼
  const hasRole = (...roles: Role[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };
  const isApprovedDealer = () =>
    !!user && user.role === "dealer" && user.approval_status === "approved";

  const value = useMemo(
    () => ({
      user,
      access,
      loading,
      login,
      logout,
      ensureAccess,
      hasRole,
      isApprovedDealer,
    }),
    [user, access, loading]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
