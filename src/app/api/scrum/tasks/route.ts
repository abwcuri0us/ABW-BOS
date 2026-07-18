/** /api/scrum/tasks — GET list, POST create, PATCH bulk update (for board moves) */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId") ?? "";
  const where: Record<string, unknown> = { deletedAt: null };
  if (projectId) where.projectId = projectId;
  const items = await db.task.findMany({
    where,
    orderBy: [{ status: "asc" }, { order: "asc" }],
    include: { assignee: true, project: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.title || !body.projectId) return NextResponse.json({ error: "title and projectId required" }, { status: 400 });

  const count = await db.task.count({ where: { projectId: body.projectId } });
  const task = await db.task.create({
    data: {
      projectId: body.projectId,
      sprintId: body.sprintId ?? null,
      title: body.title,
      description: body.description ?? null,
      status: body.status ?? "todo",
      priority: body.priority ?? "medium",
      type: body.type ?? "task",
      storyPoints: body.storyPoints ? Number(body.storyPoints) : null,
      assigneeId: body.assigneeId ?? null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      estimatedHours: body.estimatedHours ? Number(body.estimatedHours) : null,
      tags: JSON.stringify(body.tags ?? []),
      order: count,
    },
    include: { assignee: true },
  });
  return NextResponse.json({ task }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!Array.isArray(body?.updates)) return NextResponse.json({ error: "updates array required" }, { status: 400 });

  // Bulk update tasks (for board drag-and-drop)
  for (const u of body.updates) {
    if (!u.id) continue;
    const update: Record<string, unknown> = {};
    if (u.status) update.status = u.status;
    if (typeof u.order === "number") update.order = u.order;
    if (u.assigneeId !== undefined) update.assigneeId = u.assigneeId || null;
    if (u.priority) update.priority = u.priority;
    await db.task.update({ where: { id: u.id }, data: update });
  }
  return NextResponse.json({ ok: true });
}
