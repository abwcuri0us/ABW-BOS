"use client";

import * as React from "react";

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  isSuperAdmin: boolean;
  roles: string[];
  accessibleModules?: string[];
}

interface LoginErrorPayload {
  remainingAttempts?: number;
  locked?: boolean;
  lockedUntil?: string;
  secondsLeft?: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<{ ok: boolean; error?: string; payload?: LoginErrorPayload }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  canAccess: (moduleId: string) => boolean;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const login = React.useCallback(
    async (username: string, password: string, rememberMe: boolean = false) => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password, rememberMe }),
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          return { ok: true };
        }
        const data = await res.json().catch(() => ({}));
        const payload: LoginErrorPayload = {
          remainingAttempts: typeof data.remainingAttempts === "number" ? data.remainingAttempts : undefined,
          locked: !!data.locked,
          lockedUntil: data.lockedUntil,
          secondsLeft: data.secondsLeft,
        };
        return {
          ok: false,
          error: data.error ?? "Login failed",
          payload,
        };
      } catch (err) {
        return { ok: false, error: "Network error" };
      }
    },
    [],
  );

  const logout = React.useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // ignore
    }
    setUser(null);
  }, []);

  const canAccess = React.useCallback((moduleId: string): boolean => {
    if (!user) return false;
    if (user.isSuperAdmin) return true;
    if (!user.accessibleModules || user.accessibleModules.length === 0) return true;
    return user.accessibleModules.includes(moduleId);
  }, [user]);

  const value = React.useMemo(
    () => ({ user, loading, login, logout, refresh, canAccess }),
    [user, loading, login, logout, refresh, canAccess],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
