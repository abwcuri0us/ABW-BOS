/**
 * /api/reports
 * GET — generate financial reports
 *
 * Query params:
 *   type = trial_balance | profit_loss | balance_sheet | ar_aging
 *   fromDate = ISO date (optional)
 *   toDate = ISO date (optional, defaults to today)
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "trial_balance";
  const toDateStr = url.searchParams.get("toDate") ?? new Date().toISOString().slice(0, 10);
  const fromDateStr = url.searchParams.get("fromDate");
  const toDate = new Date(toDateStr);
  toDate.setHours(23, 59, 59, 999);
  const fromDate = fromDateStr ? new Date(fromDateStr) : new Date(toDate.getFullYear(), toDate.getMonth(), 1);
  fromDate.setHours(0, 0, 0, 0);

  if (type === "trial_balance") {
    return trialBalance(toDate);
  }
  if (type === "profit_loss") {
    return profitLoss(fromDate, toDate);
  }
  if (type === "balance_sheet") {
    return balanceSheet(toDate);
  }
  if (type === "ar_aging") {
    return arAging(toDate);
  }
  return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
}

/**
 * Trial Balance: list all accounts with their debit/credit balances.
 * Balance per account = opening + sum of journal lines.
 */
async function trialBalance(toDate: Date) {
  const accounts = await db.glAccount.findMany({
    where: { deletedAt: null, isActive: true },
    orderBy: [{ accountType: "asc" }, { code: "asc" }],
    include: {
      journalLines: {
        where: {
          journalEntry: {
            entryDate: { lte: toDate },
            status: { in: ["posted"] },
            deletedAt: null,
          },
        },
      },
    },
  });

  const rows = accounts.map((a) => {
    const movementDebit = a.journalLines.reduce((s, l) => s + l.debitAmount, 0);
    const movementCredit = a.journalLines.reduce((s, l) => s + l.creditAmount, 0);
    const opening = a.openingBalance;
    // For asset/expense accounts, debit increases balance; for liability/equity/revenue, credit increases
    let balance: number;
    if (a.accountType === "asset" || a.accountType === "expense") {
      balance = opening + movementDebit - movementCredit;
    } else {
      balance = opening + movementCredit - movementDebit;
    }
    return {
      code: a.code,
      name: a.name,
      accountType: a.accountType,
      debit: balance >= 0 ? Math.abs(balance) : 0,
      credit: balance < 0 ? Math.abs(balance) : 0,
    };
  });

  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);

  return NextResponse.json({
    type: "trial_balance",
    asOf: toDate.toISOString(),
    rows: rows.filter((r) => r.debit !== 0 || r.credit !== 0),
    totals: { debit: totalDebit, credit: totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 0.01 },
  });
}

/**
 * Profit & Loss: revenue and expenses for the period.
 */
