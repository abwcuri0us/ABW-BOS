/** /api/quotations — GET list, POST create */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
import { auditFromSession } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "20", 10)));
  const where: Record<string, unknown> = { deletedAt: null };
  if (status) where.status = status;
  const [total, items] = await Promise.all([
    db.quotation.count({ where }),
    db.quotation.findMany({
      where, orderBy: { quotationDate: "desc" },
      skip: (page - 1) * pageSize, take: pageSize,
      include: { party: { select: { id: true, displayName: true } }, lines: { orderBy: { lineNumber: "asc" } } },
    }),
  ]);
  return NextResponse.json({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.partyId || !Array.isArray(body.lines) || body.lines.length === 0) {
    return NextResponse.json({ error: "partyId and at least one line required" }, { status: 400 });
  }

  let subtotal = 0, taxAmount = 0;
  const lines = body.lines.map((l: any, idx: number) => {
    const gross = (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0);
    const discount = (gross * (Number(l.discountPercent) || 0)) / 100;
    const taxable = gross - discount;
    const tax = (taxable * (Number(l.taxPercent) || 0)) / 100;
    subtotal += taxable; taxAmount += tax;
    return {
      lineNumber: idx + 1,
      productId: l.productId ?? null,
      description: l.description ?? "",
      quantity: Number(l.quantity) || 0,
      uom: l.uom ?? "pcs",
      unitPrice: Number(l.unitPrice) || 0,
      discountPercent: Number(l.discountPercent) || 0,
      taxPercent: Number(l.taxPercent) || 0,
      taxAmount: tax,
      lineTotal: taxable + tax,
    };
  });

  const count = await db.quotation.count();
  const quotationNumber = `QUO-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;
  const totalAmount = subtotal + taxAmount;

  const quotation = await db.quotation.create({
    data: {
      quotationNumber, partyId: body.partyId,
      quotationDate: body.quotationDate ? new Date(body.quotationDate) : new Date(),
      validUntil: body.validUntil ? new Date(body.validUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      currencyCode: body.currencyCode ?? "INR",
      status: body.status ?? "draft",
      subtotal, discountAmount: 0, taxAmount, totalAmount,
      notes: body.notes ?? null, termsConditions: body.termsConditions ?? null,
      createdBy: session.uid,
      lines: { create: lines },
    },
    include: { party: { select: { displayName: true } }, lines: true },
  });

  await auditFromSession(session, { module: "quotations", entityType: "quotation", entityId: quotation.id, action: "create", afterState: quotation });
  return NextResponse.json({ quotation }, { status: 201 });
}
