/**
 * /api/invoicing/[id]
 * GET    — fetch a single invoice
 * PATCH  — update invoice status (e.g. mark as sent/paid/void)
 * DELETE — soft-delete
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
import { auditFromSession } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;

  const invoice = await db.invoice.findFirst({
    where: { id, deletedAt: null },
    include: {
      party: { select: { id: true, displayName: true, email: true, phone: true, taxId: true, taxIdType: true } },
      lines: { orderBy: { lineNumber: "asc" }, include: { product: { select: { id: true, sku: true, name: true } } } },
    },
  });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ invoice });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;

  const existing = await db.invoice.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { status, paidAmount } = body;
  const update: Record<string, unknown> = {};
  if (status && ["draft", "sent", "viewed", "partial", "paid", "overdue", "void"].includes(status)) {
    update.status = status;
  }
  if (typeof paidAmount === "number") {
    update.paidAmount = paidAmount;
    update.balanceDue = existing.totalAmount - paidAmount;
    if (paidAmount >= existing.totalAmount) update.status = "paid";
    else if (paidAmount > 0) update.status = "partial";
  }

  const updated = await db.invoice.update({
    where: { id },
    data: update,
    include: {
      party: { select: { id: true, displayName: true } },
      lines: { orderBy: { lineNumber: "asc" } },
    },
  });

  await auditFromSession(session, {
    module: "invoicing", entityType: "invoice", entityId: id, action: "update",
    beforeState: existing, afterState: updated,
    sourceIp: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
  });

  return NextResponse.json({ invoice: updated });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;

  const existing = await db.invoice.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.invoice.update({ where: { id }, data: { deletedAt: new Date() } });
  await auditFromSession(session, {
    module: "invoicing", entityType: "invoice", entityId: id, action: "delete", beforeState: existing,
    sourceIp: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
  });
  return NextResponse.json({ ok: true });
}

/**
 * PUT /api/invoicing/[id]
 * Full update: header fields (date, dueDate, currency, notes, terms) AND line items.
 * Lines are replaced atomically (delete + recreate). Paid amount is preserved.
 */
export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const existing = await db.invoice.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
        discountAmount: 0,
        taxPercent: Number(l.taxPercent) || 0,
        taxAmount: tax,
        lineTotal: taxable + tax,
      };
    });
    totalAmount = subtotal + taxAmount;
  }

  const updateData: Record<string, unknown> = {};
  if (body.partyId) updateData.partyId = body.partyId;
  if (body.invoiceDate) updateData.invoiceDate = new Date(body.invoiceDate);
  if (body.dueDate) updateData.dueDate = new Date(body.dueDate);
  if (body.currencyCode) updateData.currencyCode = body.currencyCode;
  if (typeof body.status === "string") updateData.status = body.status;
  if ("notes" in body) updateData.notes = body.notes ?? null;
  if ("termsConditions" in body) updateData.termsConditions = body.termsConditions ?? null;
  if (linesData) {
    updateData.subtotal = subtotal;
    updateData.taxAmount = taxAmount;
    updateData.totalAmount = totalAmount;
    // Preserve paid amount, recompute balance due
    const paid = existing.paidAmount;
    updateData.balanceDue = Math.max(0, totalAmount - paid);
  }

  const updated = await db.$transaction(async (tx) => {
    if (linesData) {
      await tx.invoiceLine.deleteMany({ where: { invoiceId: id } });
      await tx.invoiceLine.createMany({
        data: linesData.map((l) => ({ ...l, invoiceId: id })) as any,
      });
    }
    return tx.invoice.update({
      where: { id },
      data: updateData,
      include: {
        party: { select: { id: true, displayName: true } },
        lines: { orderBy: { lineNumber: "asc" } },
      },
    });
  });

  await auditFromSession(session, {
    module: "invoicing", entityType: "invoice", entityId: id, action: "update",
    beforeState: existing, afterState: updated,
    sourceIp: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
  });

  return NextResponse.json({ invoice: updated });
}
