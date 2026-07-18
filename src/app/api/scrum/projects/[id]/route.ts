/** /api/scrum/projects/[id] — GET detail with tasks, DELETE */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  const project = await db.scrumProject.findFirst({
    where: { id, deletedAt: null },
    include: {
      sprints: { orderBy: { startDate: "desc" } },
      tasks: {
        where: { deletedAt: null },
        orderBy: { order: "asc" },
        include: { assignee: true },
      },
    },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ project });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  await db.scrumProject.update({ where: { id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
