/** /api/bills — GET list, POST create */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
import { auditFromSession } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "";
  const where: Record<string, unknown> = { deletedAt: null };
  if (status) where.status = status;
  const items = await db.bill.findMany({ where, orderBy: { billDate: "desc" } });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.vendorName || body.amount == null) return NextResponse.json({ error: "vendorName and amount required" }, { status: 400 });

  const count = await db.bill.count();
  const billNumber = `BILL-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;
  const amount = Number(body.amount) || 0;
  const taxAmount = Number(body.taxAmount) || 0;
  const totalAmount = amount + taxAmount;

  const bill = await db.bill.create({
    data: {
      billNumber,
      vendorName: body.vendorName,
      vendorId: body.vendorId ?? null,
      billDate: body.billDate ? new Date(body.billDate) : new Date(),
      dueDate: body.dueDate ? new Date(body.dueDate) : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      amount, taxAmount, totalAmount,
      paidAmount: 0, balanceDue: totalAmount,
      currencyCode: body.currencyCode ?? "INR",
      status: body.status ?? "unpaid",
      category: body.category ?? "other",
      notes: body.notes ?? null,
      createdBy: session.uid,
    },
  });
  await auditFromSession(session, { module: "bills", entityType: "bill", entityId: bill.id, action: "create", afterState: bill });
  return NextResponse.json({ bill }, { status: 201 });
}
