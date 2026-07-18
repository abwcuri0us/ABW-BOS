"use client";

import { AuthProvider } from "@/components/auth-provider";
import { RootApp } from "@/components/root-app";

export default function Home() {
  return (
    <AuthProvider>
      <RootApp />
    </AuthProvider>
  );
}
