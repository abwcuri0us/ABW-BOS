/**
 * ABW-BOS Authentication Library (PostgreSQL + Server-side sessions)
 *
 * - Passwords hashed with bcrypt
 * - Sessions as signed JWTs stored in httpOnly cookies
 * - Session persistence in PostgreSQL via kernel_sessions table
 * - No localStorage — all data stays on the server
 */

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { randomBytes } from "crypto";

const SESSION_COOKIE = "abw-bos-session";
const SESSION_TTL_HOURS = 24 * 7; // 7 days for persistent sessions
const JWT_SECRET = process.env.JWT_SECRET;
const BCRYPT_ROUNDS = 10;

function getJwtSecret(): string {
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("FATAL: JWT_SECRET environment variable must be set to a string of at least 32 characters in production.");
    }
    // Dev-only fallback — never used in production
    return "dev-only-fallback-secret-do-not-use-in-production-xxxxxxxxxxxxx";
  }
  return JWT_SECRET;
}

export interface SessionPayload {
  sid: string;
  uid: string;
  username: string;
  displayName: string;
  isSuperAdmin: boolean;
  roles: string[];
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createSession(
  user: { id: string; username: string; displayName: string; isSuperAdmin: boolean },
  roles: string[],
  meta: { ipAddress?: string; userAgent?: string } = {},
): Promise<string> {
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);
  const sessionToken = randomBytes(32).toString("hex");

  const payload: SessionPayload = {
    sid: sessionToken,
    uid: user.id,
    username: user.username,
    displayName: user.displayName,
    isSuperAdmin: user.isSuperAdmin,
    roles,
  };

  const token = jwt.sign(payload, getJwtSecret(), {
    expiresIn: `${SESSION_TTL_HOURS}h`,
  });

  await db.session.create({
    data: {
      userId: user.id,
      token,
      issuedAt: new Date(),
      expiresAt,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    },
  });

  return token;
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const payload = jwt.verify(token, getJwtSecret()) as SessionPayload;

    const session = await db.session.findUnique({ where: { token } });
    if (!session) return null;
    if (session.revokedAt) return null;
    if (session.expiresAt < new Date()) return null;

    const user = await db.user.findUnique({ where: { id: payload.uid } });
    if (!user || !user.isActive || user.deletedAt) return null;

    return payload;
  } catch {
    return null;
  }
}

export async function getCurrentSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    return verifySession(token);
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string, persistent: boolean = false): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: persistent ? SESSION_TTL_HOURS * 60 * 60 : undefined,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function revokeSession(token: string): Promise<void> {
  await db.session.updateMany({
    where: { token, revokedAt: null },
    data: { revokedAt: new Date(), revokeReason: "logout" },
  });
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
