/** /api/team/[id] — PUT update, DELETE */
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
  const allowed = ["name", "email", "phone", "role", "department", "designation", "avatarColor", "isActive"];
  const update: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) update[k] = body[k];
  if (body.skills) update.skills = JSON.stringify(body.skills);
  const member = await db.teamMember.update({ where: { id }, data: update });
  return NextResponse.json({ member });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  await db.teamMember.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  return NextResponse.json({ ok: true });
}
