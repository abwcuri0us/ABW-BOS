/** /api/notes — GET list, POST create */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const where: Record<string, unknown> = { deletedAt: null, isArchived: false };
  if (q) {
    where.OR = [{ title: { contains: q } }, { content: { contains: q } }];
  }
  const items = await db.note.findMany({ where, orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }] });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.title) return NextResponse.json({ error: "title required" }, { status: 400 });
  const note = await db.note.create({
    data: {
      title: body.title,
      content: body.content ?? "",
      notebookId: body.notebookId ?? null,
      tags: JSON.stringify(body.tags ?? []),
      color: body.color ?? "#FFFFFF",
      isPinned: body.isPinned ?? false,
      createdBy: session.uid,
    },
  });
  return NextResponse.json({ note }, { status: 201 });
}
