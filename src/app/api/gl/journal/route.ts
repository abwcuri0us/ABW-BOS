/**
 * /api/gl/journal
 * GET  — list journal entries
 * POST — create + post a journal entry (with lines)
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
import { auditFromSession } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "50", 10)));

  const where: Record<string, unknown> = { deletedAt: null };
  if (status) where.status = status;

  const [total, entries] = await Promise.all([
    db.journalEntry.count({ where }),
    db.journalEntry.findMany({
      where,
      orderBy: { entryDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { lines: { include: { account: true } } },
    }),
  ]);

  return NextResponse.json({
    items: entries, total, page, pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { entryDate, description, referenceType, referenceId, lines, status } = body;
  if (!entryDate || !Array.isArray(lines) || lines.length < 2) {
    return NextResponse.json({ error: "entryDate and at least 2 lines are required" }, { status: 400 });
  }

  // Validate balanced
  const totalDebit = lines.reduce((s: number, l: any) => s + (Number(l.debitAmount) || 0), 0);
  const totalCredit = lines.reduce((s: number, l: any) => s + (Number(l.creditAmount) || 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return NextResponse.json({
      error: `Journal entry is not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}`,
    }, { status: 400 });
  }

  // Generate entry number
  const count = await db.journalEntry.count();
  const entryNumber = `JE-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;

  try {
    const entry = await db.journalEntry.create({
      data: {
        entryNumber,
        entryDate: new Date(entryDate),
        description: description ?? null,
        referenceType: referenceType ?? null,
        referenceId: referenceId ?? null,
        sourceModule: "gl",
        status: status ?? "posted",
        postedAt: status === "draft" ? null : new Date(),
        postedBy: status === "draft" ? null : session.uid,
        totalDebit,
        totalCredit,
        isBalanced: true,
        lines: {
          create: lines.map((l: any, idx: number) => ({
            lineNumber: idx + 1,
            accountId: l.accountId,
            debitAmount: Number(l.debitAmount) || 0,
            creditAmount: Number(l.creditAmount) || 0,
            description: l.description ?? null,
            partyId: l.partyId ?? null,
          })),
        },
      },
      include: { lines: { include: { account: true } } },
    });

    await auditFromSession(session, {
      module: "gl", entityType: "journal_entry", entityId: entry.id, action: "create", afterState: entry,
      sourceIp: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (err) {
    console.error("[gl/journal/create]", err);
    return NextResponse.json({ error: "Failed to create journal entry" }, { status: 500 });
  }
}
