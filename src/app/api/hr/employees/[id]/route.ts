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
  const allowed = ["fullName","email","phone","gender","bloodGroup","address","city","state","pincode","emergencyContact","emergencyPhone","department","designation","employmentType","status","basicSalary","bankName","bankAccount","bankIfsc","panNumber","aadhaarNumber","notes"];
  const update: Record<string, unknown> = {};
  for (const k of allowed) { if (k in body) { if (k === "basicSalary") update[k] = Number(body[k]) || 0; else update[k] = body[k] ?? null; } }
  if (body.documents) update.documents = JSON.stringify(body.documents);
  const emp = await db.employee.update({ where: { id }, data: update });
  return NextResponse.json({ employee: emp });
}
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  await db.employee.update({ where: { id }, data: { deletedAt: new Date(), status: "terminated" } });
  return NextResponse.json({ ok: true });
}
