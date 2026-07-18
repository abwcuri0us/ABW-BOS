/**
 * POST /api/auth/logout
 * Revokes session and clears httpOnly cookie.
 */
import { NextResponse } from "next/server";
import { verifySession, revokeSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { cookies } from "next/headers";

const SESSION_COOKIE = "abw-bos-session";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (token) {
      const session = await verifySession(token);
      if (session) {
        await revokeSession(token);
        await audit({
          actorId: session.uid,
          actorKind: "user",
          module: "auth",
          entityType: "user",
          entityId: session.uid,
          action: "logout",
          source: "ui",
        });
      }
    }
  } catch {
    // ignore errors during logout
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
