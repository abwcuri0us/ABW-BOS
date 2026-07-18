/**
 * GET /api/ai/snapshot
 * Returns a compact business snapshot for the local (WebLLM) AI assistant.
 *
 * This is intentionally lightweight — only the KPIs and a small slice of
 * recent data so the in-browser LLM has enough context to answer questions
 * about the user's business.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const [
    partyCount, productCount, invoiceCount, quotationCount,
    invoiceStats, lowStockCount, draftInvoiceCount, overdueInvoiceCount,
    recentInvoices, topCustomers, lowStock, recentActivity,
  ] = await Promise.all([
    db.party.count({ where: { deletedAt: null } }),
    db.product.count({ where: { deletedAt: null } }),
    db.invoice.count({ where: { deletedAt: null } }),
    db.quotation.count({ where: { deletedAt: null } }),
    db.invoice.aggregate({
      _sum: { totalAmount: true, paidAmount: true, balanceDue: true },
      where: { deletedAt: null },
    }),
    db.product.count({
      where: {
        deletedAt: null,
        isStockable: true,
        stockEntries: { some: { quantityOnHand: { lt: 5 } } },
      },
    }),
    db.invoice.count({ where: { deletedAt: null, status: "draft" } }),
    db.invoice.count({
      where: {
        deletedAt: null,
        status: { in: ["overdue", "partial", "sent"] },
        dueDate: { lt: new Date() },
        balanceDue: { gt: 0 },
      },
    }),
    db.invoice.findMany({
      where: { deletedAt: null },
      orderBy: { invoiceDate: "desc" },
      take: 10,
      select: {
        invoiceNumber: true, totalAmount: true, status: true, balanceDue: true,
        party: { select: { displayName: true } },
      },
    }),
    db.party.findMany({
      where: { deletedAt: null },
      include: {
        invoices: { where: { deletedAt: null }, select: { totalAmount: true } },
      },
      take: 100,
    }),
    db.product.findMany({
      where: {
        deletedAt: null,
        isStockable: true,
        stockEntries: { some: { quantityOnHand: { lt: 5 } } },
      },
      take: 10,
      select: {
        sku: true, name: true,
        stockEntries: { select: { quantityOnHand: true }, take: 1 },
      },
    }),
    db.auditLog.findMany({
      take: 10,
      orderBy: { ts: "desc" },
      select: { ts: true, action: true, module: true },
    }),
  ]);

  // Compute top customers by total invoiced
  const top = topCustomers
    .map((p) => ({
      name: p.displayName,
      total: p.invoices.reduce((s, i) => s + i.totalAmount, 0),
    }))
    .filter((p) => p.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const snapshot = {
    asOf: new Date().toISOString().slice(0, 10),
    kpis: {
      parties: partyCount,
      products: productCount,
      invoices: invoiceCount,
      quotations: quotationCount,
      totalInvoiced: invoiceStats._sum.totalAmount ?? 0,
      totalCollected: invoiceStats._sum.paidAmount ?? 0,
      outstanding: invoiceStats._sum.balanceDue ?? 0,
      lowStockProducts: lowStockCount,
      draftInvoices: draftInvoiceCount,
      overdueInvoices: overdueInvoiceCount,
    },
    recentInvoices: recentInvoices.map((i) => ({
      number: i.invoiceNumber,
      party: i.party?.displayName ?? "—",
      amount: i.totalAmount,
      status: i.status,
      balance: i.balanceDue,
    })),
    topCustomers: top,
    lowStock: lowStock.map((p) => ({
      sku: p.sku,
      name: p.name,
      qty: p.stockEntries?.[0]?.quantityOnHand ?? 0,
    })),
    recentActivity: recentActivity.map((a) => ({
      ts: a.ts.toISOString().slice(0, 16).replace("T", " "),
      action: a.action,
      module: a.module,
    })),
  };

  return NextResponse.json({ snapshot });
}
