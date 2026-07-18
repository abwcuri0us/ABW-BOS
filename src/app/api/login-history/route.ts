/**
 * /api/login-history
 * GET — returns login history from audit log (action=login or action=logout)
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(req.url);
  const limit = Math.min(100, parseInt(url.searchParams.get("limit") ?? "50", 10));

  const items = await db.auditLog.findMany({
    where: {
      action: { in: ["login", "logout"] },
    },
    orderBy: { ts: "desc" },
    take: limit,
    include: {
      user: {
        select: { id: true, displayName: true, username: true },
      },
    },
  });

  return NextResponse.json({ items });
}
