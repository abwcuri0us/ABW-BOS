/**
 * /api/inventory/warehouses
 * GET  — list warehouses
 * POST — create warehouse
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
import { auditFromSession } from "@/lib/audit";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const warehouses = await db.warehouse.findMany({
    where: { deletedAt: null },
    orderBy: { code: "asc" },
  });
  return NextResponse.json({ items: warehouses });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { code, name, address } = body;
  if (!code || !name) return NextResponse.json({ error: "code and name required" }, { status: 400 });

  try {
    const warehouse = await db.warehouse.create({
      data: { code, name, address: address ?? null },
    });
    await auditFromSession(session, {
      module: "inventory", entityType: "warehouse", entityId: warehouse.id, action: "create", afterState: warehouse,
      sourceIp: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    });
    return NextResponse.json({ warehouse }, { status: 201 });
  } catch (err) {
    console.error("[inventory/warehouses/create]", err);
    return NextResponse.json({ error: "Failed to create warehouse (code may exist)" }, { status: 500 });
  }
}
