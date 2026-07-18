/** /api/schedules/[id] — PUT, DELETE */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const allowed = ["title", "description", "type", "startDate", "endDate", "allDay", "location", "status", "priority", "color", "reminderMinutes", "notes"];
  const update: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in body) {
      if (k === "startDate" || k === "endDate") update[k] = body[k] ? new Date(body[k]) : null;
      else if (k === "reminderMinutes") update[k] = body[k] ? Number(body[k]) : null;
      else update[k] = body[k];
    }
  }
  if (body.attendees) update.attendees = JSON.stringify(body.attendees);
  const event = await db.schedule.update({ where: { id }, data: update });
  return NextResponse.json({ event });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  await db.schedule.update({ where: { id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
