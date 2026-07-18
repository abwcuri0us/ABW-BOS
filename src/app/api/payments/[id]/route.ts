/** /api/payments/[id] — GET, PUT, DELETE */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
import { auditFromSession } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  const payment = await db.paymentRecord.findFirst({ where: { id, deletedAt: null } });
  if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ payment });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const existing = await db.paymentRecord.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allowed = ["type", "partyName", "partyId", "currencyCode", "paymentMode", "referenceNumber", "invoiceNumber", "invoiceId", "billNumber", "billId", "status", "notes"];
  const update: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in body) update[k] = body[k] ?? null;
  }
  if (typeof body.amount === "number") update.amount = body.amount;
  if (body.paymentDate) update.paymentDate = new Date(body.paymentDate);

  const payment = await db.paymentRecord.update({ where: { id }, data: update });
  await auditFromSession(session, { module: "payments", entityType: "payment", entityId: id, action: "update", beforeState: existing, afterState: payment });
  return NextResponse.json({ payment });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  const existing = await db.paymentRecord.findFirst({ where: { id } }).catch(() => null);
  await db.paymentRecord.update({ where: { id }, data: { deletedAt: new Date() } });
  await auditFromSession(session, { module: "payments", entityType: "payment", entityId: id, action: "delete", beforeState: existing });
  return NextResponse.json({ ok: true });
}
