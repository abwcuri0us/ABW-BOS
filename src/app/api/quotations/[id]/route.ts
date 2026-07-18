/** /api/quotations/[id] — GET detail, PATCH status (accept/reject/convert), DELETE */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
import { auditFromSession } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  const quotation = await db.quotation.findFirst({
    where: { id, deletedAt: null },
    include: {
      party: { select: { id: true, displayName: true, email: true, phone: true, taxId: true, taxIdType: true } },
      lines: { orderBy: { lineNumber: "asc" } },
    },
  });
  if (!quotation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ quotation });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body?.status) return NextResponse.json({ error: "status required" }, { status: 400 });

  // If converting to invoice, create the invoice
  if (body.status === "converted") {
    const quo = await db.quotation.findFirst({
      where: { id, deletedAt: null },
      include: { lines: true },
    });
    if (!quo) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const invCount = await db.invoice.count();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invCount + 1).padStart(5, "0")}`;
    const invoice = await db.invoice.create({
      data: {
        invoiceNumber,
        invoiceType: "tax_invoice",
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        partyId: quo.partyId,
        currencyCode: quo.currencyCode,
        status: "draft",
        subtotal: quo.subtotal,
        discountAmount: quo.discountAmount,
        taxAmount: quo.taxAmount,
        totalAmount: quo.totalAmount,
        paidAmount: 0,
        balanceDue: quo.totalAmount,
        notes: quo.notes,
        termsConditions: quo.termsConditions,
        createdBy: session.uid,
        lines: {
          create: quo.lines.map((l) => ({
            lineNumber: l.lineNumber,
            productId: l.productId,
            description: l.description,
            quantity: l.quantity,
            uom: l.uom,
            unitPrice: l.unitPrice,
            discountPercent: l.discountPercent,
            discountAmount: 0,
            taxPercent: l.taxPercent,
            taxAmount: l.taxAmount,
            lineTotal: l.lineTotal,
          })),
        },
      },
    });

    await db.quotation.update({ where: { id }, data: { status: "converted", convertedInvoiceId: invoice.id } });
    await auditFromSession(session, { module: "quotations", entityType: "quotation", entityId: id, action: "transition", afterState: { status: "converted", invoiceId: invoice.id } });
    return NextResponse.json({ quotation: { id, status: "converted" }, invoice });
  }

  const updated = await db.quotation.update({ where: { id }, data: { status: body.status } });
  await auditFromSession(session, { module: "quotations", entityType: "quotation", entityId: id, action: "update", afterState: updated });
  return NextResponse.json({ quotation: updated });
}

/**
 * PUT /api/quotations/[id]
 * Full update: header fields (date, validUntil, currency, notes, terms, status) AND line items.
 * Lines are replaced atomically (delete + recreate) to keep lineNumber ordering consistent.
 */
export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const existing = await db.quotation.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Recompute totals if lines are provided
  let subtotal = existing.subtotal;
  let taxAmount = existing.taxAmount;
  let totalAmount = existing.totalAmount;
  let linesData: Array<Record<string, unknown>> | null = null;

  if (Array.isArray(body.lines)) {
    if (body.lines.length === 0) return NextResponse.json({ error: "At least one line required" }, { status: 400 });
    subtotal = 0; taxAmount = 0;
    linesData = body.lines.map((l: any, idx: number) => {
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
    totalAmount = subtotal + taxAmount;
  }

  // Update header
  const updateData: Record<string, unknown> = {};
  if (body.partyId) updateData.partyId = body.partyId;
  if (body.quotationDate) updateData.quotationDate = new Date(body.quotationDate);
  if (body.validUntil) updateData.validUntil = new Date(body.validUntil);
  if (body.currencyCode) updateData.currencyCode = body.currencyCode;
  if (typeof body.status === "string") updateData.status = body.status;
  if ("notes" in body) updateData.notes = body.notes ?? null;
  if ("termsConditions" in body) updateData.termsConditions = body.termsConditions ?? null;
  if (linesData) {
    updateData.subtotal = subtotal;
    updateData.taxAmount = taxAmount;
    updateData.totalAmount = totalAmount;
  }

  // Run update + line replacement in a transaction
  const updated = await db.$transaction(async (tx) => {
    if (linesData) {
      await tx.quotationLine.deleteMany({ where: { quotationId: id } });
      await tx.quotationLine.createMany({
        data: linesData.map((l) => ({ ...l, quotationId: id })) as any,
      });
    }
    return tx.quotation.update({ where: { id }, data: updateData, include: { party: { select: { displayName: true } }, lines: { orderBy: { lineNumber: "asc" } } } });
  });

  await auditFromSession(session, { module: "quotations", entityType: "quotation", entityId: id, action: "update", afterState: updated });
  return NextResponse.json({ quotation: updated });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  await db.quotation.update({ where: { id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
