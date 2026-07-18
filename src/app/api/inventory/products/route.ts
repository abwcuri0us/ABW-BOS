/**
 * /api/inventory/products
 * GET  — list products
 * POST — create product
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
import { auditFromSession } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const category = url.searchParams.get("category") ?? "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "20", 10)));

  const where: Record<string, unknown> = { deletedAt: null };
  if (q) {
    where.OR = [
      { sku: { contains: q } },
      { name: { contains: q } },
      { barcode: { contains: q } },
    ];
  }
  if (category) where.category = category;

  const [total, products] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        stockEntries: { include: { warehouse: true } },
      },
    }),
  ]);

  return NextResponse.json({
    items: products, total, page, pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { sku, barcode, name, description, category, uom, productType, isStockable, costPrice, salePrice, currencyCode, taxCode, reorderPoint, reorderQty, weightGrams } = body;
  if (!sku || !name) {
    return NextResponse.json({ error: "sku and name are required" }, { status: 400 });
  }

  try {
    const product = await db.product.create({
      data: {
        sku, barcode: barcode ?? null, name, description: description ?? null,
        category: category ?? null, uom: uom ?? "pcs",
        productType: productType ?? "goods",
        isStockable: isStockable ?? true,
        costPrice: Number(costPrice) || 0,
        salePrice: Number(salePrice) || 0,
        currencyCode: currencyCode ?? "INR",
        taxCode: taxCode ?? null,
        reorderPoint: reorderPoint ? Number(reorderPoint) : null,
        reorderQty: reorderQty ? Number(reorderQty) : null,
        weightGrams: weightGrams ? Number(weightGrams) : null,
      },
      include: { stockEntries: { include: { warehouse: true } } },
    });
    await auditFromSession(session, {
      module: "inventory", entityType: "product", entityId: product.id, action: "create", afterState: product,
      sourceIp: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    });
    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    console.error("[inventory/products/create]", err);
    return NextResponse.json({ error: "Failed to create product (SKU may already exist)" }, { status: 500 });
  }
}
