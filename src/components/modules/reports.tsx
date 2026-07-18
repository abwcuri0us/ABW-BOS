"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  BarChart3, FileText, Download, FileSpreadsheet, Printer, Loader2, TrendingUp, TrendingDown, Scale, Clock,
} from "lucide-react";
import { exportCSV, exportExcel, printHTML, formatINR, formatDate } from "@/lib/export";
import { cn } from "@/lib/utils";

type ReportType = "trial_balance" | "profit_loss" | "balance_sheet" | "ar_aging";

export function ReportsContent() {
  const [tab, setTab] = React.useState<ReportType>("trial_balance");

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-6 w-6" /> Reports
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Financial statements, trial balance, and AR aging
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as ReportType)}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="trial_balance" className="text-xs"><Scale className="h-3.5 w-3.5 mr-1.5" /> Trial Balance</TabsTrigger>
          <TabsTrigger value="profit_loss" className="text-xs"><TrendingUp className="h-3.5 w-3.5 mr-1.5" /> P&amp;L Statement</TabsTrigger>
          <TabsTrigger value="balance_sheet" className="text-xs"><FileText className="h-3.5 w-3.5 mr-1.5" /> Balance Sheet</TabsTrigger>
          <TabsTrigger value="ar_aging" className="text-xs"><Clock className="h-3.5 w-3.5 mr-1.5" /> AR Aging</TabsTrigger>
        </TabsList>

        <TabsContent value="trial_balance" className="mt-4">
          <TrialBalanceReport />
        </TabsContent>
        <TabsContent value="profit_loss" className="mt-4">
          <ProfitLossReport />
        </TabsContent>
        <TabsContent value="balance_sheet" className="mt-4">
          <BalanceSheetReport />
        </TabsContent>
        <TabsContent value="ar_aging" className="mt-4">
          <ArAgingReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// Shared report controls
// ============================================================

function DateRangeControls({
  fromDate, setFromDate, toDate, setToDate, showFrom = true,
}: {
  fromDate: string; setFromDate: (v: string) => void;
  toDate: string; setToDate: (v: string) => void;
  showFrom?: boolean;
}) {
  return (
    <div className="flex gap-3 items-end flex-wrap">
      {showFrom && (
        <div className="space-y-1.5">
          <Label className="text-xs">From Date</Label>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-40" />
        </div>
      )}
      <div className="space-y-1.5">
        <Label className="text-xs">As Of Date</Label>
        <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-40" />
      </div>
    </div>
  );
}

function ExportButtons({
  onCSV, onExcel, onPrint, rows,
}: {
  onCSV: () => void; onExcel: () => void; onPrint: () => void; rows: number;
}) {
  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={onCSV} disabled={rows === 0}>
        <Download className="mr-1.5 h-3.5 w-3.5" /> CSV
      </Button>
      <Button variant="outline" size="sm" onClick={onExcel} disabled={rows === 0}>
        <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" /> Excel
      </Button>
      <Button variant="outline" size="sm" onClick={onPrint} disabled={rows === 0}>
        <Printer className="mr-1.5 h-3.5 w-3.5" /> Print PDF
      </Button>
    </div>
  );
}

// ============================================================
// Trial Balance
// ============================================================

interface TBRow { code: string; name: string; accountType: string; debit: number; credit: number; }
interface TBData { type: string; asOf: string; rows: TBRow[]; totals: { debit: number; credit: number; balanced: boolean; }; }

