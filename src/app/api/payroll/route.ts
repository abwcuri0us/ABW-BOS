/** /api/payroll — GET list, POST create salary slip */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
import { auditFromSession } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const url = new URL(req.url);
  const period = url.searchParams.get("period");
  const where: Record<string, unknown> = { deletedAt: null };
  if (period) where.payPeriod = period;
  const items = await db.salarySlip.findMany({ where, orderBy: { payDate: "desc" } });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.employeeName) return NextResponse.json({ error: "employeeName required" }, { status: 400 });

  const b = body;
  const grossEarnings = (Number(b.basicSalary) || 0) + (Number(b.hraAllowance) || 0) + (Number(b.conveyance) || 0) +
    (Number(b.medicalAllowance) || 0) + (Number(b.specialAllowance) || 0) + (Number(b.otherAllowances) || 0);
  const totalDeductions = (Number(b.pfDeduction) || 0) + (Number(b.esiDeduction) || 0) +
    (Number(b.tdsDeduction) || 0) + (Number(b.professionalTax) || 0) + (Number(b.otherDeductions) || 0);
  const netPay = grossEarnings - totalDeductions;

  const count = await db.salarySlip.count();
  const slipNumber = `SAL-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;

  const slip = await db.salarySlip.create({
    data: {
      slipNumber,
      employeeName: b.employeeName,
      employeeId: b.employeeId ?? null,
      payPeriod: b.payPeriod ?? new Date().toISOString().slice(0, 7),
      payDate: b.payDate ? new Date(b.payDate) : new Date(),
      basicSalary: Number(b.basicSalary) || 0,
      hraAllowance: Number(b.hraAllowance) || 0,
      conveyance: Number(b.conveyance) || 0,
      medicalAllowance: Number(b.medicalAllowance) || 0,
      specialAllowance: Number(b.specialAllowance) || 0,
      otherAllowances: Number(b.otherAllowances) || 0,
      grossEarnings,
      pfDeduction: Number(b.pfDeduction) || 0,
      esiDeduction: Number(b.esiDeduction) || 0,
      tdsDeduction: Number(b.tdsDeduction) || 0,
      professionalTax: Number(b.professionalTax) || 0,
      otherDeductions: Number(b.otherDeductions) || 0,
      totalDeductions,
      netPay,
      currencyCode: b.currencyCode ?? "INR",
      status: b.status ?? "draft",
      bankAccount: b.bankAccount ?? null,
      notes: b.notes ?? null,
      createdBy: session.uid,
    },
  });
  await auditFromSession(session, { module: "payroll", entityType: "salary_slip", entityId: slip.id, action: "create", afterState: slip });
  return NextResponse.json({ slip }, { status: 201 });
}
