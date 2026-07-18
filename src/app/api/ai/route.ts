/**
 * /api/ai
 * POST — natural language query interface
 *
 * Uses z-ai-web-dev-sdk to answer questions about the business data.
 * The LLM receives a system prompt explaining the available data and
 * the user's question, and returns a natural language answer.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.query) return NextResponse.json({ error: "query is required" }, { status: 400 });

  const userQuery: string = body.query.trim();
  if (userQuery.length < 3) return NextResponse.json({ error: "Query too short" }, { status: 400 });

  // ─── Gather business context ──────────────────────────────────
  // Run multiple queries in parallel to build a snapshot of the business
  const [
    parties, products, invoices, glAccounts, auditRecent,
    partyCount, productCount, invoiceCount, invoiceStats,
  ] = await Promise.all([
    db.party.findMany({
      where: { deletedAt: null },
      take: 20,
      select: { id: true, displayName: true, partyType: true, subTypes: true, email: true, phone: true, taxId: true, creditLimit: true, isActive: true },
    }),
    db.product.findMany({
      where: { deletedAt: null },
      take: 20,
      select: { id: true, sku: true, name: true, category: true, salePrice: true, costPrice: true, isActive: true },
    }),
    db.invoice.findMany({
      where: { deletedAt: null },
      take: 30,
      orderBy: { invoiceDate: "desc" },
      select: {
        id: true, invoiceNumber: true, invoiceDate: true, dueDate: true,
        status: true, totalAmount: true, paidAmount: true, balanceDue: true,
        currencyCode: true,
        party: { select: { displayName: true } },
      },
    }),
    db.glAccount.findMany({
      where: { deletedAt: null, isActive: true },
      select: { code: true, name: true, accountType: true, openingBalance: true },
    }),
    db.auditLog.findMany({
      take: 15,
      orderBy: { ts: "desc" },
      select: { ts: true, action: true, module: true, entityType: true, entityId: true },
    }),
    db.party.count({ where: { deletedAt: null } }),
    db.product.count({ where: { deletedAt: null } }),
    db.invoice.count({ where: { deletedAt: null } }),
    db.invoice.aggregate({
      _sum: { totalAmount: true, paidAmount: true, balanceDue: true },
      where: { deletedAt: null },
    }),
  ]);

  // ─── Build context string ─────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const context = `
You are ABW-BOS AI, an assistant for the ABW Business Operating System.
Today is ${today}. The user is ${session.displayName} (username: ${session.username}).

BUSINESS SUMMARY:
- Parties (customers/suppliers): ${partyCount}
- Products: ${productCount}
- Invoices: ${invoiceCount}
- Total invoiced: ₹${(invoiceStats._sum.totalAmount ?? 0).toLocaleString("en-IN")}
- Total collected: ₹${(invoiceStats._sum.paidAmount ?? 0).toLocaleString("en-IN")}
- Outstanding balance: ₹${(invoiceStats._sum.balanceDue ?? 0).toLocaleString("en-IN")}

SAMPLE PARTIES (first 20):
${parties.map((p) => `- ${p.displayName} (${p.partyType}, ${p.subTypes}, ${p.isActive ? "active" : "inactive"}, ${p.email ?? "no email"}, credit limit: ₹${p.creditLimit ?? 0})`).join("\n")}

SAMPLE PRODUCTS (first 20):
${products.map((p) => `- ${p.sku}: ${p.name} (category: ${p.category ?? "n/a"}, sale: ₹${p.salePrice}, cost: ₹${p.costPrice})`).join("\n")}

RECENT INVOICES (last 30):
${invoices.map((i) => `- ${i.invoiceNumber}: ${i.party?.displayName ?? "?"} — ₹${i.totalAmount} (${i.status}, due ${i.dueDate.toISOString().slice(0, 10)}, balance ₹${i.balanceDue})`).join("\n")}

GL ACCOUNTS:
${glAccounts.map((a) => `- ${a.code} ${a.name} (${a.accountType}, opening ₹${a.openingBalance})`).join("\n")}

RECENT ACTIVITY (last 15):
${auditRecent.map((a) => `- ${a.ts.toISOString().slice(0, 16)}: ${a.action} on ${a.module}/${a.entityType}`).join("\n")}

INSTRUCTIONS:
- Answer the user's question based ONLY on the data above.
- Use ₹ for currency. Format numbers with Indian grouping (e.g. ₹1,23,456).
- Be concise but complete. Use bullet points for lists.
- If the question cannot be answered from the data, say so.
- Do not make up data. If unsure, say "I don't have enough information to answer that."
`.trim();

  // ─── Call the LLM ─────────────────────────────────────────────
  try {
    // Dynamically import to avoid bundling issues
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      model: "glm-4.6",
      messages: [
        { role: "system", content: context },
        { role: "user", content: userQuery },
      ],
      thinking: { type: "disabled" },
    });

    const answer = completion.choices?.[0]?.message?.content ?? "I couldn't generate a response.";

    return NextResponse.json({
      answer,
      query: userQuery,
      timestamp: new Date().toISOString(),
      contextStats: { parties: partyCount, products: productCount, invoices: invoiceCount },
    });
  } catch (err) {
    console.error("[ai] LLM call failed:", err);
    return NextResponse.json({
      error: "AI service unavailable. Please try again later.",
      details: err instanceof Error ? err.message : "Unknown error",
    }, { status: 503 });
  }
}
