/** /api/gst — GET list, POST create filing */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const items = await db.gstFiling.findMany({ orderBy: { period: "desc" } });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.returnType || !body?.period) return NextResponse.json({ error: "returnType and period required" }, { status: 400 });

  const count = await db.gstFiling.count();
  const filingNumber = `GST-${body.period}-${body.returnType.toUpperCase()}-${String(count + 1).padStart(3, "0")}`;

  const filing = await db.gstFiling.create({
    data: {
      filingNumber,
      returnType: body.returnType,
      period: body.period,
      dueDate: body.dueDate ? new Date(body.dueDate) : new Date(),
      filingDate: body.status === "filed" ? new Date() : null,
      status: body.status ?? "pending",
      totalTaxableValue: Number(body.totalTaxableValue) || 0,
      totalOutputTax: Number(body.totalOutputTax) || 0,
      totalInputTax: Number(body.totalInputTax) || 0,
      netTaxPayable: (Number(body.totalOutputTax) || 0) - (Number(body.totalInputTax) || 0),
      igstAmount: Number(body.igstAmount) || 0,
      cgstAmount: Number(body.cgstAmount) || 0,
      sgstAmount: Number(body.sgstAmount) || 0,
      cessAmount: Number(body.cessAmount) || 0,
      notes: body.notes ?? null,
    },
  });
  return NextResponse.json({ filing }, { status: 201 });
}
