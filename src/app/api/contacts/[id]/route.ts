/**
 * /api/contacts/[id]
 * GET    — fetch a single party
 * PUT    — update a party
 * DELETE — soft-delete a party
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
import { audit, auditFromSession, computeDiff } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await params;

  const party = await db.party.findFirst({
    where: { id, deletedAt: null },
    include: {
      addresses: { where: { deletedAt: null } },
      contactMethods: { where: { deletedAt: null } },
      owner: { select: { id: true, displayName: true } },
    },
  });
  if (!party) {
    return NextResponse.json({ error: "Party not found" }, { status: 404 });
  }
  return NextResponse.json({ party });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await params;

  const existing = await db.party.findFirst({ where: { id, deletedAt: null } });
  if (!existing) {
    return NextResponse.json({ error: "Party not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Only allow updatable fields (skip id, version, audit columns)
  const allowed = [
    "partyType", "subTypes", "displayName", "legalName", "firstName",
    "lastName", "salutation", "email", "phone", "taxId", "taxIdType",
    "currencyCode", "creditLimit", "paymentTermsDays", "isActive",
  ];
  const update: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in body) update[k] = body[k];
  }
  // Convert subTypes array to JSON string
  if (Array.isArray(update.subTypes)) {
    update.subTypes = JSON.stringify(update.subTypes);
  }

  // Optimistic concurrency: if version is provided, check it
  if (typeof body.version === "number" && body.version !== existing.version) {
    return NextResponse.json(
      {
        error: "Stale version",
        message:
          "This record was modified by another user or device. Please reload and try again.",
        currentVersion: existing.version,
      },
      { status: 409 },
    );
  }

  try {
    const updated = await db.party.update({
      where: { id },
      data: {
        ...update,
        version: existing.version + 1,
      },
      include: {
        addresses: { where: { deletedAt: null } },
        contactMethods: { where: { deletedAt: null } },
      },
    });

    // Compute diff for audit
    const beforeSnap: Record<string, unknown> = {
      partyType: existing.partyType,
      subTypes: existing.subTypes,
      displayName: existing.displayName,
      legalName: existing.legalName,
      firstName: existing.firstName,
      lastName: existing.lastName,
      email: existing.email,
      phone: existing.phone,
      taxId: existing.taxId,
      currencyCode: existing.currencyCode,
      creditLimit: existing.creditLimit,
      paymentTermsDays: existing.paymentTermsDays,
      isActive: existing.isActive,
    };
    const afterSnap: Record<string, unknown> = {
      partyType: updated.partyType,
      subTypes: updated.subTypes,
      displayName: updated.displayName,
      legalName: updated.legalName,
      firstName: updated.firstName,
      lastName: updated.lastName,
      email: updated.email,
      phone: updated.phone,
      taxId: updated.taxId,
      currencyCode: updated.currencyCode,
      creditLimit: updated.creditLimit,
      paymentTermsDays: updated.paymentTermsDays,
      isActive: updated.isActive,
    };

    await auditFromSession(session, {
      module: "contacts",
      entityType: "party",
      entityId: id,
      action: "update",
      beforeState: beforeSnap,
      afterState: afterSnap,
      diff: computeDiff(beforeSnap, afterSnap),
      sourceIp: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    });

    return NextResponse.json({ party: updated });
  } catch (err) {
    console.error("[contacts/update] error:", err);
    return NextResponse.json(
      { error: "Failed to update party" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await params;

  const existing = await db.party.findFirst({ where: { id, deletedAt: null } });
  if (!existing) {
    return NextResponse.json({ error: "Party not found" }, { status: 404 });
  }

  await db.party.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      version: existing.version + 1,
    },
  });

  await auditFromSession(session, {
    module: "contacts",
    entityType: "party",
    entityId: id,
    action: "delete",
    beforeState: existing,
    sourceIp: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
  });

  return NextResponse.json({ ok: true });
}