function TrialBalanceReport() {
  const [data, setData] = React.useState<TBData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [toDate, setToDate] = React.useState(new Date().toISOString().slice(0, 10));

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?type=trial_balance&toDate=${toDate}`, { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } finally { setLoading(false); }
  }, [toDate]);

  React.useEffect(() => { load(); }, [load]);

  const rows = data?.rows ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex justify-between items-end gap-4 flex-wrap">
          <DateRangeControls fromDate="" setFromDate={() => {}} toDate={toDate} setToDate={setToDate} showFrom={false} />
          <ExportButtons rows={rows.length}
            onCSV={() => exportCSV("trial_balance", rows as unknown as Record<string, unknown>[])}
            onExcel={() => exportExcel("trial_balance", rows as unknown as Record<string, unknown>[], "Trial Balance")}
            onPrint={() => printTB(data!)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Trial Balance</span>
            {data && (
              <Badge variant={data.totals.balanced ? "default" : "destructive"} className="text-[10px]">
                {data.totals.balanced ? "BALANCED" : "NOT BALANCED"}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>As of {data ? formatDate(data.asOf) : "—"}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> Loading…</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No accounts with balances</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-24">Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead className="w-32">Type</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.code}>
                    <TableCell className="font-mono text-xs">{r.code}</TableCell>
                    <TableCell className="text-sm">{r.name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[9px] capitalize">{r.accountType}</Badge></TableCell>
                    <TableCell className="text-right tabular-nums">{r.debit > 0 ? r.debit.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : ""}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.credit > 0 ? r.credit.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : ""}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2 border-border font-bold">
                  <TableCell colSpan={3}>Total</TableCell>
                  <TableCell className="text-right tabular-nums">{data?.totals.debit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right tabular-nums">{data?.totals.credit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function printTB(data: TBData) {
  const html = `
    <div class="header">
      <div><div class="brand">ABWcurious</div><div class="muted">Trial Balance</div></div>
      <div class="meta"><h1>Trial Balance</h1><div>As of ${formatDate(data.asOf)}</div></div>
    </div>
    <table>
      <thead><tr><th>Code</th><th>Account</th><th>Type</th><th class="text-right">Debit</th><th class="text-right">Credit</th></tr></thead>
      <tbody>
        ${data.rows.map((r) => `<tr><td>${r.code}</td><td>${r.name}</td><td>${r.accountType}</td><td class="text-right">${r.debit > 0 ? r.debit.toFixed(2) : ""}</td><td class="text-right">${r.credit > 0 ? r.credit.toFixed(2) : ""}</td></tr>`).join("")}
        <tr style="font-weight:bold;border-top:2px solid #1b6d97"><td colspan="3">Total</td><td class="text-right">${data.totals.debit.toFixed(2)}</td><td class="text-right">${data.totals.credit.toFixed(2)}</td></tr>
      </tbody>
    </table>
    <p class="muted" style="margin-top:16px">${data.totals.balanced ? "✓ Trial balance is balanced" : "✗ Trial balance is NOT balanced"}</p>
  `;
  printHTML(html, "Trial Balance");
}

// ============================================================
// Profit & Loss
// ============================================================

interface PLRow { code: string; name: string; amount: number; }
interface PLData {
  type: string; fromDate: string; toDate: string;
  revenue: PLRow[]; expenses: PLRow[];
  totals: { revenue: number; expenses: number; netProfit: number; };
}

function ProfitLossReport() {
  const [data, setData] = React.useState<PLData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [fromDate, setFromDate] = React.useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [toDate, setToDate] = React.useState(new Date().toISOString().slice(0, 10));

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?type=profit_loss&fromDate=${fromDate}&toDate=${toDate}`, { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } finally { setLoading(false); }
  }, [fromDate, toDate]);

  React.useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex justify-between items-end gap-4 flex-wrap">
          <DateRangeControls fromDate={fromDate} setFromDate={setFromDate} toDate={toDate} setToDate={setToDate} />
          <ExportButtons rows={(data?.revenue.length ?? 0) + (data?.expenses.length ?? 0)}
            onCSV={() => {
              const rows = [
                ...(data?.revenue.map((r) => ({ section: "Revenue", code: r.code, name: r.name, amount: r.amount })) ?? []),
                ...(data?.expenses.map((r) => ({ section: "Expense", code: r.code, name: r.name, amount: r.amount })) ?? []),
              ];
              exportCSV("profit_loss", rows);
            }}
            onExcel={() => {
              const rows = [
                ...(data?.revenue.map((r) => ({ section: "Revenue", code: r.code, name: r.name, amount: r.amount })) ?? []),
                ...(data?.expenses.map((r) => ({ section: "Expense", code: r.code, name: r.name, amount: r.amount })) ?? []),
              ];
              exportExcel("profit_loss", rows, "P&L");
            }}
            onPrint={() => printPL(data!)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profit &amp; Loss Statement</CardTitle>
          <CardDescription>{data ? `${formatDate(data.fromDate)} to ${formatDate(data.toDate)}` : "—"}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> Loading…</div>
          ) : (
            <div>
              {/* Revenue */}
              <div className="px-4 py-2 bg-muted/30 font-semibold text-sm border-b border-border">Revenue</div>
              <Table>
                <TableBody>
                  {(data?.revenue ?? []).map((r) => (
                    <TableRow key={r.code}>
                      <TableCell className="font-mono text-xs w-24">{r.code}</TableCell>
                      <TableCell className="text-sm">{r.name}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{r.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-success/5 font-medium">
                    <TableCell colSpan={2} className="text-right text-sm">Total Revenue</TableCell>
                    <TableCell className="text-right tabular-nums text-success">{data?.totals.revenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {/* Expenses */}
              <div className="px-4 py-2 bg-muted/30 font-semibold text-sm border-y border-border mt-4">Expenses</div>
              <Table>
                <TableBody>
                  {(data?.expenses ?? []).map((r) => (
                    <TableRow key={r.code}>
                      <TableCell className="font-mono text-xs w-24">{r.code}</TableCell>
                      <TableCell className="text-sm">{r.name}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{r.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-destructive/5 font-medium">
                    <TableCell colSpan={2} className="text-right text-sm">Total Expenses</TableCell>
                    <TableCell className="text-right tabular-nums text-destructive">{data?.totals.expenses.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {/* Net Profit */}
              <div className="px-4 py-3 border-t-2 border-border flex justify-between items-center">
                <span className="text-base font-bold">Net Profit / (Loss)</span>
                <span className={cn("text-xl font-bold tabular-nums", (data?.totals.netProfit ?? 0) >= 0 ? "text-success" : "text-destructive")}>
                  {(data?.totals.netProfit ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function printPL(data: PLData) {
  const html = `
    <div class="header">
      <div><div class="brand">ABWcurious</div><div class="muted">Profit &amp; Loss Statement</div></div>
      <div class="meta"><h1>P&amp;L Statement</h1><div>${formatDate(data.fromDate)} to ${formatDate(data.toDate)}</div></div>
    </div>
    <h2>Revenue</h2>
    <table>
      <tbody>
        ${data.revenue.map((r) => `<tr><td style="width:60px">${r.code}</td><td>${r.name}</td><td class="text-right">${r.amount.toFixed(2)}</td></tr>`).join("")}
        <tr style="font-weight:bold;background:#dcfce7"><td colspan="2">Total Revenue</td><td class="text-right">${data.totals.revenue.toFixed(2)}</td></tr>
      </tbody>
    </table>
    <h2>Expenses</h2>
    <table>
      <tbody>
        ${data.expenses.map((r) => `<tr><td style="width:60px">${r.code}</td><td>${r.name}</td><td class="text-right">${r.amount.toFixed(2)}</td></tr>`).join("")}
        <tr style="font-weight:bold;background:#fee2e2"><td colspan="2">Total Expenses</td><td class="text-right">${data.totals.expenses.toFixed(2)}</td></tr>
      </tbody>
    </table>
    <table class="totals">
      <tr class="total"><td>Net Profit / (Loss)</td><td class="text-right" style="color:${data.totals.netProfit >= 0 ? "#15803d" : "#b91c1c"}">${data.totals.netProfit.toFixed(2)}</td></tr>
    </table>
  `;
  printHTML(html, "Profit & Loss");
}

// ============================================================
// Balance Sheet
// ============================================================

interface BSRow { code: string; name: string; amount: number; }
interface BSData {
  type: string; asOf: string;
  assets: BSRow[]; liabilities: BSRow[]; equity: BSRow[];
  totals: { assets: number; liabilities: number; equity: number; balanced: boolean; };
}

function BalanceSheetReport() {
  const [data, setData] = React.useState<BSData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [toDate, setToDate] = React.useState(new Date().toISOString().slice(0, 10));

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?type=balance_sheet&toDate=${toDate}`, { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } finally { setLoading(false); }
  }, [toDate]);

  React.useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex justify-between items-end gap-4 flex-wrap">
          <DateRangeControls fromDate="" setFromDate={() => {}} toDate={toDate} setToDate={setToDate} showFrom={false} />
          <ExportButtons rows={(data?.assets.length ?? 0) + (data?.liabilities.length ?? 0) + (data?.equity.length ?? 0)}
            onCSV={() => {
              const rows = [
                ...(data?.assets.map((r) => ({ section: "Asset", ...r })) ?? []),
                ...(data?.liabilities.map((r) => ({ section: "Liability", ...r })) ?? []),
                ...(data?.equity.map((r) => ({ section: "Equity", ...r })) ?? []),
              ];
              exportCSV("balance_sheet", rows as unknown as Record<string, unknown>[]);
            }}
            onExcel={() => {
              const rows = [
                ...(data?.assets.map((r) => ({ section: "Asset", ...r })) ?? []),
                ...(data?.liabilities.map((r) => ({ section: "Liability", ...r })) ?? []),
                ...(data?.equity.map((r) => ({ section: "Equity", ...r })) ?? []),
              ];
              exportExcel("balance_sheet", rows as unknown as Record<string, unknown>[], "Balance Sheet");
            }}
            onPrint={() => printBS(data!)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Balance Sheet</span>
            {data && (
              <Badge variant={data.totals.balanced ? "default" : "destructive"} className="text-[10px]">
                {data.totals.balanced ? "BALANCED" : "NOT BALANCED"}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>As of {data ? formatDate(data.asOf) : "—"}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> Loading…</div>
          ) : (
            <div>
              {/* Assets */}
              <div className="px-4 py-2 bg-muted/30 font-semibold text-sm border-b border-border">Assets</div>
              <Table>
                <TableBody>
                  {(data?.assets ?? []).map((r) => (
                    <TableRow key={r.code}>
                      <TableCell className="font-mono text-xs w-24">{r.code}</TableCell>
                      <TableCell className="text-sm">{r.name}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{r.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-primary/5 font-medium">
                    <TableCell colSpan={2} className="text-right text-sm">Total Assets</TableCell>
                    <TableCell className="text-right tabular-nums">{data?.totals.assets.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {/* Liabilities */}
              <div className="px-4 py-2 bg-muted/30 font-semibold text-sm border-y border-border mt-4">Liabilities</div>
              <Table>
                <TableBody>
                  {(data?.liabilities ?? []).map((r) => (
                    <TableRow key={r.code}>
                      <TableCell className="font-mono text-xs w-24">{r.code}</TableCell>
                      <TableCell className="text-sm">{r.name}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{r.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-warning/5 font-medium">
                    <TableCell colSpan={2} className="text-right text-sm">Total Liabilities</TableCell>
                    <TableCell className="text-right tabular-nums">{data?.totals.liabilities.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {/* Equity */}
              <div className="px-4 py-2 bg-muted/30 font-semibold text-sm border-y border-border mt-4">Equity</div>
              <Table>
                <TableBody>
                  {(data?.equity ?? []).map((r) => (
                    <TableRow key={r.code}>
                      <TableCell className="font-mono text-xs w-24">{r.code}</TableCell>
                      <TableCell className="text-sm">{r.name}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{r.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-primary/5 font-medium">
                    <TableCell colSpan={2} className="text-right text-sm">Total Equity</TableCell>
                    <TableCell className="text-right tabular-nums">{data?.totals.equity.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <div className="px-4 py-3 border-t-2 border-border flex justify-between items-center">
                <span className="text-base font-bold">Liabilities + Equity</span>
                <span className="text-xl font-bold tabular-nums">
                  {((data?.totals.liabilities ?? 0) + (data?.totals.equity ?? 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function printBS(data: BSData) {
  const html = `
    <div class="header">
      <div><div class="brand">ABWcurious</div><div class="muted">Balance Sheet</div></div>
      <div class="meta"><h1>Balance Sheet</h1><div>As of ${formatDate(data.asOf)}</div></div>
    </div>
    <h2>Assets</h2>
    <table><tbody>
      ${data.assets.map((r) => `<tr><td style="width:60px">${r.code}</td><td>${r.name}</td><td class="text-right">${r.amount.toFixed(2)}</td></tr>`).join("")}
      <tr style="font-weight:bold;background:#dbeafe"><td colspan="2">Total Assets</td><td class="text-right">${data.totals.assets.toFixed(2)}</td></tr>
    </tbody></table>
    <h2>Liabilities</h2>
    <table><tbody>
      ${data.liabilities.map((r) => `<tr><td style="width:60px">${r.code}</td><td>${r.name}</td><td class="text-right">${r.amount.toFixed(2)}</td></tr>`).join("")}
      <tr style="font-weight:bold;background:#fef3c7"><td colspan="2">Total Liabilities</td><td class="text-right">${data.totals.liabilities.toFixed(2)}</td></tr>
    </tbody></table>
    <h2>Equity</h2>
    <table><tbody>
      ${data.equity.map((r) => `<tr><td style="width:60px">${r.code}</td><td>${r.name}</td><td class="text-right">${r.amount.toFixed(2)}</td></tr>`).join("")}
      <tr style="font-weight:bold;background:#dbeafe"><td colspan="2">Total Equity</td><td class="text-right">${data.totals.equity.toFixed(2)}</td></tr>
    </tbody></table>
    <table class="totals">
      <tr class="total"><td>Liabilities + Equity</td><td class="text-right">${(data.totals.liabilities + data.totals.equity).toFixed(2)}</td></tr>
    </table>
    <p class="muted" style="margin-top:16px">${data.totals.balanced ? "✓ Balance sheet is balanced (Assets = Liabilities + Equity)" : "✗ Balance sheet is NOT balanced"}</p>
  `;
  printHTML(html, "Balance Sheet");
}

// ============================================================
// AR Aging
// ============================================================

interface ARRow { invoiceNumber: string; customer: string; invoiceDate: string; dueDate: string; totalAmount: number; balanceDue: number; currencyCode: string; daysOverdue: number; }
interface ARData {
  type: string; asOf: string;
  buckets: Record<string, ARRow[]>;
  totals: Record<string, number>;
  totalOutstanding: number;
}

const BUCKET_LABELS: Record<string, string> = {
  current: "Current (Not yet due)",
  "1_30": "1-30 days overdue",
  "31_60": "31-60 days overdue",
  "61_90": "61-90 days overdue",
  "90_plus": "90+ days overdue",
};

function ArAgingReport() {
  const [data, setData] = React.useState<ARData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [toDate, setToDate] = React.useState(new Date().toISOString().slice(0, 10));

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?type=ar_aging&toDate=${toDate}`, { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } finally { setLoading(false); }
  }, [toDate]);

  React.useEffect(() => { load(); }, [load]);

  const allRows: ARRow[] = data ? Object.values(data.buckets).flat() : [];

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex justify-between items-end gap-4 flex-wrap">
          <DateRangeControls fromDate="" setFromDate={() => {}} toDate={toDate} setToDate={setToDate} showFrom={false} />
          <ExportButtons rows={allRows.length}
            onCSV={() => exportCSV("ar_aging", allRows as unknown as Record<string, unknown>[])}
            onExcel={() => exportExcel("ar_aging", allRows as unknown as Record<string, unknown>[], "AR Aging")}
            onPrint={() => printAR(data!)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Accounts Receivable Aging</CardTitle>
          <CardDescription>As of {data ? formatDate(data.asOf) : "—"} · Total outstanding: ₹{data?.totalOutstanding.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> Loading…</div>
          ) : allRows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No outstanding receivables 🎉</div>
          ) : (
            <div>
              {/* Bucket summary */}
              <div className="grid grid-cols-5 gap-2 p-4 border-b border-border">
                {Object.entries(BUCKET_LABELS).map(([key, label]) => (
                  <div key={key} className="text-center p-2 rounded-md bg-muted/30">
                    <div className="text-[10px] uppercase text-muted-foreground">{label.split(" ")[0]}</div>
                    <div className="text-sm font-bold tabular-nums">₹{(data?.totals[key] ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
                  </div>
                ))}
              </div>

              {/* Buckets */}
              {Object.entries(BUCKET_LABELS).map(([key, label]) => {
                const bucket = data?.buckets[key] ?? [];
                if (bucket.length === 0) return null;
                return (
                  <div key={key}>
                    <div className={cn(
                      "px-4 py-2 font-semibold text-sm border-y border-border",
                      key === "current" && "bg-success/5",
                      key === "1_30" && "bg-info/5",
                      key === "31_60" && "bg-warning/5",
                      key === "61_90" && "bg-warning/10",
                      key === "90_plus" && "bg-destructive/5",
                    )}>
                      {label} — {bucket.length} invoices · ₹{data?.totals[key].toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                    <Table>
                      <TableBody>
                        {bucket.map((r) => (
                          <TableRow key={r.invoiceNumber}>
                            <TableCell className="font-mono text-xs">{r.invoiceNumber}</TableCell>
                            <TableCell className="text-sm">{r.customer}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{formatDate(r.dueDate)}</TableCell>
                            <TableCell className="text-right tabular-nums text-sm">{r.balanceDue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right text-xs">
                              <Badge variant={r.daysOverdue === 0 ? "secondary" : r.daysOverdue > 60 ? "destructive" : "outline"} className="text-[9px]">
                                {r.daysOverdue === 0 ? "due" : `${r.daysOverdue}d`}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function printAR(data: ARData) {
  const html = `
    <div class="header">
      <div><div class="brand">ABWcurious</div><div class="muted">AR Aging Report</div></div>
      <div class="meta"><h1>AR Aging</h1><div>As of ${formatDate(data.asOf)}</div><div>Total: ₹${data.totalOutstanding.toFixed(2)}</div></div>
    </div>
    ${Object.entries(BUCKET_LABELS).map(([key, label]) => {
      const bucket = data.buckets[key] ?? [];
      if (bucket.length === 0) return "";
      return `<h2>${label} (₹${data.totals[key].toFixed(2)})</h2>
      <table><thead><tr><th>Invoice #</th><th>Customer</th><th>Due Date</th><th class="text-right">Balance</th><th class="text-right">Days</th></tr></thead>
      <tbody>
        ${bucket.map((r) => `<tr><td>${r.invoiceNumber}</td><td>${r.customer}</td><td>${formatDate(r.dueDate)}</td><td class="text-right">${r.balanceDue.toFixed(2)}</td><td class="text-right">${r.daysOverdue}d</td></tr>`).join("")}
      </tbody></table>`;
    }).join("")}
  `;
  printHTML(html, "AR Aging");
}
