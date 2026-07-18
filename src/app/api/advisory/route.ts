/**
 * /api/advisory
 * GET — list past advisory sessions
 * POST — ask a new advisory question (uses z-ai-web-dev-sdk with strategic-advisor system prompt)
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const items = await db.advisorySession.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.question) return NextResponse.json({ error: "question required" }, { status: 400 });

  const { question, category = "general" } = body;

  // ─── Gather business context ──────────────────────────────────
  const [
    partyCount, productCount, invoiceCount, invoiceStats,
    outstandingAmount, lowStockCount, teamCount, activeProjects,
  ] = await Promise.all([
    db.party.count({ where: { deletedAt: null } }),
    db.product.count({ where: { deletedAt: null } }),
    db.invoice.count({ where: { deletedAt: null } }),
    db.invoice.aggregate({ _sum: { totalAmount: true, paidAmount: true }, where: { deletedAt: null } }),
    db.invoice.aggregate({ _sum: { balanceDue: true }, where: { deletedAt: null, status: { in: ["sent", "viewed", "partial", "overdue"] } } }),
    db.stock.count({ where: { quantityOnHand: { lt: 10 } } }),
    db.teamMember.count({ where: { deletedAt: null, isActive: true } }),
    db.scrumProject.count({ where: { deletedAt: null, status: "active" } }),
  ]);

  const context = `
You are a senior business advisor for ABWcurious, a company using ABW-BOS (Business Operating System).
Today is ${new Date().toISOString().slice(0, 10)}.

BUSINESS SNAPSHOT:
- Customers/parties: ${partyCount}
- Products: ${productCount}
- Invoices: ${invoiceCount}
- Total revenue invoiced: ₹${(invoiceStats._sum.totalAmount ?? 0).toLocaleString("en-IN")}
- Revenue collected: ₹${(invoiceStats._sum.paidAmount ?? 0).toLocaleString("en-IN")}
- Outstanding receivables: ₹${(outstandingAmount._sum.balanceDue ?? 0).toLocaleString("en-IN")}
- Low-stock products: ${lowStockCount}
- Team members: ${teamCount}
- Active projects: ${activeProjects}

ADVISORY CATEGORY: ${category}

Your role is to provide strategic, actionable, and specific advice. Structure your response as:

## Assessment
[Brief assessment of the situation based on the data]

## Key Insights
- [Insight 1]
- [Insight 2]
- [Insight 3]

## Recommendations
1. [Specific, actionable recommendation with rationale]
2. [Specific, actionable recommendation with rationale]
3. [Specific, actionable recommendation with rationale]

## Follow-up Questions
- [Question 1 for the user to consider]
- [Question 2]

Be specific to the data provided. Use ₹ for currency. Be concise but thorough.
`.trim();

  try {
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      model: "glm-4.6",
      messages: [
        { role: "system", content: context },
        { role: "user", content: question },
      ],
      thinking: { type: "disabled" },
    });
    const answer = completion.choices?.[0]?.message?.content ?? "I couldn't generate advice.";

    // Parse the structured response into sections
    const insights = extractSection(answer, "Key Insights");
    const recommendations = extractSection(answer, "Recommendations");
    const followUpQuestions = extractSection(answer, "Follow-up Questions");

    const advisory = await db.advisorySession.create({
      data: {
        topic: question.slice(0, 100),
        category,
        question,
        answer,
        insights: JSON.stringify(insights),
        recommendations: JSON.stringify(recommendations),
        followUpQuestions: JSON.stringify(followUpQuestions),
        createdBy: session.uid,
      },
    });

    return NextResponse.json({ advisory, answer });
  } catch (err) {
    console.error("[advisory] LLM call failed:", err);
    return NextResponse.json({
      error: "Advisory service unavailable",
      details: err instanceof Error ? err.message : "Unknown error",
    }, { status: 503 });
  }
}

/** Extract bullet points from a section of the LLM response */
function extractSection(text: string, sectionName: string): string[] {
  const regex = new RegExp(`## ${sectionName}\\s*\\n([\\s\\S]*?)(?=## |$)`, "i");
  const match = text.match(regex);
  if (!match) return [];
  return match[1]
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && (l.startsWith("-") || l.startsWith("*") || /^\d+\./.test(l)))
    .map((l) => l.replace(/^[-*]\s*/, "").replace(/^\d+\.\s*/, ""));
}
