/** /api/scrum/tasks/[id] — PUT update, DELETE */
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
  const allowed = ["title", "description", "status", "priority", "type", "storyPoints", "assigneeId", "dueDate", "estimatedHours", "actualHours", "sprintId", "order"];
  const update: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in body) {
      if (["storyPoints", "estimatedHours", "actualHours", "order"].includes(k)) {
        update[k] = body[k] === "" || body[k] === null ? null : Number(body[k]);
      } else if (k === "dueDate") {
        update[k] = body[k] ? new Date(body[k]) : null;
      } else if (k === "assigneeId" || k === "sprintId") {
        update[k] = body[k] || null;
      } else {
        update[k] = body[k];
      }
    }
  }
  if (body.tags) update.tags = JSON.stringify(body.tags);
  const task = await db.task.update({ where: { id }, data: update, include: { assignee: true } });
  return NextResponse.json({ task });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  await db.task.update({ where: { id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
