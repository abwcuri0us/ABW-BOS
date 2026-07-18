/** /api/gst/[id] — GET, PUT, PATCH (status), DELETE */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
import { auditFromSession } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  const filing = await db.gstFiling.findUnique({ where: { id } });
  if (!filing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ filing });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const existing = await db.gstFiling.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const numericFields = ["totalTaxableValue", "totalOutputTax", "totalInputTax", "netTaxPayable", "igstAmount", "cgstAmount", "sgstAmount", "cessAmount"];
  const stringFields = ["returnType", "period", "status", "notes"];
  const update: Record<string, unknown> = {};
  for (const k of numericFields) if (k in body) update[k] = Number(body[k]) || 0;
  for (const k of stringFields) if (k in body) update[k] = body[k] ?? null;
  if (body.dueDate) update.dueDate = new Date(body.dueDate);
  if (body.filingDate) update.filingDate = new Date(body.filingDate);

  const filing = await db.gstFiling.update({ where: { id }, data: update });
  await auditFromSession(session, { module: "gst", entityType: "gst_filing", entityId: id, action: "update", beforeState: existing, afterState: filing });
  return NextResponse.json({ filing });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const update: Record<string, unknown> = {};
  if (body.status) {
    update.status = body.status;
    if (body.status === "filed" || body.status === "late_filed") update.filingDate = new Date();
  }
  const filing = await db.gstFiling.update({ where: { id }, data: update });
  await auditFromSession(session, { module: "gst", entityType: "gst_filing", entityId: id, action: "update", afterState: filing });
  return NextResponse.json({ filing });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  const existing = await db.gstFiling.findUnique({ where: { id } }).catch(() => null);
  await db.gstFiling.delete({ where: { id } });
  await auditFromSession(session, { module: "gst", entityType: "gst_filing", entityId: id, action: "delete", beforeState: existing });
  return NextResponse.json({ ok: true });
}
