// frontend/src/store/auth.ts
"use client";
import { create } from "zustand";

type AuthState = {
  access?: string;
  user?: { username: string; email: string };
  setAuth: (access: string, user: AuthState["user"]) => void;
  clear: () => void;
};

export const useAuth = create<AuthState>((set) => ({
  access: undefined,
  user: undefined,
  setAuth: (access, user) => set({ access, user }),
  clear: () => set({ access: undefined, user: undefined }),
}));
