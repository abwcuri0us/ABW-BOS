import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const items = await db.certification.findMany({ orderBy: { issueDate: "desc" } });
  return NextResponse.json({ items });
}
export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.title || !body?.holderName) return NextResponse.json({ error: "title and holderName required" }, { status: 400 });
  const count = await db.certification.count();
  const certCode = `CERT-${String(count + 1).padStart(4, "0")}`;
  const cert = await db.certification.create({
    data: {
      certCode, title: body.title, description: body.description ?? null,
      issuingBody: body.issuingBody ?? "",
      issueDate: body.issueDate ? new Date(body.issueDate) : new Date(),
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
      holderType: body.holderType ?? "employee",
      holderName: body.holderName, holderId: body.holderId ?? null,
      certificateUrl: body.certificateUrl ?? null, status: body.status ?? "valid",
    },
  });
  return NextResponse.json({ cert }, { status: 201 });
}
