import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
import { auditFromSession } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const where: Record<string, unknown> = { deletedAt: null };
  if (q) { where.OR = [{ fullName: { contains: q } }, { email: { contains: q } }, { employeeCode: { contains: q } }]; }
  const items = await db.employee.findMany({ where, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.fullName) return NextResponse.json({ error: "fullName required" }, { status: 400 });
  const count = await db.employee.count();
  const employeeCode = `EMP-${String(count + 1).padStart(4, "0")}`;
  const emp = await db.employee.create({
    data: {
      employeeCode, fullName: body.fullName,
      email: body.email ?? null, phone: body.phone ?? null,
      dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
      gender: body.gender ?? null, bloodGroup: body.bloodGroup ?? null,
      address: body.address ?? null, city: body.city ?? null, state: body.state ?? null, pincode: body.pincode ?? null,
      emergencyContact: body.emergencyContact ?? null, emergencyPhone: body.emergencyPhone ?? null,
      department: body.department ?? null, designation: body.designation ?? null,
      employmentType: body.employmentType ?? "full-time",
      joiningDate: body.joiningDate ? new Date(body.joiningDate) : new Date(),
      status: body.status ?? "active",
      basicSalary: Number(body.basicSalary) || 0,
      bankName: body.bankName ?? null, bankAccount: body.bankAccount ?? null, bankIfsc: body.bankIfsc ?? null,
      panNumber: body.panNumber ?? null, aadhaarNumber: body.aadhaarNumber ?? null,
      documents: JSON.stringify(body.documents ?? []),
    },
  });
  await auditFromSession(session, { module: "hr", entityType: "employee", entityId: emp.id, action: "create", afterState: emp });
  return NextResponse.json({ employee: emp }, { status: 201 });
}
