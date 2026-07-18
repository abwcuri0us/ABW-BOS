/**
 * /api/system-logs
 * GET — returns system activity logs (all audit entries, not just auth)
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(req.url);
  const level = url.searchParams.get("level") ?? ""; // info | warn | error
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(200, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "100", 10)));

  const where: Record<string, unknown> = {};
  if (level === "error") {
    where.action = { in: ["delete"] };
  } else if (level === "warn") {
    where.reason = { not: null };
  }

  const [total, items] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { ts: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { id: true, displayName: true, username: true } },
      },
    }),
  ]);

  return NextResponse.json({
    items, total, page, pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}
