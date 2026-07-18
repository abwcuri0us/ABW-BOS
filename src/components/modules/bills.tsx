"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Loader2, Trash2, CheckCircle, Download } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { exportCSV, exportExcel } from "@/lib/export";

interface Bill {
  id: string; billNumber: string; vendorName: string; billDate: string; dueDate: string;
  amount: number; taxAmount: number; totalAmount: number; paidAmount: number;
  balanceDue: number; currencyCode: string; status: string; category: string;
}

const STATUS_TONES: Record<string, string> = {
  unpaid: "bg-muted text-muted-foreground border-border",
  partial: "bg-warning/10 text-warning border-warning/30",
  paid: "bg-success/10 text-success border-success/30",
  overdue: "bg-destructive/10 text-destructive border-destructive/30",
};

export function BillsContent() {
  const { toast } = useToast();
  const [items, setItems] = React.useState<Bill[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [createOpen, setCreateOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bills", { cache: "no-store" });
      if (res.ok) setItems((await res.json()).items ?? []);
    } finally { setLoading(false); }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  async function markPaid(b: Bill) {
    await fetch(`/api/bills/${b.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "paid", totalAmount: b.totalAmount }) });
    toast({ title: "Bill marked as paid" }); load();
  }

  async function handleDelete(b: Bill) {
    if (!confirm(`Delete bill ${b.billNumber}?`)) return;
    await fetch(`/api/bills/${b.id}`, { method: "DELETE" });
    toast({ title: "Bill deleted" }); load();
  }

  const totalUnpaid = items.filter(b => b.status !== "paid").reduce((s, b) => s + b.balanceDue, 0);
  const totalOverdue = items.filter(b => b.status === "overdue").reduce((s, b) => s + b.balanceDue, 0);

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><FileText className="h-6 w-6" /> Bills</h1>
          <p className="text-sm text-muted-foreground mt-1">Vendor bills and payables · {items.length} bills · ₹{totalUnpaid.toLocaleString("en-IN")} unpaid</p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportCSV("bills", items as unknown as Record<string, unknown>[])}>CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportExcel("bills", items as unknown as Record<string, unknown>[], "Bills")}>Excel</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" /> New Bill</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <div className="p-8 text-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> Loading…</div>
          : items.length === 0 ? <div className="p-12 text-center text-sm text-muted-foreground">No bills yet</div>
          : <Table>
            <TableHeader><TableRow className="bg-muted/50">
              <TableHead className="w-32">Bill #</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead className="hidden md:table-cell">Category</TableHead>
              <TableHead className="hidden md:table-cell w-32">Due Date</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {items.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-xs">{b.billNumber}</TableCell>
                  <TableCell className="text-sm font-medium">{b.vendorName}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs capitalize">{b.category}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{new Date(b.dueDate).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">₹{b.totalAmount.toLocaleString("en-IN")}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">{b.balanceDue > 0 ? <span className="text-destructive">₹{b.balanceDue.toLocaleString("en-IN")}</span> : <span className="text-success">PAID</span>}</TableCell>
                  <TableCell><span className={cn("text-[10px] px-2 py-0.5 rounded border font-medium uppercase", STATUS_TONES[b.status])}>{b.status}</span></TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {b.status !== "paid" && <DropdownMenuItem onClick={() => markPaid(b)}><CheckCircle className="mr-2 h-3.5 w-3.5" /> Mark Paid</DropdownMenuItem>}
                        <DropdownMenuItem onClick={() => handleDelete(b)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-3.5 w-3.5" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>}
        </CardContent>
      </Card>

      <CreateBillDialog open={createOpen} onOpenChange={setCreateOpen} onSaved={() => { setCreateOpen(false); load(); }} />
    </div>
  );
}

function CreateBillDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState({
    vendorName: "", amount: "", taxAmount: "",
    billDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    category: "other", notes: "",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.vendorName || !form.amount) { toast({ title: "Vendor name and amount required", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/bills", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (res.ok) { toast({ title: "Bill created" }); onSaved(); }
      else { const d = await res.json(); toast({ title: "Failed", description: d.error, variant: "destructive" }); }
    } finally { setSubmitting(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>New Bill</DialogTitle><DialogDescription>Record a vendor bill</DialogDescription></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2"><Label>Vendor Name *</Label><Input value={form.vendorName} onChange={(e) => setForm({ ...form, vendorName: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Amount (₹) *</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Tax (₹)</Label><Input type="number" step="0.01" value={form.taxAmount} onChange={(e) => setForm({ ...form, taxAmount: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Bill Date</Label><Input type="date" value={form.billDate} onChange={(e) => setForm({ ...form, billDate: e.target.value })} /></div>
            <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="utility">Utility</SelectItem><SelectItem value="rent">Rent</SelectItem><SelectItem value="supplies">Supplies</SelectItem><SelectItem value="service">Service</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
            </Select>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
