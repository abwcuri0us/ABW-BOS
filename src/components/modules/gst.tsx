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
import { FileCheck, Plus, Loader2, CheckCircle, Calendar } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface GstFiling {
  id: string; filingNumber: string; returnType: string; period: string;
  dueDate: string; filingDate: string | null; status: string;
  totalTaxableValue: number; totalOutputTax: number; totalInputTax: number;
  netTaxPayable: number; cgstAmount: number; sgstAmount: number;
}

const STATUS_TONES: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/30",
  filed: "bg-success/10 text-success border-success/30",
  late_filed: "bg-destructive/10 text-destructive border-destructive/30",
};

export function GstContent() {
  const { toast } = useToast();
  const [items, setItems] = React.useState<GstFiling[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [createOpen, setCreateOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gst", { cache: "no-store" });
      if (res.ok) setItems((await res.json()).items ?? []);
    } finally { setLoading(false); }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  async function markFiled(g: GstFiling, late: boolean = false) {
    await fetch(`/api/gst/${g.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: late ? "late_filed" : "filed" }) });
    toast({ title: late ? "Marked as late filed" : "Marked as filed" }); load();
  }

  const totalPayable = items.reduce((s, g) => s + g.netTaxPayable, 0);
  const pendingCount = items.filter(g => g.status === "pending").length;

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><FileCheck className="h-6 w-6" /> GST Filings</h1>
          <p className="text-sm text-muted-foreground mt-1">{items.length} filings · {pendingCount} pending · ₹{totalPayable.toLocaleString("en-IN")} total tax payable</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" /> New Filing</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <div className="p-8 text-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> Loading…</div>
          : items.length === 0 ? <div className="p-12 text-center text-sm text-muted-foreground">No GST filings yet</div>
          : <Table>
            <TableHeader><TableRow className="bg-muted/50">
              <TableHead className="w-40">Filing #</TableHead>
              <TableHead className="w-24">Type</TableHead>
              <TableHead>Period</TableHead>
              <TableHead className="hidden md:table-cell">Due Date</TableHead>
              <TableHead className="text-right">Output Tax</TableHead>
              <TableHead className="text-right">Input Tax</TableHead>
              <TableHead className="text-right">Net Payable</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {items.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-mono text-xs">{g.filingNumber}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[9px] uppercase">{g.returnType}</Badge></TableCell>
                  <TableCell className="text-sm font-medium">{g.period}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{new Date(g.dueDate).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">₹{g.totalOutputTax.toLocaleString("en-IN")}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm text-success">₹{g.totalInputTax.toLocaleString("en-IN")}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm font-bold text-destructive">₹{g.netTaxPayable.toLocaleString("en-IN")}</TableCell>
                  <TableCell><span className={cn("text-[10px] px-2 py-0.5 rounded border font-medium uppercase", STATUS_TONES[g.status])}>{g.status.replace("_", " ")}</span></TableCell>
                  <TableCell>
                    {g.status === "pending" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Calendar className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => markFiled(g)}><CheckCircle className="mr-2 h-3.5 w-3.5" /> Mark Filed</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => markFiled(g, true)}>Mark Late Filed</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>}
        </CardContent>
      </Card>

      <CreateGstDialog open={createOpen} onOpenChange={setCreateOpen} onSaved={() => { setCreateOpen(false); load(); }} />
    </div>
  );
}

function CreateGstDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState({
    returnType: "gstr1", period: new Date().toISOString().slice(0, 7),
    dueDate: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    totalTaxableValue: "", totalOutputTax: "", totalInputTax: "",
    cgstAmount: "", sgstAmount: "",
  });

  const outputTax = Number(form.totalOutputTax) || 0;
  const inputTax = Number(form.totalInputTax) || 0;
  const netPayable = outputTax - inputTax;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/gst", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (res.ok) { toast({ title: "GST filing created" }); onSaved(); }
      else { const d = await res.json(); toast({ title: "Failed", description: d.error, variant: "destructive" }); }
    } finally { setSubmitting(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>New GST Filing</DialogTitle><DialogDescription>Create a GST return filing record</DialogDescription></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Return Type</Label>
              <Select value={form.returnType} onValueChange={(v) => setForm({ ...form, returnType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="gstr1">GSTR-1</SelectItem><SelectItem value="gstr3b">GSTR-3B</SelectItem><SelectItem value="gstr9">GSTR-9 (Annual)</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Period</Label><Input type="month" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Taxable Value (₹)</Label><Input type="number" value={form.totalTaxableValue} onChange={(e) => setForm({ ...form, totalTaxableValue: e.target.value })} /></div>
            <div className="space-y-2"><Label>Output Tax (₹)</Label><Input type="number" value={form.totalOutputTax} onChange={(e) => setForm({ ...form, totalOutputTax: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Input Tax (₹)</Label><Input type="number" value={form.totalInputTax} onChange={(e) => setForm({ ...form, totalInputTax: e.target.value })} /></div>
            <div className="space-y-2"><Label>CGST (₹)</Label><Input type="number" value={form.cgstAmount} onChange={(e) => setForm({ ...form, cgstAmount: e.target.value })} /></div>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 text-sm flex justify-between">
            <span className="text-muted-foreground">Net Tax Payable</span>
            <span className={cn("tabular-nums font-bold", netPayable > 0 ? "text-destructive" : "text-success")}>₹{netPayable.toLocaleString("en-IN")}</span>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
