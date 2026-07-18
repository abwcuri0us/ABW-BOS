"use client";

import * as React from "react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Lock, User, Eye, EyeOff, Shield, Zap, Database, AlertTriangle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const MAX_FAILED_ATTEMPTS = 5;

export function LoginScreen() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [rememberMe, setRememberMe] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = React.useState<number | null>(null);
  const [lockEndsAt, setLockEndsAt] = React.useState<number | null>(null);

  // Restore remembered username on mount
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("abw-remember-user");
      if (saved) {
        setUsername(saved);
        setRememberMe(true);
      }
    } catch { /* ignore */ }
  }, []);

  // Countdown timer for lockout
  const [secondsLeft, setSecondsLeft] = React.useState(0);
  React.useEffect(() => {
    if (!lockEndsAt) return;
    const tick = () => {
      const ms = lockEndsAt - Date.now();
      if (ms <= 0) {
        setSecondsLeft(0);
        setLockEndsAt(null);
        setRemainingAttempts(MAX_FAILED_ATTEMPTS);
        setError(null);
        return;
      }
      setSecondsLeft(Math.ceil(ms / 1000));
    };
    tick();
    const iv = setInterval(tick, 500);
    return () => clearInterval(iv);
  }, [lockEndsAt]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (secondsLeft > 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await login(username.trim(), password, rememberMe);
      if (!result.ok) {
        // Try to parse structured error from the API
        const err: any = (result as any).payload ?? {};
        const message = result.error ?? "Login failed";
        setError(message);

        // Lockout detection (from message)
        if (err.locked || err.lockedUntil) {
          const endsAt = err.lockedUntil ? new Date(err.lockedUntil).getTime() : (Date.now() + 60_000);
          setLockEndsAt(endsAt);
        } else if (/locked|too many failed/i.test(message)) {
          setLockEndsAt(Date.now() + 60_000);
        } else if (typeof err.remainingAttempts === "number") {
          setRemainingAttempts(err.remainingAttempts);
        }

        // Persist or clear remembered username
        try {
          if (rememberMe) localStorage.setItem("abw-remember-user", username.trim());
          else localStorage.removeItem("abw-remember-user");
        } catch { /* ignore */ }

        toast({ title: "Login failed", description: message, variant: "destructive" });
      } else {
        try {
          if (rememberMe) localStorage.setItem("abw-remember-user", username.trim());
          else localStorage.removeItem("abw-remember-user");
        } catch { /* ignore */ }
        toast({ title: `Welcome back, ${username}`, description: "You are now logged in." });
      }
    } finally {
      setSubmitting(false);
    }
  }

  const isLocked = secondsLeft > 0;

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-slate-950">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950" />

      {/* Animated orbs (fast) */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "2.4s" }} />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "3.2s", animationDelay: "0.4s" }} />
      <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "2.8s", animationDelay: "0.8s" }} />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(56, 189, 248, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56, 189, 248, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Fast floating particles */}
      {[...Array(14)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-sky-400/50 rounded-full"
          style={{
            left: `${(i * 37) % 100}%`,
            top: `${(i * 53) % 100}%`,
            animation: `floatFast ${2 + (i % 4) * 0.6}s ease-in-out infinite`,
            animationDelay: `${i * 0.18}s`,
          }}
        />
      ))}

      <style>{`
        @keyframes floatFast {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.35; }
          50% { transform: translateY(-26px) translateX(18px); opacity: 0.95; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes pulseRing {
          0% { transform: scale(0.9); opacity: 0.6; }
          70% { transform: scale(1.4); opacity: 0; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .shimmer-btn {
          background-image: linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%);
          background-size: 200% 100%;
          animation: shimmer 2.4s linear infinite;
        }
      `}</style>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-md space-y-6" style={{ animation: "slideUp 0.45s cubic-bezier(0.16, 1, 0.3, 1)" }}>
        {/* Brand */}
        <div className="text-center space-y-3">
          <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-700 shadow-2xl shadow-sky-500/30">
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-2xl bg-sky-400/40" style={{ animation: "pulseRing 2s ease-out infinite" }} />
            <img src="/abw-logo.svg" alt="ABW-BOS" className="w-16 h-16 relative z-10" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white">
              ABW-BOS
            </h1>
            <p className="text-sm text-sky-200/80 mt-1">
              ABW Business Operating System
            </p>
          </div>
          {/* Feature badges */}
          <div className="flex justify-center gap-4 text-[10px] text-sky-300/60">
            <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Enterprise-grade</span>
            <span className="flex items-center gap-1"><Database className="h-3 w-3" /> Offline-first</span>
            <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> AI-ready</span>
          </div>
        </div>

        {/* Glassmorphism card */}
        <div
          className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl overflow-hidden"
          style={error ? { animation: "shake 0.4s ease-in-out" } : undefined}
        >
          <div className="px-6 pt-6 pb-2">
            <h2 className="text-xl font-semibold text-white">Sign in</h2>
            <p className="text-xs text-sky-200/60 mt-0.5">Enter your credentials to continue</p>
          </div>
          <div className="p-6 pt-2">
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sky-100 text-xs">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sky-300/60" />
                  <Input
                    id="username"
                    type="text"
                    autoComplete="username"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-9 bg-white/5 border-white/20 text-white placeholder:text-sky-200/40 focus:bg-white/10 focus:border-sky-400/50"
                    required
                    autoFocus
                    disabled={isLocked}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sky-100 text-xs">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sky-300/60" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-10 bg-white/5 border-white/20 text-white placeholder:text-sky-200/40 focus:bg-white/10 focus:border-sky-400/50"
                    required
                    disabled={isLocked}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-md text-sky-300/60 hover:text-white hover:bg-white/10 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Remember me + Forgot */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="rememberMe"
                    checked={rememberMe}
                    onCheckedChange={(v) => setRememberMe(v === true)}
                    className="border-white/30 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500"
                  />
                  <Label htmlFor="rememberMe" className="text-xs text-sky-100 cursor-pointer select-none">
                    Remember me
                  </Label>
                </div>
                {remainingAttempts !== null && remainingAttempts > 0 && remainingAttempts < MAX_FAILED_ATTEMPTS && !isLocked && (
                  <span className="text-[10px] text-amber-300/90 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {remainingAttempts} attempt{remainingAttempts === 1 ? "" : "s"} left
                  </span>
                )}
              </div>

              {/* Lockout banner */}
              {isLocked && (
                <div className="flex items-center gap-3 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2.5">
                  <Clock className="h-4 w-4 text-rose-300 flex-shrink-0 animate-pulse" />
                  <div className="text-xs text-rose-100">
                    <div className="font-medium">Account temporarily locked</div>
                    <div className="opacity-80">Try again in <span className="font-mono font-bold tabular-nums">{secondsLeft}s</span></div>
                  </div>
                </div>
              )}

              {/* Error banner */}
              {error && !isLocked && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2.5">
                  <AlertTriangle className="h-4 w-4 text-rose-300 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-rose-100 break-words">{error}</div>
                </div>
              )}

              <Button
                type="submit"
                disabled={submitting || isLocked}
                className="relative w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-lg shadow-sky-500/30 border-0 overflow-hidden disabled:opacity-60"
              >
                {submitting && <span className="absolute inset-0 shimmer-btn pointer-events-none" />}
                <span className="relative flex items-center justify-center">
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {submitting ? "Signing in…" : isLocked ? `Locked (${secondsLeft}s)` : "Sign in"}
                </span>
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-white/10">
              <div className="bg-sky-500/10 border border-sky-400/20 rounded-lg p-3 text-center">
                <p className="text-xs text-sky-200">
                  Default: <span className="font-mono text-sky-100">admin</span> / <span className="font-mono text-sky-100">admin123</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-center text-sky-200/40">
          v1.0.0 · © 2026 ABWcurious · All rights reserved
        </p>
      </div>
    </div>
  );
}
