"use client";

import * as React from "react";
import { useAuth } from "@/components/auth-provider";
import { LoginScreen } from "@/components/login-screen";
import { AppShell } from "@/components/app-shell";

export function RootApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading ABW-BOS…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <AppShell />;
}
