/**
 * /api/invoicing
 * GET  — list invoices
 * POST — create invoice (with line items, auto-calculated totals)
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
import { auditFromSession } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "";
  const partyId = url.searchParams.get("partyId") ?? "";
  const q = url.searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "20", 10)));

  const where: Record<string, unknown> = { deletedAt: null };
  if (status) where.status = status;
  if (partyId) where.partyId = partyId;
  if (q) where.invoiceNumber = { contains: q };

  const [total, invoices] = await Promise.all([
    db.invoice.count({ where }),
    db.invoice.findMany({
      where,
      orderBy: { invoiceDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        party: { select: { id: true, displayName: true, email: true, phone: true } },
        lines: { orderBy: { lineNumber: "asc" } },
      },
    }),
  ]);

  return NextResponse.json({
    items: invoices, total, page, pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { invoiceType, invoiceDate, dueDate, partyId, currencyCode, notes, termsConditions, lines } = body;
  if (!partyId || !Array.isArray(lines) || lines.length === 0) {
    return NextResponse.json({ error: "partyId and at least one line are required" }, { status: 400 });
  }

  // Calculate totals from lines
  let subtotal = 0;
  let taxAmount = 0;
  const processedLines = lines.map((l: any, idx: number) => {
    const qty = Number(l.quantity) || 0;
    const price = Number(l.unitPrice) || 0;
    const lineGross = qty * price;
    const discPct = Number(l.discountPercent) || 0;
    const discountAmount = (lineGross * discPct) / 100;
    const taxableAmount = lineGross - discountAmount;
    const taxPct = Number(l.taxPercent) || 0;
    const lineTax = (taxableAmount * taxPct) / 100;
    const lineTotal = taxableAmount + lineTax;
    subtotal += taxableAmount;
    taxAmount += lineTax;
    return {
      lineNumber: idx + 1,
      productId: l.productId ?? null,
      description: l.description ?? "",
      quantity: qty,
      uom: l.uom ?? "pcs",
      unitPrice: price,
      discountPercent: discPct,
      discountAmount,
      taxPercent: taxPct,
      taxAmount: lineTax,
      lineTotal,
    };
  });
  const totalAmount = subtotal + taxAmount;

  // Generate invoice number
  const count = await db.invoice.count();
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;

  try {
    const invoice = await db.invoice.create({
      data: {
        invoiceNumber,
        invoiceType: invoiceType ?? "tax_invoice",
        invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        partyId,
        currencyCode: currencyCode ?? "INR",
        status: "draft",
        subtotal,
        discountAmount: 0,
        taxAmount,
        totalAmount,
        paidAmount: 0,
        balanceDue: totalAmount,
        notes: notes ?? null,
        termsConditions: termsConditions ?? null,
        createdBy: session.uid,
        lines: { create: processedLines },
      },
      include: {
        party: { select: { id: true, displayName: true, email: true, phone: true } },
        lines: { orderBy: { lineNumber: "asc" } },
      },
    });

    await auditFromSession(session, {
      module: "invoicing", entityType: "invoice", entityId: invoice.id, action: "create", afterState: invoice,
      sourceIp: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (err) {
    console.error("[invoicing/create]", err);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}
