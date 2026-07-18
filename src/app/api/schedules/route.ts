/** /api/schedules — GET list, POST create */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const url = new URL(req.url);
  const fromDate = url.searchParams.get("from");
  const toDate = url.searchParams.get("to");
  const where: Record<string, unknown> = { deletedAt: null };
  if (fromDate || toDate) {
    where.startDate = {};
    if (fromDate) (where.startDate as Record<string, unknown>).gte = new Date(fromDate);
    if (toDate) (where.startDate as Record<string, unknown>).lte = new Date(toDate);
  }
  const items = await db.schedule.findMany({ where, orderBy: { startDate: "asc" } });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.title || !body.startDate) return NextResponse.json({ error: "title and startDate required" }, { status: 400 });
  const event = await db.schedule.create({
    data: {
      title: body.title,
      description: body.description ?? null,
      type: body.type ?? "meeting",
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate ?? body.startDate),
      allDay: body.allDay ?? false,
      location: body.location ?? null,
      attendees: JSON.stringify(body.attendees ?? []),
      partyId: body.partyId ?? null,
      status: body.status ?? "scheduled",
      priority: body.priority ?? "medium",
      color: body.color ?? "#1B6D97",
      reminderMinutes: body.reminderMinutes ? Number(body.reminderMinutes) : null,
      notes: body.notes ?? null,
      createdBy: session.uid,
    },
  });
  return NextResponse.json({ event }, { status: 201 });
}
