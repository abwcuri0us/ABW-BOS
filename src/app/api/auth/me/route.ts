/**
 * GET /api/auth/me
 * Returns the current authenticated user, or 401.
 */
import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Refresh role list from DB (in case roles changed since session was issued)
  const userRoles = await db.userRole.findMany({
    where: { userId: session.uid },
    include: { role: true },
  });
  const roleCodes = userRoles.map((ur) => ur.role.code);

  return NextResponse.json({
    user: {
      id: session.uid,
      username: session.username,
      displayName: session.displayName,
      isSuperAdmin: session.isSuperAdmin,
      roles: roleCodes,
    },
  });
}
