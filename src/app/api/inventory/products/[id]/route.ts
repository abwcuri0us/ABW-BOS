/**
 * /api/inventory/products/[id]
 * GET    — fetch a single product
 * PUT    — update a product
 * DELETE — soft-delete a product
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
import { auditFromSession, computeDiff } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;

  const product = await db.product.findFirst({
    where: { id, deletedAt: null },
    include: {
      stockEntries: { include: { warehouse: true } },
      movements: { orderBy: { movementDate: "desc" }, take: 20, include: { warehouse: true } },
    },
  });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ product });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;

  const existing = await db.product.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const allowed = ["name", "barcode", "description", "category", "uom", "productType", "isStockable", "costPrice", "salePrice", "currencyCode", "taxCode", "reorderPoint", "reorderQty", "weightGrams", "isActive"];
  const update: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in body) update[k] = body[k];
  }
  for (const numKey of ["costPrice", "salePrice", "reorderPoint", "reorderQty", "weightGrams"]) {
    if (numKey in update) update[numKey] = update[numKey] === "" ? null : Number(update[numKey]);
  }

  try {
    const updated = await db.product.update({
      where: { id },
      data: update,
      include: { stockEntries: { include: { warehouse: true } } },
    });
    await auditFromSession(session, {
      module: "inventory", entityType: "product", entityId: id, action: "update",
      beforeState: existing, afterState: updated, diff: computeDiff(existing as any, updated as any),
      sourceIp: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    });
    return NextResponse.json({ product: updated });
  } catch (err) {
    console.error("[inventory/products/update]", err);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;

  const existing = await db.product.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.product.update({ where: { id }, data: { deletedAt: new Date() } });
  await auditFromSession(session, {
    module: "inventory", entityType: "product", entityId: id, action: "delete", beforeState: existing,
    sourceIp: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
  });
  return NextResponse.json({ ok: true });
}
