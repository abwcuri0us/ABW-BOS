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
  const allowed = ["fullName","email","phone","gender","address","city","state","pincode","college","degree","branch","year","position","department","duration","stipend","status","performance","evaluationNotes","notes","resumeUrl"];
  const update: Record<string, unknown> = {};
  for (const k of allowed) { if (k in body) { if (k === "stipend") update[k] = Number(body[k]) || 0; else update[k] = body[k] ?? null; } }
  if (body.startDate) update.startDate = new Date(body.startDate);
  if (body.endDate) update.endDate = new Date(body.endDate);
  if (body.documents) update.documents = JSON.stringify(body.documents);
  const intern = await db.intern.update({ where: { id }, data: update });
  return NextResponse.json({ intern });
}
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  await db.intern.update({ where: { id }, data: { deletedAt: new Date(), status: "terminated" } });
  return NextResponse.json({ ok: true });
}
