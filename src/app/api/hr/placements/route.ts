import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const items = await db.placement.findMany({ where: { deletedAt: null }, orderBy: { placementDate: "desc" } });
  return NextResponse.json({ items });
}
export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.candidateName) return NextResponse.json({ error: "candidateName required" }, { status: 400 });
  const count = await db.placement.count();
  const placementCode = `PLT-${String(count + 1).padStart(4, "0")}`;
  const placement = await db.placement.create({
    data: {
      placementCode, candidateName: body.candidateName,
      candidateEmail: body.candidateEmail ?? null, candidatePhone: body.candidatePhone ?? null,
      companyName: body.companyName ?? "", position: body.position ?? "",
      salary: Number(body.salary) || 0, status: body.status ?? "pending",
      commissionAmount: Number(body.commissionAmount) || 0, notes: body.notes ?? null,
    },
  });
  return NextResponse.json({ placement }, { status: 201 });
}
