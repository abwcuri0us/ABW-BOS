import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
export async function GET(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const url = new URL(req.url);
  const letterType = url.searchParams.get("type") ?? "";
  const where: Record<string, unknown> = { deletedAt: null };
  if (letterType) where.letterType = letterType;
  const items = await db.letter.findMany({ where, orderBy: { issueDate: "desc" } });
  return NextResponse.json({ items });
}
export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.letterType || !body?.recipientName) return NextResponse.json({ error: "letterType and recipientName required" }, { status: 400 });
  const count = await db.letter.count();
  const letterNumber = `LTR-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;
  const letter = await db.letter.create({
    data: {
      letterNumber, letterType: body.letterType,
      recipientName: body.recipientName, recipientEmail: body.recipientEmail ?? null,
      recipientAddress: body.recipientAddress ?? null,
      subject: body.subject ?? "", body: body.body ?? "",
      employeeId: body.employeeId ?? null, internId: body.internId ?? null,
      issueDate: body.issueDate ? new Date(body.issueDate) : new Date(),
      status: body.status ?? "draft", createdBy: session.uid,
    },
  });
  return NextResponse.json({ letter }, { status: 201 });
}
