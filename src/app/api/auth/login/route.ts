/**
 * POST /api/auth/login
 * Authenticates user, creates session, sets httpOnly cookie.
 * No localStorage — cookie is the single source of truth.
 *
 * Security:
 * - 5 failed attempts → account locked for 1 minute (configurable via LOCKOUT_MS)
 * - Returns remaining attempts and lockout expiry so the UI can show a countdown
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  hashPassword,
  verifyPassword,
  createSession,
  setSessionCookie,
} from "@/lib/auth";
import { audit as auditLog } from "@/lib/audit";

const SESSION_COOKIE = "abw-bos-session";
const SESSION_TTL_HOURS = 24 * 7; // 7 days
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 60 * 1000; // 1 minute

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { username, password, rememberMe } = body as { username?: string; password?: string; rememberMe?: boolean };

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
  }

  const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
  const userAgent = req.headers.get("user-agent") ?? undefined;

  const user = await db.user.findFirst({
    where: { username: { equals: username.toLowerCase() }, deletedAt: null },
  });

  if (!user) {
    await auditLog({
      actorId: username, actorKind: "user", module: "auth",
      entityType: "user", entityId: username, action: "login",
      reason: "user_not_found", source: "ui", sourceIp: ipAddress,
    });
    return NextResponse.json({
      error: "Invalid username or password",
      remainingAttempts: MAX_FAILED_ATTEMPTS,
    }, { status: 401 });
  }

  // Check active lockout
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const msLeft = user.lockedUntil.getTime() - Date.now();
    const secondsLeft = Math.max(1, Math.ceil(msLeft / 1000));
    return NextResponse.json({
      error: `Account is locked. Try again in ${secondsLeft}s.`,
      locked: true,
      lockedUntil: user.lockedUntil.toISOString(),
      secondsLeft,
    }, { status: 423 });
  }

  // If lockout expired, reset counter
  if (user.lockedUntil && user.lockedUntil <= new Date()) {
    await db.user.update({
      where: { id: user.id },
      data: { failedAttempts: 0, lockedUntil: null },
    });
    user.failedAttempts = 0;
    user.lockedUntil = null;
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    const failedAttempts = user.failedAttempts + 1;
    const remainingAttempts = Math.max(0, MAX_FAILED_ATTEMPTS - failedAttempts);
    const willLock = failedAttempts >= MAX_FAILED_ATTEMPTS;
    const lockUntil = willLock ? new Date(Date.now() + LOCKOUT_MS) : null;
    await db.user.update({
      where: { id: user.id },
      data: { failedAttempts, lockedUntil: lockUntil },
    });
    await auditLog({
      actorId: user.id, actorKind: "user", module: "auth",
      entityType: "user", entityId: user.id, action: "login",
      reason: willLock ? "account_locked" : "invalid_password",
      source: "ui", sourceIp: ipAddress,
    });
    return NextResponse.json({
      error: willLock
        ? `Too many failed attempts. Account locked for 1 minute.`
        : `Invalid username or password. ${remainingAttempts} attempt(s) remaining.`,
      remainingAttempts,
      locked: willLock,
      lockedUntil: lockUntil?.toISOString(),
    }, { status: 401 });
  }

  // Reset failed attempts
  await db.user.update({
    where: { id: user.id },
    data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date(), lastLoginIp: ipAddress },
  });

  // Load roles
  const userRoles = await db.userRole.findMany({
    where: { userId: user.id },
    include: { role: true },
  });
  const roleCodes = userRoles.map((ur) => ur.role.code);

  // Create session
  const token = await createSession(
    { id: user.id, username: user.username, displayName: user.displayName, isSuperAdmin: user.isSuperAdmin },
    roleCodes,
    { ipAddress, userAgent },
  );

  await auditLog({
    actorId: user.id, actorKind: "user", module: "auth",
    entityType: "user", entityId: user.id, action: "login",
    source: "ui", sourceIp: ipAddress,
  });

  // Build response — NO token in body (cookie-only auth)
  const response = NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
      roles: roleCodes,
    },
  });

  // Set httpOnly cookie — persistent if "Remember Me" is checked
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: rememberMe ? SESSION_TTL_HOURS * 60 * 60 : 8 * 60 * 60, // 7 days if remember, 8 hours otherwise
  });

  return response;
}

export { hashPassword };
