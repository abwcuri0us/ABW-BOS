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
import {
  Wallet, Plus, Loader2, Trash2, TrendingUp, TrendingDown, Download, FileText, FileSpreadsheet,
  ArrowDownCircle, ArrowUpCircle,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { exportCSV, exportExcel } from "@/lib/export";

interface PaymentRecord {
  id: string; paymentNumber: string; type: string; partyName: string;
  amount: number; currencyCode: string; paymentDate: string;
  paymentMode: string; referenceNumber: string | null;
  invoiceNumber: string | null; status: string;
}

export function PaymentsContent() {
  const { toast } = useToast();
  const [items, setItems] = React.useState<PaymentRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [typeFilter, setTypeFilter] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [stats, setStats] = React.useState({ received: 0, made: 0, net: 0 });

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set("type", typeFilter);
      const res = await fetch(`/api/payments?${params}`, { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        const data = d.items ?? [];
        setItems(data);
        const received = data.filter((t: PaymentRecord) => t.type === "received").reduce((s: number, t: PaymentRecord) => s + t.amount, 0);
        const made = data.filter((t: PaymentRecord) => t.type === "made").reduce((s: number, t: PaymentRecord) => s + t.amount, 0);
        setStats({ received, made, net: received - made });
      }
    } finally { setLoading(false); }
  }, [typeFilter]);

  React.useEffect(() => { load(); }, [load]);

  async function handleDelete(p: PaymentRecord) {
    if (!confirm(`Delete payment ${p.paymentNumber}?`)) return;
    await fetch(`/api/payments/${p.id}`, { method: "DELETE" });
    toast({ title: "Payment deleted" });
    load();
  }

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Wallet className="h-6 w-6" /> Payments
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Track payments received and made</p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportCSV("payments", items as unknown as Record<string, unknown>[])}><FileText className="mr-2 h-3.5 w-3.5" /> CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportExcel("payments", items as unknown as Record<string, unknown>[], "Payments")}><FileSpreadsheet className="mr-2 h-3.5 w-3.5" /> Excel</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" /> New Payment</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-success/5 border-success/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div><p className="text-xs text-muted-foreground uppercase">Received</p><p className="text-2xl font-bold tabular-nums text-success">₹{stats.received.toLocaleString("en-IN")}</p></div>
            <ArrowDownCircle className="h-8 w-8 text-success/60" />
          </CardContent>
        </Card>
        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div><p className="text-xs text-muted-foreground uppercase">Paid Out</p><p className="text-2xl font-bold tabular-nums text-destructive">₹{stats.made.toLocaleString("en-IN")}</p></div>
            <ArrowUpCircle className="h-8 w-8 text-destructive/60" />
          </CardContent>
        </Card>
        <Card className={cn(stats.net >= 0 ? "bg-primary/5 border-primary/20" : "bg-warning/5 border-warning/20")}>
          <CardContent className="p-4 flex items-center justify-between">
            <div><p className="text-xs text-muted-foreground uppercase">Net</p><p className={cn("text-2xl font-bold tabular-nums", stats.net >= 0 ? "text-primary" : "text-warning")}>₹{stats.net.toLocaleString("en-IN")}</p></div>
            <Wallet className="h-8 w-8 text-primary/60" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <Select value={typeFilter || "all"} onValueChange={(v) => setTypeFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="made">Made</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">No payments yet</div>
          ) : (
            <Table>
              <TableHeader><TableRow className="bg-muted/50">
                <TableHead className="w-32">Payment #</TableHead>
                <TableHead className="w-24">Type</TableHead>
                <TableHead>Party</TableHead>
                <TableHead className="hidden md:table-cell">Mode</TableHead>
                <TableHead className="hidden md:table-cell">Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {items.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.paymentNumber}</TableCell>
                    <TableCell><Badge variant={p.type === "received" ? "default" : "destructive"} className="text-[9px] capitalize">{p.type}</Badge></TableCell>
                    <TableCell className="text-sm font-medium">{p.partyName}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs capitalize">{p.paymentMode}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs font-mono text-muted-foreground">{p.referenceNumber ?? p.invoiceNumber ?? "—"}</TableCell>
                    <TableCell className={cn("text-right tabular-nums font-medium", p.type === "received" ? "text-success" : "text-destructive")}>
                      {p.type === "received" ? "+" : "−"}₹{p.amount.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(p)}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreatePaymentDialog open={createOpen} onOpenChange={setCreateOpen} onSaved={() => { setCreateOpen(false); load(); }} />
    </div>
  );
}

function CreatePaymentDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState({
    type: "received", partyName: "", amount: "", paymentMode: "bank",
    paymentDate: new Date().toISOString().slice(0, 10),
    referenceNumber: "", invoiceNumber: "", notes: "",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.partyName || !form.amount) { toast({ title: "Party name and amount required", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (res.ok) { toast({ title: "Payment recorded" }); setForm({ ...form, partyName: "", amount: "", referenceNumber: "", invoiceNumber: "", notes: "" }); onSaved(); }
      else { const d = await res.json(); toast({ title: "Failed", description: d.error, variant: "destructive" }); }
    } finally { setSubmitting(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>New Payment</DialogTitle><DialogDescription>Record a payment received or made</DialogDescription></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="received">Received</SelectItem><SelectItem value="made">Made</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Amount (₹) *</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
          </div>
          <div className="space-y-2"><Label>Party Name *</Label><Input value={form.partyName} onChange={(e) => setForm({ ...form, partyName: e.target.value })} required placeholder="Customer / Vendor name" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Payment Mode</Label>
              <Select value={form.paymentMode} onValueChange={(v) => setForm({ ...form, paymentMode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="bank">Bank</SelectItem><SelectItem value="upi">UPI</SelectItem><SelectItem value="cheque">Cheque</SelectItem><SelectItem value="card">Card</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Date</Label><Input type="date" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>Reference Number</Label><Input value={form.referenceNumber} onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })} placeholder="UTR / Cheque no." /></div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
