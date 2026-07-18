/** /api/scrum/projects — GET list, POST create */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const items = await db.scrumProject.findMany({
    where: { deletedAt: null },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { tasks: true, sprints: true } } },
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const project = await db.scrumProject.create({
    data: {
      name: body.name, description: body.description ?? null,
      status: body.status ?? "planning", priority: body.priority ?? "medium",
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      budget: body.budget ? Number(body.budget) : null,
      createdBy: session.uid,
    },
  });
  return NextResponse.json({ project }, { status: 201 });
}
