/**
 * /api/gl/accounts
 * GET  — list accounts (with optional ?type= filter)
 * POST — create account
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
import { auditFromSession } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "";
  const where: Record<string, unknown> = { deletedAt: null };
  if (type) where.accountType = type;

  const accounts = await db.glAccount.findMany({
    where,
    orderBy: [{ accountType: "asc" }, { code: "asc" }],
  });
  return NextResponse.json({ items: accounts });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { code, name, accountType, subType, parentAccountId, isGroup, currencyCode, openingBalance, description } = body;
  if (!code || !name || !accountType) {
    return NextResponse.json({ error: "code, name, accountType are required" }, { status: 400 });
  }
  if (!["asset", "liability", "equity", "revenue", "expense"].includes(accountType)) {
    return NextResponse.json({ error: "Invalid accountType" }, { status: 400 });
  }

  try {
    const account = await db.glAccount.create({
      data: {
        code,
        name,
        accountType,
        subType: subType ?? null,
        parentAccountId: parentAccountId ?? null,
        isGroup: Boolean(isGroup),
        currencyCode: currencyCode ?? "INR",
        openingBalance: Number(openingBalance) || 0,
        description: description ?? null,
      },
    });
    await auditFromSession(session, {
      module: "gl", entityType: "account", entityId: account.id, action: "create", afterState: account,
      sourceIp: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    });
    return NextResponse.json({ account }, { status: 201 });
  } catch (err) {
    console.error("[gl/accounts/create]", err);
    return NextResponse.json({ error: "Failed to create account (code may already exist)" }, { status: 500 });
  }
}
