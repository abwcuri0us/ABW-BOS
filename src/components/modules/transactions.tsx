"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowUpDown, Plus, Loader2, Trash2, TrendingUp, TrendingDown, Wallet, Download, FileText, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { exportCSV, exportExcel } from "@/lib/export";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Transaction {
  id: string; transactionNumber: string; type: string; category: string;
  amount: number; currencyCode: string; transactionDate: string;
  paymentMode: string; description: string | null; status: string;
}

export function TransactionsContent() {
  const { toast } = useToast();
  const [items, setItems] = React.useState<Transaction[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [typeFilter, setTypeFilter] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [stats, setStats] = React.useState({ income: 0, expense: 0, net: 0 });

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: "100" });
      if (typeFilter) params.set("type", typeFilter);
      const res = await fetch(`/api/transactions?${params}`, { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setItems(d.items); setTotal(d.total);
        const income = d.items.filter((t: Transaction) => t.type === "income").reduce((s: number, t: Transaction) => s + t.amount, 0);
        const expense = d.items.filter((t: Transaction) => t.type === "expense").reduce((s: number, t: Transaction) => s + t.amount, 0);
        setStats({ income, expense, net: income - expense });
      }
    } finally { setLoading(false); }
  }, [typeFilter]);

  React.useEffect(() => { load(); }, [load]);

  async function handleDelete(t: Transaction) {
    if (!confirm(`Delete transaction ${t.transactionNumber}?`)) return;
    await fetch(`/api/transactions/${t.id}`, { method: "DELETE" });
    toast({ title: "Transaction deleted" });
    load();
  }

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ArrowUpDown className="h-6 w-6" /> Transactions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Income and expense tracking · {total} transactions</p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportCSV("transactions", items as unknown as Record<string, unknown>[])}>
                <FileText className="mr-2 h-3.5 w-3.5" /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportExcel("transactions", items as unknown as Record<string, unknown>[], "Transactions")}>
                <FileSpreadsheet className="mr-2 h-3.5 w-3.5" /> Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" /> New Transaction</Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-success/5 border-success/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Total Income</p>
              <p className="text-2xl font-bold tabular-nums text-success">₹{stats.income.toLocaleString("en-IN")}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-success/60" />
          </CardContent>
        </Card>
        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Total Expense</p>
              <p className="text-2xl font-bold tabular-nums text-destructive">₹{stats.expense.toLocaleString("en-IN")}</p>
            </div>
            <TrendingDown className="h-8 w-8 text-destructive/60" />
          </CardContent>
        </Card>
        <Card className={cn(stats.net >= 0 ? "bg-primary/5 border-primary/20" : "bg-warning/5 border-warning/20")}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Net Cash Flow</p>
              <p className={cn("text-2xl font-bold tabular-nums", stats.net >= 0 ? "text-primary" : "text-warning")}>
                ₹{stats.net.toLocaleString("en-IN")}
              </p>
            </div>
            <Wallet className="h-8 w-8 text-primary/60" />
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="p-4 flex gap-3 flex-wrap">
          <Select value={typeFilter || "all"} onValueChange={(v) => setTypeFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">No transactions yet</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-32">Txn #</TableHead>
                  <TableHead className="w-24">Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="hidden md:table-cell">Description</TableHead>
                  <TableHead className="hidden md:table-cell">Payment</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">{t.transactionNumber}</TableCell>
                    <TableCell>
                      <Badge variant={t.type === "income" ? "default" : t.type === "expense" ? "destructive" : "secondary"} className="text-[9px] capitalize">
                        {t.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm capitalize">{t.category}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{t.description ?? "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs capitalize">{t.paymentMode}</TableCell>
                    <TableCell className={cn("text-right tabular-nums font-medium", t.type === "income" ? "text-success" : t.type === "expense" ? "text-destructive" : "")}>
                      {t.type === "income" ? "+" : t.type === "expense" ? "−" : ""}₹{t.amount.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(t)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateTransactionDialog open={createOpen} onOpenChange={setCreateOpen} onSaved={() => { setCreateOpen(false); load(); }} />
    </div>
  );
}

function CreateTransactionDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState({
    type: "expense", category: "other", amount: "", paymentMode: "cash",
    transactionDate: new Date().toISOString().slice(0, 10), description: "",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.amount) { toast({ title: "Amount required", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast({ title: "Transaction created" });
        setForm({ ...form, amount: "", description: "" });
        onSaved();
      } else {
        const d = await res.json(); toast({ title: "Failed", description: d.error, variant: "destructive" });
      }
    } finally { setSubmitting(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Transaction</DialogTitle>
          <DialogDescription>Record income, expense, or transfer</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="purchase">Purchase</SelectItem>
                  <SelectItem value="salary">Salary</SelectItem>
                  <SelectItem value="rent">Rent</SelectItem>
                  <SelectItem value="utility">Utility</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Amount (₹) *</Label>
              <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={form.transactionDate} onChange={(e) => setForm({ ...form, transactionDate: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Payment Mode</Label>
            <Select value={form.paymentMode} onValueChange={(v) => setForm({ ...form, paymentMode: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank">Bank Transfer</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="card">Card</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional notes" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
