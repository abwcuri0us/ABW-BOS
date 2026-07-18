/**
 * /api/templates
 * GET  — list templates (optionally filtered by type)
 * POST — create template
 * PUT  — update template
 * DELETE — delete template
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "";

  const where: Record<string, unknown> = { isActive: true };
  if (type) where.type = type;

  const items = await db.documentTemplate.findMany({ where, orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }] });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.type || !body?.name) return NextResponse.json({ error: "type and name required" }, { status: 400 });

  // If this is set as default, unset other defaults of the same type
  if (body.isDefault) {
    await db.documentTemplate.updateMany({
      where: { type: body.type, isDefault: true },
      data: { isDefault: false },
    });
  }

  const template = await db.documentTemplate.create({
    data: {
      type: body.type,
      name: body.name,
      content: body.content ?? "",
      headerHtml: body.headerHtml ?? null,
      footerHtml: body.footerHtml ?? null,
      css: body.css ?? null,
      isDefault: body.isDefault ?? false,
      isActive: true,
    },
  });
  return NextResponse.json({ template }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const allowed = ["name", "content", "headerHtml", "footerHtml", "css", "isDefault", "isActive"];
  const update: Record<string, unknown> = {};
  for (const k of allowed) { if (k in body) update[k] = body[k]; }

  if (body.isDefault) {
    const existing = await db.documentTemplate.findUnique({ where: { id: body.id } });
    if (existing) {
      await db.documentTemplate.updateMany({
        where: { type: existing.type, isDefault: true, id: { not: body.id } },
        data: { isDefault: false },
      });
    }
  }

  const template = await db.documentTemplate.update({ where: { id: body.id }, data: update });
  return NextResponse.json({ template });
}

export async function DELETE(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await db.documentTemplate.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
