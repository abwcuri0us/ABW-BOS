/** /api/bills/[id] — PATCH (status update), PUT (full update), DELETE */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
import { auditFromSession } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const update: Record<string, unknown> = {};
  if (body.status) update.status = body.status;
  if (body.status === "paid") {
    update.paidAmount = body.totalAmount ?? 0;
    update.balanceDue = 0;
    update.paymentDate = new Date();
  }
  const bill = await db.bill.update({ where: { id }, data: update });
  await auditFromSession(session, { module: "bills", entityType: "bill", entityId: id, action: "update", afterState: bill });
  return NextResponse.json({ bill });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const allowed = ["billNumber", "vendorName", "billDate", "dueDate", "amount", "taxAmount", "totalAmount", "paidAmount", "balanceDue", "status", "category", "paymentMode", "notes"];
  const update: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in body) {
      if (["amount", "taxAmount", "totalAmount", "paidAmount", "balanceDue"].includes(k)) {
        update[k] = Number(body[k]) || 0;
      } else {
        update[k] = body[k] ?? null;
      }
    }
  }
  if (body.billDate) update.billDate = new Date(body.billDate);
  if (body.dueDate) update.dueDate = new Date(body.dueDate);
  if (body.paymentDate) update.paymentDate = new Date(body.paymentDate);

  const bill = await db.bill.update({ where: { id }, data: update });
  await auditFromSession(session, { module: "bills", entityType: "bill", entityId: id, action: "update", afterState: bill });
  return NextResponse.json({ bill });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  const existing = await db.bill.findUnique({ where: { id } }).catch(() => null);
  await db.bill.update({ where: { id }, data: { deletedAt: new Date() } });
  await auditFromSession(session, { module: "bills", entityType: "bill", entityId: id, action: "delete", beforeState: existing });
  return NextResponse.json({ ok: true });
}
