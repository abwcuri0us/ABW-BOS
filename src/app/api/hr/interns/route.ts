import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const items = await db.intern.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ items });
}
export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.fullName) return NextResponse.json({ error: "fullName required" }, { status: 400 });
  const count = await db.intern.count();
  const internCode = `INT-${String(count + 1).padStart(4, "0")}`;
  const intern = await db.intern.create({
    data: {
      internCode, fullName: body.fullName,
      email: body.email ?? null, phone: body.phone ?? null,
      college: body.college ?? null, degree: body.degree ?? null, branch: body.branch ?? null, year: body.year ?? null,
      position: body.position ?? "Intern", department: body.department ?? null,
      startDate: body.startDate ? new Date(body.startDate) : new Date(),
      endDate: body.endDate ? new Date(body.endDate) : null,
      duration: body.duration ?? null, stipend: Number(body.stipend) || 0,
      status: body.status ?? "active",
      resumeUrl: body.resumeUrl ?? null,
      documents: JSON.stringify(body.documents ?? []),
    },
  });
  return NextResponse.json({ intern }, { status: 201 });
}