async function profitLoss(fromDate: Date, toDate: Date) {
  const revenueAccounts = await db.glAccount.findMany({
    where: { deletedAt: null, isActive: true, accountType: "revenue" },
    orderBy: { code: "asc" },
    include: {
      journalLines: {
        where: {
          journalEntry: {
            entryDate: { gte: fromDate, lte: toDate },
            status: "posted",
            deletedAt: null,
          },
        },
      },
    },
  });

  const expenseAccounts = await db.glAccount.findMany({
    where: { deletedAt: null, isActive: true, accountType: "expense" },
    orderBy: { code: "asc" },
    include: {
      journalLines: {
        where: {
          journalEntry: {
            entryDate: { gte: fromDate, lte: toDate },
            status: "posted",
            deletedAt: null,
          },
        },
      },
    },
  });

  const revenue = revenueAccounts.map((a) => {
    const credit = a.journalLines.reduce((s, l) => s + l.creditAmount, 0);
    const debit = a.journalLines.reduce((s, l) => s + l.debitAmount, 0);
    return { code: a.code, name: a.name, amount: credit - debit };
  });
  const expenses = expenseAccounts.map((a) => {
    const debit = a.journalLines.reduce((s, l) => s + l.debitAmount, 0);
    const credit = a.journalLines.reduce((s, l) => s + l.creditAmount, 0);
    return { code: a.code, name: a.name, amount: debit - credit };
  });

  const totalRevenue = revenue.reduce((s, r) => s + r.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  return NextResponse.json({
    type: "profit_loss",
    fromDate: fromDate.toISOString(),
    toDate: toDate.toISOString(),
    revenue, expenses,
    totals: { revenue: totalRevenue, expenses: totalExpenses, netProfit },
  });
}

/**
 * Balance Sheet: assets, liabilities, equity as of a date.
 */
async function balanceSheet(toDate: Date) {
  const accounts = await db.glAccount.findMany({
    where: { deletedAt: null, isActive: true, accountType: { in: ["asset", "liability", "equity"] } },
    orderBy: [{ accountType: "asc" }, { code: "asc" }],
    include: {
      journalLines: {
        where: {
          journalEntry: {
            entryDate: { lte: toDate },
            status: "posted",
            deletedAt: null,
          },
        },
      },
    },
  });

  const compute = (a: typeof accounts[0]) => {
    const movementDebit = a.journalLines.reduce((s, l) => s + l.debitAmount, 0);
    const movementCredit = a.journalLines.reduce((s, l) => s + l.creditAmount, 0);
    if (a.accountType === "asset") return a.openingBalance + movementDebit - movementCredit;
    return a.openingBalance + movementCredit - movementDebit;
  };

  const assets = accounts.filter((a) => a.accountType === "asset").map((a) => ({
    code: a.code, name: a.name, amount: compute(a),
  }));
  const liabilities = accounts.filter((a) => a.accountType === "liability").map((a) => ({
    code: a.code, name: a.name, amount: compute(a),
  }));
  const equity = accounts.filter((a) => a.accountType === "equity").map((a) => ({
    code: a.code, name: a.name, amount: compute(a),
  }));

  const totalAssets = assets.reduce((s, a) => s + a.amount, 0);
  const totalLiabilities = liabilities.reduce((s, l) => s + l.amount, 0);
  const totalEquity = equity.reduce((s, e) => s + e.amount, 0);

  return NextResponse.json({
    type: "balance_sheet",
    asOf: toDate.toISOString(),
    assets, liabilities, equity,
    totals: {
      assets: totalAssets,
      liabilities: totalLiabilities,
      equity: totalEquity,
      balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
    },
  });
}

/**
 * AR Aging: outstanding invoices grouped by age buckets.
 */
async function arAging(toDate: Date) {
  const invoices = await db.invoice.findMany({
    where: {
      deletedAt: null,
      status: { in: ["sent", "viewed", "partial", "overdue"] },
      balanceDue: { gt: 0 },
    },
    include: { party: { select: { displayName: true } } },
    orderBy: { dueDate: "asc" },
  });

  const now = toDate.getTime();
  const buckets = {
    current: [] as Array<Record<string, unknown>>,
    "1_30": [] as Array<Record<string, unknown>>,
    "31_60": [] as Array<Record<string, unknown>>,
    "61_90": [] as Array<Record<string, unknown>>,
    "90_plus": [] as Array<Record<string, unknown>>,
  };

  let totalOutstanding = 0;
  for (const inv of invoices) {
    const dueDate = new Date(inv.dueDate).getTime();
    const daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
    const row = {
      invoiceNumber: inv.invoiceNumber,
      customer: inv.party?.displayName ?? "",
      invoiceDate: inv.invoiceDate,
      dueDate: inv.dueDate,
      totalAmount: inv.totalAmount,
      balanceDue: inv.balanceDue,
      currencyCode: inv.currencyCode,
      daysOverdue: Math.max(0, daysOverdue),
    };
    if (daysOverdue <= 0) buckets.current.push(row);
    else if (daysOverdue <= 30) buckets["1_30"].push(row);
    else if (daysOverdue <= 60) buckets["31_60"].push(row);
    else if (daysOverdue <= 90) buckets["61_90"].push(row);
    else buckets["90_plus"].push(row);
    totalOutstanding += inv.balanceDue;
  }

  const totals = {
    current: buckets.current.reduce((s, r) => s + (r.balanceDue as number), 0),
    "1_30": buckets["1_30"].reduce((s, r) => s + (r.balanceDue as number), 0),
    "31_60": buckets["31_60"].reduce((s, r) => s + (r.balanceDue as number), 0),
    "61_90": buckets["61_90"].reduce((s, r) => s + (r.balanceDue as number), 0),
    "90_plus": buckets["90_plus"].reduce((s, r) => s + (r.balanceDue as number), 0),
  };

  return NextResponse.json({
    type: "ar_aging",
    asOf: toDate.toISOString(),
    buckets, totals, totalOutstanding,
  });
}
