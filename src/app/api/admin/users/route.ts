/**
 * /api/admin/users
 * GET  — list users (admin only)
 * POST — create user (admin only)
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";
import { auditFromSession } from "@/lib/audit";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!session.isSuperAdmin && !session.roles.includes("Admin")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const users = await db.user.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
    include: {
      userRoles: { include: { role: true } },
    },
  });

  return NextResponse.json({
    items: users.map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      email: u.email,
      isActive: u.isActive,
      isSuperAdmin: u.isSuperAdmin,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
      roles: u.userRoles.map((ur) => ur.role.code),
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!session.isSuperAdmin && !session.roles.includes("Admin")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { username, displayName, email, password, roleCodes, isSuperAdmin } = body;
  if (!username || !displayName || !password) {
    return NextResponse.json({ error: "username, displayName, password are required" }, { status: 400 });
  }

  // Check username uniqueness
  const existing = await db.user.findFirst({ where: { username: { equals: username.toLowerCase() } } });
  if (existing) {
    return NextResponse.json({ error: "Username already exists" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  try {
    const user = await db.user.create({
      data: {
        username: username.toLowerCase(),
        displayName,
        email: email ?? null,
        passwordHash,
        isSuperAdmin: Boolean(isSuperAdmin),
        isActive: true,
      },
    });

    // Assign roles
    if (Array.isArray(roleCodes) && roleCodes.length > 0) {
      const roles = await db.role.findMany({ where: { code: { in: roleCodes } } });
      for (const role of roles) {
        await db.userRole.create({ data: { userId: user.id, roleId: role.id } });
      }
    }

    await auditFromSession(session, {
      module: "admin", entityType: "user", entityId: user.id, action: "create",
      afterState: { id: user.id, username: user.username, displayName: user.displayName },
      sourceIp: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    });

    return NextResponse.json({
      user: {
        id: user.id, username: user.username, displayName: user.displayName,
        email: user.email, isSuperAdmin: user.isSuperAdmin,
      },
    }, { status: 201 });
  } catch (err) {
    console.error("[admin/users/create]", err);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
