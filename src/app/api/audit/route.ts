/**
 * /api/audit
 * GET — list audit entries (with filters: ?module=&action=&userId=&q=&page=&pageSize=)
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const url = new URL(req.url);
  const moduleFilter = url.searchParams.get("module") ?? "";
  const action = url.searchParams.get("action") ?? "";
  const userId = url.searchParams.get("userId") ?? "";
  const q = url.searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "50", 10)),
  );

  const where: Record<string, unknown> = {};
  if (moduleFilter) where.module = moduleFilter;
  if (action) where.action = action;
  if (userId) where.userId = userId;
  if (q) {
    where.OR = [
      { entityId: { contains: q } },
      { reason: { contains: q } },
      { diff: { contains: q } },
    ];
  }

  const [total, entries] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { ts: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: {
          select: { id: true, displayName: true, username: true },
        },
      },
    }),
  ]);

  return NextResponse.json({
    items: entries,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}
