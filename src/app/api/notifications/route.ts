/**
 * /api/notifications
 * GET — list current user's notification deliveries
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
  const status = url.searchParams.get("status") ?? "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "20", 10)),
  );

  const where: Record<string, unknown> = { userId: session.uid };
  if (status) where.status = status;

  const [total, deliveries] = await Promise.all([
    db.notificationDelivery.count({ where }),
    db.notificationDelivery.findMany({
      where,
      orderBy: { id: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { notification: true },
    }),
  ]);

  // Count unread
  const unreadCount = await db.notificationDelivery.count({
    where: { userId: session.uid, status: "delivered" },
  });

  return NextResponse.json({
    items: deliveries,
    total,
    unreadCount,
    page,
    pageSize,
  });
}
