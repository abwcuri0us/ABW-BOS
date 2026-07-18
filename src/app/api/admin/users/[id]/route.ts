/**
 * /api/admin/users/[id]
 * PATCH  — update user (active toggle, roles)
 * DELETE — soft-delete user
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
import { auditFromSession } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!session.isSuperAdmin && !session.roles.includes("Admin")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }
  const { id } = await params;

  const existing = await db.user.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { isActive, displayName, email, roleCodes } = body;
  const update: Record<string, unknown> = {};
  if (typeof isActive === "boolean") update.isActive = isActive;
  if (typeof displayName === "string") update.displayName = displayName;
  if (typeof email === "string") update.email = email || null;

  const updated = await db.user.update({ where: { id }, data: update });

  // Reassign roles if provided
  if (Array.isArray(roleCodes)) {
    await db.userRole.deleteMany({ where: { userId: id } });
    if (roleCodes.length > 0) {
      const roles = await db.role.findMany({ where: { code: { in: roleCodes } } });
      for (const role of roles) {
        await db.userRole.create({ data: { userId: id, roleId: role.id } });
      }
    }
  }

  await auditFromSession(session, {
    module: "admin", entityType: "user", entityId: id, action: "update",
    beforeState: { isActive: existing.isActive, displayName: existing.displayName },
    afterState: { isActive: updated.isActive, displayName: updated.displayName },
    sourceIp: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
  });

  return NextResponse.json({ user: updated });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!session.isSuperAdmin && !session.roles.includes("Admin")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }
  const { id } = await params;

  if (id === session.uid) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  const existing = await db.user.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.user.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  await auditFromSession(session, {
    module: "admin", entityType: "user", entityId: id, action: "delete", beforeState: existing,
    sourceIp: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
  });
  return NextResponse.json({ ok: true });
}
