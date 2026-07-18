/**
 * /api/search
 * GET — universal search across parties, products, invoices
 *
 * Query params: q (search string)
 * Returns: grouped results by type
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) {
    return NextResponse.json({ groups: [] });
  }

  // Run searches in parallel, limit 5 results per type
  const [parties, products, invoices] = await Promise.all([
    db.party.findMany({
      where: {
        deletedAt: null,
        OR: [
          { displayName: { contains: q } },
          { legalName: { contains: q } },
          { email: { contains: q } },
          { phone: { contains: q } },
          { taxId: { contains: q } },
        ],
      },
      take: 5,
      orderBy: { displayName: "asc" },
      select: { id: true, displayName: true, partyType: true, email: true, phone: true, subTypes: true },
    }),
    db.product.findMany({
      where: {
        deletedAt: null,
        OR: [
          { sku: { contains: q } },
          { name: { contains: q } },
          { barcode: { contains: q } },
        ],
      },
      take: 5,
      orderBy: { name: "asc" },
      select: { id: true, sku: true, name: true, salePrice: true, currencyCode: true, isActive: true },
    }),
    db.invoice.findMany({
      where: {
        deletedAt: null,
        OR: [
          { invoiceNumber: { contains: q } },
        ],
      },
      take: 5,
      orderBy: { invoiceDate: "desc" },
      select: {
        id: true, invoiceNumber: true, invoiceDate: true, totalAmount: true,
        status: true, currencyCode: true,
        party: { select: { displayName: true } },
      },
    }),
  ]);

  const groups = [
    {
      type: "contacts",
      label: "Contacts",
      results: parties.map((p) => ({
        id: p.id, module: "contacts",
        title: p.displayName,
        subtitle: p.email ?? p.phone ?? "",
        badge: p.partyType,
        route: "contacts",
      })),
    },
    {
      type: "products",
      label: "Products",
      results: products.map((p) => ({
        id: p.id, module: "inventory",
        title: p.name,
        subtitle: `${p.sku} · ${p.currencyCode} ${p.salePrice}`,
        badge: p.isActive ? "active" : "inactive",
        route: "inventory",
      })),
    },
    {
      type: "invoices",
      label: "Invoices",
      results: invoices.map((i) => ({
        id: i.id, module: "invoicing",
        title: i.invoiceNumber,
        subtitle: `${i.party?.displayName ?? ""} · ${i.currencyCode} ${i.totalAmount}`,
        badge: i.status,
        route: "invoicing",
      })),
    },
  ].filter((g) => g.results.length > 0);

  return NextResponse.json({ groups });
}
