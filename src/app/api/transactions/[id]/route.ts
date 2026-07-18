/** /api/transactions/[id] — GET, PUT, DELETE */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
import { auditFromSession } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  const transaction = await db.transaction.findFirst({ where: { id, deletedAt: null } });
  if (!transaction) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ transaction });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const existing = await db.transaction.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allowed = ["type", "category", "currencyCode", "paymentMode", "referenceType", "referenceId", "partyId", "accountId", "description", "notes", "status"];
  const update: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in body) update[k] = body[k] ?? null;
  }
  if (typeof body.amount === "number") update.amount = body.amount;
  if (body.transactionDate) update.transactionDate = new Date(body.transactionDate);

  const transaction = await db.transaction.update({ where: { id }, data: update });
  await auditFromSession(session, { module: "transactions", entityType: "transaction", entityId: id, action: "update", beforeState: existing, afterState: transaction });
  return NextResponse.json({ transaction });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  const existing = await db.transaction.findFirst({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.transaction.update({ where: { id }, data: { deletedAt: new Date() } });
  await auditFromSession(session, { module: "transactions", entityType: "transaction", entityId: id, action: "delete", beforeState: existing });
  return NextResponse.json({ ok: true });
}
