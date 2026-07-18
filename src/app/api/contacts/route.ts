/**
 * /api/contacts
 * GET  — list parties (with optional filters: ?type=customer&q=&page=&pageSize=)
 * POST — create a new party
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
import { audit, auditFromSession } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const type = url.searchParams.get("type") ?? ""; // customer | supplier | etc.
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "20", 10)),
  );

  // Build where clause
  const where: Record<string, unknown> = { deletedAt: null };
  if (q) {
    where.OR = [
      { displayName: { contains: q } },
      { legalName: { contains: q } },
      { email: { contains: q } },
      { phone: { contains: q } },
      { taxId: { contains: q } },
    ];
  }
  if (type) {
    // subTypes is a JSON string array; SQLite doesn't have JSON ops, so we use contains
    where.subTypes = { contains: `"${type}"` };
  }

  const [total, parties] = await Promise.all([
    db.party.count({ where }),
    db.party.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        addresses: { where: { deletedAt: null } },
        contactMethods: { where: { deletedAt: null } },
      },
    }),
  ]);

  return NextResponse.json({
    items: parties,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    partyType,
    subTypes,
    displayName,
    legalName,
    firstName,
    lastName,
    salutation,
    email,
    phone,
    taxId,
    taxIdType,
    currencyCode,
    creditLimit,
    paymentTermsDays,
    addresses = [],
    contactMethods = [],
  } = body as Record<string, unknown>;

  // Validate required fields
  if (!partyType || !displayName) {
    return NextResponse.json(
      { error: "partyType and displayName are required" },
      { status: 400 },
    );
  }
  if (partyType !== "person" && partyType !== "organization") {
    return NextResponse.json(
      { error: "partyType must be 'person' or 'organization'" },
      { status: 400 },
    );
  }

  // Create the party (with addresses and contact methods in a nested write)
  try {
    const party = await db.party.create({
      data: {
        partyType: partyType as string,
        subTypes:
          Array.isArray(subTypes) && subTypes.length > 0
            ? JSON.stringify(subTypes)
            : "[]",
        displayName: displayName as string,
        legalName: legalName as string | null,
        firstName: firstName as string | null,
        lastName: lastName as string | null,
        salutation: salutation as string | null,
        email: email as string | null,
        phone: phone as string | null,
        taxId: taxId as string | null,
        taxIdType: taxIdType as string | null,
        currencyCode: (currencyCode as string) || "INR",
        creditLimit:
          typeof creditLimit === "number" ? creditLimit : null,
        paymentTermsDays:
          typeof paymentTermsDays === "number" ? paymentTermsDays : null,
        ownerId: session.uid,
        createdBy: session.uid,
        addresses: Array.isArray(addresses) ? {
          create: (addresses as Array<Record<string, unknown>>).map((a) => ({
            addressType: (a.addressType as string) ?? "billing",
            line1: a.line1 as string,
            line2: (a.line2 as string) ?? null,
            city: a.city as string,
            stateProvince: (a.stateProvince as string) ?? null,
            postalCode: (a.postalCode as string) ?? null,
            countryCode: (a.countryCode as string) ?? "IN",
            isDefault: Boolean(a.isDefault),
          })),
        } : undefined,
        contactMethods: Array.isArray(contactMethods) ? {
          create: (contactMethods as Array<Record<string, unknown>>).map((m) => ({
            methodType: (m.methodType as string) ?? "email",
            value: m.value as string,
            label: (m.label as string) ?? null,
            isDefault: Boolean(m.isDefault),
          })),
        } : undefined,
      },
      include: {
        addresses: { where: { deletedAt: null } },
        contactMethods: { where: { deletedAt: null } },
      },
    });

    await auditFromSession(session, {
      module: "contacts",
      entityType: "party",
      entityId: party.id,
      action: "create",
      afterState: party,
      sourceIp: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    });

    return NextResponse.json({ party }, { status: 201 });
  } catch (err) {
    console.error("[contacts/create] error:", err);
    return NextResponse.json(
      { error: "Failed to create party" },
      { status: 500 },
    );
  }
}
