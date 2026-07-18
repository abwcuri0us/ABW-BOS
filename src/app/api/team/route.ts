/** /api/team — GET list, POST create */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
import { auditFromSession } from "@/lib/audit";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const items = await db.teamMember.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.name) return NextResponse.json({ error: "name required" }, { status: 400 });
  try {
    const member = await db.teamMember.create({
      data: {
        name: body.name, email: body.email ?? null, phone: body.phone ?? null,
        role: body.role ?? "member", department: body.department ?? null,
        designation: body.designation ?? null, avatarColor: body.avatarColor ?? "#1B6D97",
        skills: JSON.stringify(body.skills ?? []),
      },
    });
    await auditFromSession(session, { module: "team", entityType: "member", entityId: member.id, action: "create", afterState: member });
    return NextResponse.json({ member }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create member (email may exist)" }, { status: 500 });
  }
}
