/**
 * ABW-BOS Database Seed
 *
 * Creates:
 * - 1 super-admin user (admin / admin123 — change in production)
 * - 6 default roles (SuperAdmin, Admin, Manager, Staff, Auditor, Guest)
 * - Default permissions for the contacts module
 * - Role-permission assignments
 * - 3 sample parties (1 customer, 1 supplier, 1 organization) for demo
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding ABW-BOS database...");

  // ─── Roles ─────────────────────────────────────────────────
  const roles = [
    { code: "SuperAdmin", name: "Super Administrator", description: "Full access including user management", isSystem: true },
    { code: "Admin", name: "Administrator", description: "Full business-module access, no module install", isSystem: true },
    { code: "Manager", name: "Manager", description: "Read/write within assigned scope", isSystem: true },
    { code: "Staff", name: "Staff", description: "Read/write, no destructive operations", isSystem: true },
    { code: "Auditor", name: "Auditor", description: "Read-only across all modules", isSystem: true },
    { code: "Guest", name: "Guest", description: "Read-only on restricted subset", isSystem: true },
  ];

  for (const r of roles) {
    await prisma.role.upsert({
      where: { code: r.code },
      update: {},
      create: r,
    });
  }
  console.log(`✓ ${roles.length} roles`);

  // ─── Permissions ───────────────────────────────────────────
  const permissions = [
    // contacts module
    { moduleId: "contacts", resource: "parties", action: "read", description: "View parties" },
    { moduleId: "contacts", resource: "parties", action: "write", description: "Create/update parties" },
    { moduleId: "contacts", resource: "parties", action: "delete", description: "Delete parties" },
    { moduleId: "contacts", resource: "addresses", action: "read", description: "View addresses" },
    { moduleId: "contacts", resource: "addresses", action: "write", description: "Create/update addresses" },
    // audit module
    { moduleId: "audit", resource: "log", action: "read", description: "View audit log" },
    // settings module
    { moduleId: "settings", resource: "all", action: "read", description: "View settings" },
    { moduleId: "settings", resource: "all", action: "write", description: "Modify settings" },
    // dashboard
    { moduleId: "dashboard", resource: "all", action: "read", description: "View dashboard" },
    // notifications
    { moduleId: "notifications", resource: "all", action: "read", description: "View notifications" },
    // users (admin only)
    { moduleId: "admin", resource: "users", action: "read", description: "View users" },
    { moduleId: "admin", resource: "users", action: "write", description: "Manage users" },
    { moduleId: "admin", resource: "roles", action: "read", description: "View roles" },
    { moduleId: "admin", resource: "roles", action: "write", description: "Manage roles" },
  ];

  for (const p of permissions) {
    await prisma.permission.upsert({
      where: {
        moduleId_resource_action: {
          moduleId: p.moduleId,
          resource: p.resource,
          action: p.action,
        },
      },
      update: {},
      create: p,
    });
  }
  console.log(`✓ ${permissions.length} permissions`);

  // ─── Role-Permission assignments ───────────────────────────
  const superAdmin = await prisma.role.findUnique({ where: { code: "SuperAdmin" } });
  const admin = await prisma.role.findUnique({ where: { code: "Admin" } });
  const manager = await prisma.role.findUnique({ where: { code: "Manager" } });
  const staff = await prisma.role.findUnique({ where: { code: "Staff" } });
  const auditor = await prisma.role.findUnique({ where: { code: "Auditor" } });

  if (!superAdmin || !admin || !manager || !staff || !auditor) {
    throw new Error("Required roles not found");
  }

  // SuperAdmin + Admin + Manager + Staff get all contacts permissions
  const contactsPerms = await prisma.permission.findMany({
    where: { moduleId: "contacts" },
  });
  for (const role of [superAdmin, admin, manager, staff]) {
    for (const p of contactsPerms) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: p.id } },
        update: {},
        create: { roleId: role.id, permissionId: p.id },
      });
    }
  }
  // Auditor gets read-only on contacts
  const contactsRead = contactsPerms.filter((p) => p.action === "read");
  for (const p of contactsRead) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: auditor.id, permissionId: p.id } },
      update: {},
      create: { roleId: auditor.id, permissionId: p.id },
    });
  }

  // Audit log: SuperAdmin, Admin, Auditor can read
  const auditRead = await prisma.permission.findUnique({
    where: {
      moduleId_resource_action: {
        moduleId: "audit",
        resource: "log",
        action: "read",
      },
    },
  });
  if (auditRead) {
    for (const role of [superAdmin, admin, auditor]) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: auditRead.id } },
        update: {},
        create: { roleId: role.id, permissionId: auditRead.id },
      });
    }
  }

  // Dashboard + Notifications: everyone gets read
  const dashboardRead = await prisma.permission.findUnique({
    where: {
      moduleId_resource_action: {
        moduleId: "dashboard",
        resource: "all",
        action: "read",
      },
    },
  });
  const notifRead = await prisma.permission.findUnique({
    where: {
      moduleId_resource_action: {
        moduleId: "notifications",
        resource: "all",
        action: "read",
      },
    },
  });
  if (dashboardRead && notifRead) {
    for (const role of [superAdmin, admin, manager, staff, auditor]) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: dashboardRead.id } },
        update: {},
        create: { roleId: role.id, permissionId: dashboardRead.id },
      });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: notifRead.id } },
        update: {},
        create: { roleId: role.id, permissionId: notifRead.id },
      });
    }
  }

  // Settings: admin+ can write, everyone reads
  const settingsRead = await prisma.permission.findUnique({
    where: {
      moduleId_resource_action: {
        moduleId: "settings",
        resource: "all",
        action: "read",
      },
    },
  });
  const settingsWrite = await prisma.permission.findUnique({
    where: {
      moduleId_resource_action: {
        moduleId: "settings",
        resource: "all",
        action: "write",
      },
    },
  });
  if (settingsRead && settingsWrite) {
    for (const role of [superAdmin, admin, manager, staff, auditor]) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: settingsRead.id } },
        update: {},
        create: { roleId: role.id, permissionId: settingsRead.id },
      });
    }
    for (const role of [superAdmin, admin]) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: settingsWrite.id } },
        update: {},
        create: { roleId: role.id, permissionId: settingsWrite.id },
      });
    }
  }

  // Admin permissions
  const adminPerms = await prisma.permission.findMany({
    where: { moduleId: "admin" },
  });
  for (const p of adminPerms) {
    if (p.action === "read") {
      for (const role of [superAdmin, admin, auditor]) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: p.id } },
          update: {},
          create: { roleId: role.id, permissionId: p.id },
        });
      }
    } else {
      for (const role of [superAdmin, admin]) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: p.id } },
          update: {},
          create: { roleId: role.id, permissionId: p.id },
        });
      }
    }
  }

  // ─── Super-admin user ──────────────────────────────────────
  const passwordHash = await bcrypt.hash("admin123", 10);
  const user = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      displayName: "System Administrator",
      email: "admin@abwcurious.local",
      passwordHash,
      isSuperAdmin: true,
      isActive: true,
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: superAdmin.id } },
    update: {},
    create: { userId: user.id, roleId: superAdmin.id },
  });
  console.log(`✓ super-admin user (admin / admin123)`);

  // ─── Sample parties ────────────────────────────────────────
  const sampleParties = [
    {
      partyType: "organization",
      subTypes: JSON.stringify(["customer"]),
      displayName: "Acme Industries Pvt Ltd",
      legalName: "Acme Industries Private Limited",
      email: "accounts@acme.example",
      phone: "+91 22 4567 8901",
      taxId: "27AABCA1234L1Z5",
      taxIdType: "gst",
      currencyCode: "INR",
      creditLimit: 500000,
      paymentTermsDays: 30,
    },
    {
      partyType: "organization",
      subTypes: JSON.stringify(["supplier"]),
      displayName: "Zenith Supplies Co",
      legalName: "Zenith Supplies Company",
      email: "sales@zenith.example",
      phone: "+91 80 2345 6789",
      taxId: "29AAFCZ5678P1Z2",
      taxIdType: "gst",
      currencyCode: "INR",
      paymentTermsDays: 15,
    },
    {
      partyType: "person",
      subTypes: JSON.stringify(["customer"]),
      displayName: "Rajesh Kumar",
      firstName: "Rajesh",
      lastName: "Kumar",
      email: "rajesh.kumar@example.com",
      phone: "+91 98765 43210",
      currencyCode: "INR",
      creditLimit: 50000,
      paymentTermsDays: 7,
    },
    {
      partyType: "organization",
      subTypes: JSON.stringify(["customer", "supplier"]),
      displayName: "Global Trade House",
      legalName: "Global Trade House LLP",
      email: "info@globaltrade.example",
      phone: "+91 11 9876 5432",
      taxId: "07AAFCG9012Q1Z8",
      taxIdType: "gst",
      currencyCode: "INR",
      creditLimit: 1000000,
      paymentTermsDays: 45,
    },
    {
      partyType: "person",
      subTypes: JSON.stringify(["supplier"]),
      displayName: "Priya Sharma",
      firstName: "Priya",
      lastName: "Sharma",
      email: "priya.sharma@example.com",
      phone: "+91 99887 76655",
      currencyCode: "INR",
      paymentTermsDays: 30,
    },
  ];

  for (const p of sampleParties) {
    const existing = await prisma.party.findFirst({
      where: { displayName: p.displayName, deletedAt: null },
    });
    if (!existing) {
      await prisma.party.create({
        data: {
          ...p,
          ownerId: user.id,
          createdBy: user.id,
        },
      });
    }
  }
  console.log(`✓ ${sampleParties.length} sample parties`);

  // ─── Sample notification ───────────────────────────────────
  const existingNotif = await prisma.notification.findFirst();
  if (!existingNotif) {
    const notif = await prisma.notification.create({
      data: {
        type: "system",
        module: "kernel",
        title: "Welcome to ABW-BOS",
        body: "Your Business Operating System is ready. Start by exploring the Contacts module or check the Dashboard for an overview.",
        urgency: "medium",
      },
    });
    await prisma.notificationDelivery.create({
      data: {
        notificationId: notif.id,
        userId: user.id,
        channel: "in_app",
        status: "delivered",
        deliveredAt: new Date(),
      },
    });
    console.log("✓ welcome notification");
  }

  console.log("\n✅ Seed complete.");
  console.log("   Login: admin / admin123");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
