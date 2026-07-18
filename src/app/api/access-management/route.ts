/**
 * /api/access-management
 * GET  — returns all roles with their module access
 * PUT  — update a role's module access (grant/revoke modules)
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";

const ALL_MODULES = [
  { id: "dashboard", label: "Dashboard", section: "Overview" },
  { id: "contacts", label: "Contacts", section: "Sales" },
  { id: "quotations", label: "Quotations", section: "Sales" },
  { id: "invoicing", label: "Invoicing", section: "Sales" },
  { id: "inventory", label: "Inventory", section: "Operations" },
  { id: "scrum", label: "Scrum Board", section: "Operations" },
  { id: "team", label: "Team", section: "Operations" },
  { id: "hr", label: "Human Resources", section: "Operations" },
  { id: "schedule", label: "Schedule", section: "Operations" },
  { id: "notes", label: "Notes", section: "Operations" },
  { id: "payroll", label: "Payroll", section: "Finance" },
  { id: "gl", label: "General Ledger", section: "Finance" },
  { id: "transactions", label: "Transactions", section: "Finance" },
  { id: "bills", label: "Bills", section: "Finance" },
  { id: "payments", label: "Payments", section: "Finance" },
  { id: "gst", label: "GST Filings", section: "Finance" },
  { id: "reports", label: "Reports", section: "Finance" },
  { id: "ai", label: "AI Assistant", section: "Finance" },
  { id: "advisory", label: "AI Advisory", section: "Finance" },
  { id: "tools", label: "Tools", section: "Utilities" },
  { id: "audit", label: "Audit Log", section: "System" },
  { id: "loginHistory", label: "Login History", section: "System" },
  { id: "systemLogs", label: "System Logs", section: "System" },
  { id: "companyProfile", label: "Company Profile", section: "System" },
  { id: "admin", label: "User Management", section: "System" },
  { id: "accessManagement", label: "Access Management", section: "System" },
  { id: "settings", label: "Settings", section: "System" },
];

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const roles = await db.role.findMany({
    where: { deletedAt: null },
    orderBy: { code: "asc" },
    include: { permissions: true },
  });

  const accessSettings = await db.setting.findMany({
    where: { scope: "system", key: { startsWith: "access." } },
  });

  const accessMap: Record<string, string[]> = {};
  for (const s of accessSettings) {
    const roleCode = s.key.replace("access.", "");
    try { accessMap[roleCode] = JSON.parse(s.value); } catch { accessMap[roleCode] = []; }
  }
  accessMap["SuperAdmin"] = ALL_MODULES.map(m => m.id);

  return NextResponse.json({
    roles: roles.map(r => ({
      id: r.id, code: r.code, name: r.name, description: r.description, isSystem: r.isSystem,
      modules: accessMap[r.code] ?? (r.code === "SuperAdmin" ? ALL_MODULES.map(m => m.id) : ["dashboard"]),
    })),
    allModules: ALL_MODULES,
    userRoles: session.roles,
    isSuperAdmin: session.isSuperAdmin,
  });
}

export async function PUT(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!session.isSuperAdmin && !session.roles.includes("Admin")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (!body?.roleCode || !Array.isArray(body.modules)) {
    return NextResponse.json({ error: "roleCode and modules array required" }, { status: 400 });
  }
  const { roleCode, modules } = body;
  if (roleCode === "SuperAdmin") {
    return NextResponse.json({ error: "Cannot modify SuperAdmin access" }, { status: 403 });
  }
  const existing = await db.setting.findFirst({ where: { scope: "system", key: `access.${roleCode}` } });
  if (existing) {
    await db.setting.update({ where: { id: existing.id }, data: { value: JSON.stringify(modules), valueType: "array" } });
  } else {
    await db.setting.create({ data: { scope: "system", key: `access.${roleCode}`, value: JSON.stringify(modules), valueType: "array" } });
  }
  return NextResponse.json({ ok: true, roleCode, modules });
}
