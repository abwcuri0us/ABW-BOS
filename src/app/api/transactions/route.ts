/**
 * /api/transactions
 * GET — list transactions, POST — create transaction
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
  const category = url.searchParams.get("category") ?? "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "50", 10)));

  const where: Record<string, unknown> = { deletedAt: null };
  if (type) where.type = type;
  if (category) where.category = category;

  const [total, items] = await Promise.all([
    db.transaction.count({ where }),
    db.transaction.findMany({ where, orderBy: { transactionDate: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
  ]);

  return NextResponse.json({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { type, category, amount, currencyCode, transactionDate, paymentMode, partyId, description, notes, status } = body;
  if (!type || !category || amount == null) return NextResponse.json({ error: "type, category, amount required" }, { status: 400 });

  const count = await db.transaction.count();
  const transactionNumber = `TXN-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;

  try {
    const tx = await db.transaction.create({
      data: {
        transactionNumber, type, category, amount: Number(amount),
        currencyCode: currencyCode ?? "INR",
        transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
        paymentMode: paymentMode ?? "cash",
        partyId: partyId ?? null,
        description: description ?? null, notes: notes ?? null,
        status: status ?? "completed",
        createdBy: session.uid,
      },
    });
    await auditFromSession(session, { module: "transactions", entityType: "transaction", entityId: tx.id, action: "create", afterState: tx });
    return NextResponse.json({ transaction: tx }, { status: 201 });
  } catch (err) {
    console.error("[transactions/create]", err);
    return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
  }
}
