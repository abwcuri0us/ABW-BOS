/** /api/payroll/[id] — GET, PUT, PATCH, DELETE */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
import { auditFromSession } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  const slip = await db.salarySlip.findFirst({ where: { id, deletedAt: null } });
  if (!slip) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ slip });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const existing = await db.salarySlip.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const numericFields = ["basicSalary", "hraAllowance", "conveyance", "medicalAllowance", "specialAllowance", "otherAllowances", "pfDeduction", "esiDeduction", "tdsDeduction", "professionalTax", "otherDeductions"];
  const stringFields = ["employeeName", "employeeId", "payPeriod", "status", "notes"];
  const update: Record<string, unknown> = {};
  for (const k of numericFields) if (k in body) update[k] = Number(body[k]) || 0;
  for (const k of stringFields) if (k in body) update[k] = body[k] ?? null;
  if (body.payDate) update.payDate = new Date(body.payDate);

  // Recompute totals
  const gross = (Number(body.basicSalary ?? existing.basicSalary) || 0)
    + (Number(body.hraAllowance ?? existing.hraAllowance) || 0)
    + (Number(body.conveyance ?? existing.conveyance) || 0)
    + (Number(body.medicalAllowance ?? existing.medicalAllowance) || 0)
    + (Number(body.specialAllowance ?? existing.specialAllowance) || 0)
    + (Number(body.otherAllowances ?? existing.otherAllowances) || 0);
  const ded = (Number(body.pfDeduction ?? existing.pfDeduction) || 0)
    + (Number(body.esiDeduction ?? existing.esiDeduction) || 0)
    + (Number(body.tdsDeduction ?? existing.tdsDeduction) || 0)
    + (Number(body.professionalTax ?? existing.professionalTax) || 0)
    + (Number(body.otherDeductions ?? existing.otherDeductions) || 0);
  update.grossEarnings = gross;
  update.totalDeductions = ded;
  update.netPay = gross - ded;

  const slip = await db.salarySlip.update({ where: { id }, data: update });
  await auditFromSession(session, { module: "payroll", entityType: "salary_slip", entityId: id, action: "update", beforeState: existing, afterState: slip });
  return NextResponse.json({ slip });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  const existing = await db.salarySlip.findFirst({ where: { id } }).catch(() => null);
  await db.salarySlip.update({ where: { id }, data: { deletedAt: new Date() } });
  await auditFromSession(session, { module: "payroll", entityType: "salary_slip", entityId: id, action: "delete", beforeState: existing });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const slip = await db.salarySlip.update({ where: { id }, data: { status: body.status } });
  await auditFromSession(session, { module: "payroll", entityType: "salary_slip", entityId: id, action: "update", afterState: { status: body.status } });
  return NextResponse.json({ slip });
}
