/** /api/payments — GET list, POST create */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
import { auditFromSession } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "";
  const where: Record<string, unknown> = { deletedAt: null };
  if (type) where.type = type;
  const items = await db.paymentRecord.findMany({ where, orderBy: { paymentDate: "desc" } });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.partyName || body.amount == null) return NextResponse.json({ error: "partyName and amount required" }, { status: 400 });

  const count = await db.paymentRecord.count();
  const paymentNumber = `PMT-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;

  const payment = await db.paymentRecord.create({
    data: {
      paymentNumber,
      type: body.type ?? "received",
      partyName: body.partyName,
      partyId: body.partyId ?? null,
      amount: Number(body.amount) || 0,
      currencyCode: body.currencyCode ?? "INR",
      paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
      paymentMode: body.paymentMode ?? "bank",
      referenceNumber: body.referenceNumber ?? null,
      invoiceNumber: body.invoiceNumber ?? null,
      billNumber: body.billNumber ?? null,
      status: body.status ?? "completed",
      notes: body.notes ?? null,
      createdBy: session.uid,
    },
  });
  await auditFromSession(session, { module: "payments", entityType: "payment", entityId: payment.id, action: "create", afterState: payment });
  return NextResponse.json({ payment }, { status: 201 });
}
