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
import { Receipt, Plus, Loader2, Trash2, Download, FileText, FileSpreadsheet, Printer } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { exportCSV, exportExcel, printHTML, formatDate } from "@/lib/export";

interface SalarySlip {
  id: string; slipNumber: string; employeeName: string; payPeriod: string;
  payDate: string; basicSalary: number; grossEarnings: number;
  totalDeductions: number; netPay: number; currencyCode: string; status: string;
}

export function PayrollContent() {
  const { toast } = useToast();
  const [items, setItems] = React.useState<SalarySlip[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [createOpen, setCreateOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payroll", { cache: "no-store" });
      if (res.ok) setItems((await res.json()).items ?? []);
    } finally { setLoading(false); }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  async function handleDelete(s: SalarySlip) {
    if (!confirm(`Delete salary slip ${s.slipNumber}?`)) return;
    await fetch(`/api/payroll/${s.id}`, { method: "DELETE" });
    toast({ title: "Slip deleted" }); load();
  }

  async function markPaid(s: SalarySlip) {
    await fetch(`/api/payroll/${s.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "paid" }) });
    toast({ title: "Marked as paid" }); load();
  }

  function printSlip(s: SalarySlip) {
    const html = `
      <div class="header">
        <div><div class="brand">ABWcurious</div><div class="muted">Salary Slip</div></div>
        <div class="meta"><h1>PAY SLIP</h1><div><strong>${s.slipNumber}</strong></div><div>Period: ${s.payPeriod}</div><div>Date: ${formatDate(s.payDate)}</div></div>
      </div>
      <h2>Employee</h2>
      <p><strong>${s.employeeName}</strong></p>
      <h2>Earnings</h2>
      <table><tbody>
        <tr><td>Basic Salary</td><td class="text-right">₹${s.basicSalary.toLocaleString("en-IN")}</td></tr>
        <tr style="font-weight:bold;background:#dcfce7"><td>Gross Earnings</td><td class="text-right">₹${s.grossEarnings.toLocaleString("en-IN")}</td></tr>
      </tbody></table>
      <h2>Deductions</h2>
      <table><tbody>
        <tr style="font-weight:bold;background:#fee2e2"><td>Total Deductions</td><td class="text-right">₹${s.totalDeductions.toLocaleString("en-IN")}</td></tr>
      </tbody></table>
      <table class="totals"><tr class="total"><td>Net Pay</td><td class="text-right">₹${s.netPay.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td></tr></table>
    `;
    printHTML(html, `Salary Slip ${s.slipNumber}`);
  }

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Receipt className="h-6 w-6" /> Payroll</h1>
          <p className="text-sm text-muted-foreground mt-1">Salary slips and payroll management · {items.length} slips</p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportCSV("salary_slips", items as unknown as Record<string, unknown>[])}><FileText className="mr-2 h-3.5 w-3.5" /> CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportExcel("salary_slips", items as unknown as Record<string, unknown>[], "Payroll")}><FileSpreadsheet className="mr-2 h-3.5 w-3.5" /> Excel</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" /> New Slip</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <div className="p-8 text-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> Loading…</div>
          : items.length === 0 ? <div className="p-12 text-center text-sm text-muted-foreground">No salary slips yet</div>
          : <Table>
            <TableHeader><TableRow className="bg-muted/50">
              <TableHead className="w-32">Slip #</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead className="hidden md:table-cell">Period</TableHead>
              <TableHead className="text-right">Gross</TableHead>
              <TableHead className="text-right">Deductions</TableHead>
              <TableHead className="text-right">Net Pay</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {items.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.slipNumber}</TableCell>
                  <TableCell className="text-sm font-medium">{s.employeeName}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs">{s.payPeriod}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">₹{s.grossEarnings.toLocaleString("en-IN")}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm text-destructive">₹{s.totalDeductions.toLocaleString("en-IN")}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm font-bold text-success">₹{s.netPay.toLocaleString("en-IN")}</TableCell>
                  <TableCell><Badge variant={s.status === "paid" ? "default" : s.status === "processed" ? "secondary" : "outline"} className="text-[9px] capitalize">{s.status}</Badge></TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Printer className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => printSlip(s)}><Printer className="mr-2 h-3.5 w-3.5" /> Print Slip</DropdownMenuItem>
                        {s.status !== "paid" && <DropdownMenuItem onClick={() => markPaid(s)}>Mark as Paid</DropdownMenuItem>}
                        <DropdownMenuItem onClick={() => handleDelete(s)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-3.5 w-3.5" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>}
        </CardContent>
      </Card>

      <CreateSlipDialog open={createOpen} onOpenChange={setCreateOpen} onSaved={() => { setCreateOpen(false); load(); }} />
    </div>
  );
}

function CreateSlipDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState({
    employeeName: "", payPeriod: new Date().toISOString().slice(0, 7),
    basicSalary: "", hraAllowance: "", conveyance: "", medicalAllowance: "",
    specialAllowance: "", pfDeduction: "", tdsDeduction: "", professionalTax: "",
  });

  const gross = ["basicSalary", "hraAllowance", "conveyance", "medicalAllowance", "specialAllowance"].reduce((s, k) => s + (Number((form as any)[k]) || 0), 0);
  const deductions = ["pfDeduction", "tdsDeduction", "professionalTax"].reduce((s, k) => s + (Number((form as any)[k]) || 0), 0);
  const netPay = gross - deductions;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.employeeName) { toast({ title: "Employee name required", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/payroll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (res.ok) { toast({ title: "Salary slip created" }); onSaved(); }
      else { const d = await res.json(); toast({ title: "Failed", description: d.error, variant: "destructive" }); }
    } finally { setSubmitting(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Salary Slip</DialogTitle><DialogDescription>Generate a salary slip for an employee</DialogDescription></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Employee Name *</Label><Input value={form.employeeName} onChange={(e) => setForm({ ...form, employeeName: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Pay Period</Label><Input type="month" value={form.payPeriod} onChange={(e) => setForm({ ...form, payPeriod: e.target.value })} /></div>
          </div>
          <div className="text-xs font-semibold text-muted-foreground uppercase pt-2">Earnings</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Basic Salary</Label><Input type="number" value={form.basicSalary} onChange={(e) => setForm({ ...form, basicSalary: e.target.value })} /></div>
            <div className="space-y-2"><Label>HRA</Label><Input type="number" value={form.hraAllowance} onChange={(e) => setForm({ ...form, hraAllowance: e.target.value })} /></div>
            <div className="space-y-2"><Label>Conveyance</Label><Input type="number" value={form.conveyance} onChange={(e) => setForm({ ...form, conveyance: e.target.value })} /></div>
            <div className="space-y-2"><Label>Medical</Label><Input type="number" value={form.medicalAllowance} onChange={(e) => setForm({ ...form, medicalAllowance: e.target.value })} /></div>
            <div className="space-y-2"><Label>Special</Label><Input type="number" value={form.specialAllowance} onChange={(e) => setForm({ ...form, specialAllowance: e.target.value })} /></div>
          </div>
          <div className="text-xs font-semibold text-muted-foreground uppercase pt-2">Deductions</div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2"><Label>PF</Label><Input type="number" value={form.pfDeduction} onChange={(e) => setForm({ ...form, pfDeduction: e.target.value })} /></div>
            <div className="space-y-2"><Label>TDS</Label><Input type="number" value={form.tdsDeduction} onChange={(e) => setForm({ ...form, tdsDeduction: e.target.value })} /></div>
            <div className="space-y-2"><Label>Prof. Tax</Label><Input type="number" value={form.professionalTax} onChange={(e) => setForm({ ...form, professionalTax: e.target.value })} /></div>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Gross Earnings</span><span className="tabular-nums font-medium">₹{gross.toLocaleString("en-IN")}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Total Deductions</span><span className="tabular-nums text-destructive">₹{deductions.toLocaleString("en-IN")}</span></div>
            <div className="flex justify-between pt-1 border-t border-border font-bold"><span>Net Pay</span><span className="tabular-nums text-success">₹{netPay.toLocaleString("en-IN")}</span></div>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Slip</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
