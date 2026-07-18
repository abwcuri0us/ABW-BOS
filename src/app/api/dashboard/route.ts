/**
 * /api/dashboard
 * GET — dashboard KPIs and recent activity for the current user
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const [
    totalParties,
    activeParties,
    customers,
    suppliers,
    todayAuditEntries,
    recentAudit,
    unreadNotifications,
    totalAuditEntries,
    totalProducts,
    lowStockProducts,
    totalInvoices,
    openInvoices,
    totalInvoiceAmount,
    paidInvoiceAmount,
    outstandingAmount,
  ] = await Promise.all([
    db.party.count({ where: { deletedAt: null } }),
    db.party.count({ where: { deletedAt: null, isActive: true } }),
    db.party.count({ where: { deletedAt: null, subTypes: { contains: '"customer"' } } }),
    db.party.count({ where: { deletedAt: null, subTypes: { contains: '"supplier"' } } }),
    db.auditLog.count({ where: { ts: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
    db.auditLog.findMany({
      take: 10, orderBy: { ts: "desc" },
      include: { user: { select: { id: true, displayName: true, username: true } } },
    }),
    db.notificationDelivery.count({ where: { userId: session.uid, status: "delivered" } }),
    db.auditLog.count(),
    db.product.count({ where: { deletedAt: null } }),
    // Low stock: products with stock < reorderPoint (approximation: any stock record with quantityOnHand < 10)
    db.stock.count({ where: { quantityOnHand: { lt: 10 } } }),
    db.invoice.count({ where: { deletedAt: null } }),
    db.invoice.count({ where: { deletedAt: null, status: { in: ["draft", "sent", "viewed", "partial", "overdue"] } } }),
    db.invoice.aggregate({ _sum: { totalAmount: true }, where: { deletedAt: null } }),
    db.invoice.aggregate({ _sum: { paidAmount: true }, where: { deletedAt: null } }),
    db.invoice.aggregate({ _sum: { balanceDue: true }, where: { deletedAt: null, status: { in: ["sent", "viewed", "partial", "overdue"] } } }),
  ]);

  const personCount = await db.party.count({ where: { deletedAt: null, partyType: "person" } });
  const orgCount = await db.party.count({ where: { deletedAt: null, partyType: "organization" } });

  // Last 6 months invoice totals (for chart)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const invoices = await db.invoice.findMany({
    where: { deletedAt: null, invoiceDate: { gte: sixMonthsAgo } },
    select: { invoiceDate: true, totalAmount: true, status: true },
  });

  // Group by month
  const monthlyData: Record<string, { month: string; total: number; paid: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const monthName = d.toLocaleString("default", { month: "short" });
    monthlyData[key] = { month: monthName, total: 0, paid: 0 };
  }
  for (const inv of invoices) {
    const key = `${inv.invoiceDate.getFullYear()}-${String(inv.invoiceDate.getMonth() + 1).padStart(2, "0")}`;
    if (monthlyData[key]) {
      monthlyData[key].total += inv.totalAmount;
      if (inv.status === "paid") monthlyData[key].paid += inv.totalAmount;
    }
  }

  return NextResponse.json({
    kpis: {
      totalParties, activeParties, customers, suppliers,
      todayAuditEntries, totalAuditEntries, unreadNotifications,
      totalProducts, lowStockProducts,
      totalInvoices, openInvoices,
      totalInvoiceAmount: totalInvoiceAmount._sum.totalAmount ?? 0,
      paidInvoiceAmount: paidInvoiceAmount._sum.paidAmount ?? 0,
      outstandingAmount: outstandingAmount._sum.balanceDue ?? 0,
    },
    breakdowns: {
      partyType: { person: personCount, organization: orgCount },
    },
    chartData: Object.values(monthlyData),
    recentActivity: recentAudit,
  });
}
