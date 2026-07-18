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
  FileText, Plus, Search, Loader2, Eye, Trash2, MoreHorizontal, X, Printer,
  Download, FileSpreadsheet, Pencil,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { exportCSV, exportExcel, printHTML, formatINR, formatDate } from "@/lib/export";
import { getCompanyProfile, buildLetterhead, buildFooter, getPrintCss } from "@/lib/company";

interface Party {
  id: string; displayName: string;
  email?: string | null;
  phone?: string | null;
  taxId?: string | null;
  taxIdType?: string | null;
}
interface Product { id: string; sku: string; name: string; salePrice: number; uom: string; productType: string; }

interface Invoice {
  id: string; invoiceNumber: string; invoiceType: string;
  invoiceDate: string; dueDate: string;
  partyId: string; currencyCode: string;
  status: string; subtotal: number; taxAmount: number;
  totalAmount: number; paidAmount: number; balanceDue: number;
  notes: string | null; termsConditions: string | null;
  party?: Party;
  lines?: Array<{
    id: string; lineNumber: number; productId: string | null;
    description: string; quantity: number; uom: string;
    unitPrice: number; discountPercent: number; taxPercent: number;
    taxAmount: number; lineTotal: number;
  }>;
}

const STATUS_TONES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  sent: "bg-info/10 text-info border-info/30",
  viewed: "bg-info/10 text-info border-info/30",
  partial: "bg-warning/10 text-warning border-warning/30",
  paid: "bg-success/10 text-success border-success/30",
  overdue: "bg-destructive/10 text-destructive border-destructive/30",
  void: "bg-muted text-muted-foreground border-border line-through",
};

export function InvoicingContent() {
  const { toast } = useToast();
  const [items, setItems] = React.useState<Invoice[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Invoice | null>(null);
  const [viewing, setViewing] = React.useState<Invoice | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (query) params.set("q", query);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/invoicing?${params}`, { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setItems(d.items); setTotal(d.total); setTotalPages(d.totalPages);
      }
    } finally { setLoading(false); }
  }, [page, query, statusFilter]);

  React.useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function handleStatusChange(inv: Invoice, newStatus: string) {
    const res = await fetch(`/api/invoicing/${inv.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      toast({ title: `Invoice marked as ${newStatus}` });
      load();
    } else {
      toast({ title: "Update failed", variant: "destructive" });
    }
  }

  async function handleDelete(inv: Invoice) {
    if (!confirm(`Delete invoice ${inv.invoiceNumber}?`)) return;
    const res = await fetch(`/api/invoicing/${inv.id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Invoice deleted" });
      load();
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6" /> Invoicing
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tax invoices, proforma, credit notes · {total} invoices
          </p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                const rows = items.map((inv) => ({
                  invoiceNumber: inv.invoiceNumber,
                  invoiceDate: formatDate(inv.invoiceDate),
                  dueDate: formatDate(inv.dueDate),
                  customer: inv.party?.displayName ?? "",
                  currency: inv.currencyCode,
                  subtotal: inv.subtotal,
                  tax: inv.taxAmount,
                  total: inv.totalAmount,
                  paid: inv.paidAmount,
                  balance: inv.balanceDue,
                  status: inv.status,
                }));
                exportCSV("invoices", rows);
              }}>
                <FileText className="mr-2 h-3.5 w-3.5" /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                const rows = items.map((inv) => ({
                  invoiceNumber: inv.invoiceNumber,
                  invoiceDate: formatDate(inv.invoiceDate),
                  dueDate: formatDate(inv.dueDate),
                  customer: inv.party?.displayName ?? "",
                  currency: inv.currencyCode,
                  subtotal: inv.subtotal,
                  tax: inv.taxAmount,
                  total: inv.totalAmount,
                  paid: inv.paidAmount,
                  balance: inv.balanceDue,
                  status: inv.status,
                }));
                exportExcel("invoices", rows, "Invoices");
              }}>
                <FileSpreadsheet className="mr-2 h-3.5 w-3.5" /> Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Invoice
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by invoice number…" value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }} className="pl-9" />
          </div>
          <Select value={statusFilter || "all"} onValueChange={(v) => { setStatusFilter(v === "all" ? "" : v); setPage(1); }}>
            <SelectTrigger className="w-36"><SelectValue placeholder="All status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="void">Void</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> Loading…
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm font-medium">No invoices found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-32">Invoice #</TableHead>
                    <TableHead className="w-32">Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="hidden md:table-cell w-32">Due Date</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((inv) => (
                    <TableRow key={inv.id} className="cursor-pointer hover:bg-accent/5" onClick={() => setViewing(inv)}>
                      <TableCell className="font-mono text-xs">{inv.invoiceNumber}</TableCell>
                      <TableCell className="text-xs">{new Date(inv.invoiceDate).toLocaleDateString()}</TableCell>
                      <TableCell className="text-sm font-medium">{inv.party?.displayName ?? "—"}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                        {new Date(inv.dueDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {inv.currencyCode} {inv.totalAmount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {inv.balanceDue > 0 ? (
                          <span className="text-destructive">{inv.currencyCode} {inv.balanceDue.toLocaleString()}</span>
                        ) : (
                          <span className="text-success">PAID</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={cn("text-[10px] px-2 py-0.5 rounded border font-medium uppercase", STATUS_TONES[inv.status])}>
                          {inv.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => setViewing(inv)}>
                              <Eye className="mr-2 h-3.5 w-3.5" /> View
                            </DropdownMenuItem>
                            {inv.status !== "void" && (
                              <DropdownMenuItem onClick={() => { setEditing(inv); setCreateOpen(true); }}>
                                <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                              </DropdownMenuItem>
                            )}
                            {inv.status === "draft" && (
                              <DropdownMenuItem onClick={() => handleStatusChange(inv, "sent")}>
                                Mark as Sent
                              </DropdownMenuItem>
                            )}
                            {inv.status === "sent" && (
                              <DropdownMenuItem onClick={() => handleStatusChange(inv, "paid")}>
                                Mark as Paid
                              </DropdownMenuItem>
                            )}
                            {inv.status !== "void" && inv.status !== "paid" && (
                              <DropdownMenuItem onClick={() => handleStatusChange(inv, "void")}>
                                Void
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleDelete(inv)} className="text-destructive focus:text-destructive">
                              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
          </div>
        </div>
      )}

      <CreateInvoiceDialog
        open={createOpen}
        onOpenChange={(v) => { setCreateOpen(v); if (!v) setEditing(null); }}
        onSaved={() => { setCreateOpen(false); setEditing(null); load(); }}
        editing={editing}
      />

      {viewing && <InvoiceViewDialog invoice={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

// ============================================================
// Create Invoice Dialog
// ============================================================

function CreateInvoiceDialog({ open, onOpenChange, onSaved, editing }: { open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void; editing?: Invoice | null }) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = React.useState(false);
  const [parties, setParties] = React.useState<Party[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [form, setForm] = React.useState({
    partyId: "", invoiceDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    currencyCode: "INR",
    notes: "Thank you for your business.",
    termsConditions: "Payment due within 30 days. 18% GST applicable.",
  });
  const [lines, setLines] = React.useState<Array<{
    productId: string; description: string; quantity: string; uom: string;
    unitPrice: string; taxPercent: string;
  }>>([{ productId: "", description: "", quantity: "1", uom: "pcs", unitPrice: "0", taxPercent: "18" }]);

  React.useEffect(() => {
    if (open) {
      fetch("/api/contacts?type=customer&pageSize=100").then(r => r.json()).then(d => setParties(d?.items ?? [])).catch(() => {});
      fetch("/api/inventory/products?pageSize=100").then(r => r.json()).then(d => setProducts(d?.items ?? [])).catch(() => {});
    }
  }, [open]);

  // Hydrate form when editing
  React.useEffect(() => {
    if (!open) return;
    if (editing) {
      fetch(`/api/invoicing/${editing.id}`).then(r => r.json()).then(d => {
        const inv = d?.invoice;
        if (!inv) return;
        setForm({
          partyId: inv.partyId ?? "",
          invoiceDate: inv.invoiceDate ? new Date(inv.invoiceDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
          dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().slice(0, 10) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          currencyCode: inv.currencyCode ?? "INR",
          notes: inv.notes ?? "",
          termsConditions: inv.termsConditions ?? "",
        });
        if (Array.isArray(inv.lines) && inv.lines.length > 0) {
          setLines(inv.lines.map((l: any) => ({
            productId: l.productId ?? "",
            description: l.description ?? "",
            quantity: String(l.quantity ?? 1),
            uom: l.uom ?? "pcs",
            unitPrice: String(l.unitPrice ?? 0),
            taxPercent: String(l.taxPercent ?? 0),
          })));
        }
      }).catch(() => {});
    } else {
      setForm({
        partyId: "", invoiceDate: new Date().toISOString().slice(0, 10),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        currencyCode: "INR",
        notes: "Thank you for your business.",
        termsConditions: "Payment due within 30 days. 18% GST applicable.",
      });
      setLines([{ productId: "", description: "", quantity: "1", uom: "pcs", unitPrice: "0", taxPercent: "18" }]);
    }
  }, [open, editing]);

  function selectProduct(idx: number, productId: string) {
    const p = products.find((x) => x.id === productId);
    if (p) {
      setLines((prev) => prev.map((l, i) => i === idx ? {
        ...l, productId, description: p.name, unitPrice: String(p.salePrice), uom: p.uom,
      } : l));
    }
  }

  function addLine() {
    setLines([...lines, { productId: "", description: "", quantity: "1", uom: "pcs", unitPrice: "0", taxPercent: "18" }]);
  }
  function removeLine(idx: number) {
    if (lines.length > 1) setLines(lines.filter((_, i) => i !== idx));
  }
  function updateLine(idx: number, field: string, value: string) {
    setLines((prev) => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  }

  // Calculate totals
  let subtotal = 0, taxAmount = 0;
  lines.forEach((l) => {
    const gross = (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0);
    const tax = (gross * (Number(l.taxPercent) || 0)) / 100;
    subtotal += gross; taxAmount += tax;
  });
  const total = subtotal + taxAmount;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.partyId) {
      toast({ title: "Select a customer", variant: "destructive" });
      return;
    }
    if (lines.length === 0 || !lines.some(l => l.productId || l.description)) {
      toast({ title: "Add at least one line item", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        invoiceType: "tax_invoice",
        lines: lines.filter(l => l.productId || l.description).map(l => ({
          productId: l.productId || null,
          description: l.description,
          quantity: Number(l.quantity) || 0,
          uom: l.uom, unitPrice: Number(l.unitPrice) || 0,
          taxPercent: Number(l.taxPercent) || 0,
        })),
      };
      const url = editing ? `/api/invoicing/${editing.id}` : "/api/invoicing";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast({ title: editing ? "Invoice updated" : "Invoice created" });
        onSaved();
      } else {
        const d = await res.json().catch(() => ({}));
        toast({ title: "Save failed", description: d.error ?? "", variant: "destructive" });
      }
    } finally { setSubmitting(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {editing ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {editing ? `Edit Invoice ${editing.invoiceNumber}` : "New Invoice"}
          </DialogTitle>
          <DialogDescription>{editing ? "Update the invoice details below" : "Create a new tax invoice"}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-4 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>Customer *</Label>
              <Select value={form.partyId} onValueChange={(v) => setForm({ ...form, partyId: v })}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {(parties ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.displayName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="idate">Invoice Date</Label>
              <Input id="idate" type="date" value={form.invoiceDate} onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ddate">Due Date</Label>
              <Input id="ddate" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Product / Description</TableHead>
                  <TableHead className="w-20 text-right">Qty</TableHead>
                  <TableHead className="w-32 text-right">Unit Price</TableHead>
                  <TableHead className="w-20 text-right">Tax %</TableHead>
                  <TableHead className="w-24 text-right">Total</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((l, idx) => {
                  const lineTotal = (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0) * (1 + (Number(l.taxPercent) || 0) / 100);
                  return (
                    <TableRow key={idx}>
                      <TableCell>
                        <Select value={l.productId} onValueChange={(v) => selectProduct(idx, v)}>
                          <SelectTrigger className="h-8 text-xs mb-1"><SelectValue placeholder="Select product" /></SelectTrigger>
                          <SelectContent>
                            {(products ?? []).map((p) => <SelectItem key={p.id} value={p.id} className="text-xs">{p.sku} — {p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Input className="h-7 text-xs" placeholder="Description" value={l.description}
                          onChange={(e) => updateLine(idx, "description", e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <Input className="h-8 text-xs text-right tabular-nums" type="number" step="0.01" value={l.quantity}
                          onChange={(e) => updateLine(idx, "quantity", e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <Input className="h-8 text-xs text-right tabular-nums" type="number" step="0.01" value={l.unitPrice}
                          onChange={(e) => updateLine(idx, "unitPrice", e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <Input className="h-8 text-xs text-right tabular-nums" type="number" step="0.01" value={l.taxPercent}
                          onChange={(e) => updateLine(idx, "taxPercent", e.target.value)} />
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums font-medium">{lineTotal.toFixed(2)}</TableCell>
                      <TableCell>
                        {lines.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeLine(idx)}>
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="p-2 border-t border-border bg-muted/30">
              <Button type="button" variant="ghost" size="sm" onClick={addLine}>
                <Plus className="h-3 w-3 mr-1" /> Add line
              </Button>
            </div>
            <div className="p-3 border-t border-border bg-muted/20 flex justify-end gap-6 text-sm">
              <div>Subtotal: <b className="tabular-nums">₹{subtotal.toLocaleString()}</b></div>
              <div>Tax: <b className="tabular-nums">₹{taxAmount.toLocaleString()}</b></div>
              <div>Total: <b className="tabular-nums text-primary">₹{total.toLocaleString()}</b></div>
            </div>
          </div>

          {/* Customization options */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Currency</Label>
              <Select value={form.currencyCode} onValueChange={(v) => setForm({ ...form, currencyCode: v })}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["INR", "USD", "EUR", "GBP", "AED", "AUD", "CAD", "SGD"].map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Notes (visible to customer)</Label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 text-xs bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                placeholder="Add a thank-you note or payment instructions…"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Terms &amp; Conditions</Label>
            <textarea
              value={form.termsConditions}
              onChange={(e) => setForm({ ...form, termsConditions: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 text-xs bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              placeholder="Payment terms, late fees, GST applicability…"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Save Changes" : "Create Invoice"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Invoice View Dialog
// ============================================================

function InvoiceViewDialog({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const [full, setFull] = React.useState<Invoice | null>(null);

  React.useEffect(() => {
    fetch(`/api/invoicing/${invoice.id}`).then(r => r.json()).then(d => setFull(d?.invoice ?? null)).catch(() => {});
  }, [invoice.id]);

  async function printInvoice() {
    if (!full) return;
    const profile = await getCompanyProfile();
    const party = full.party;
    const lines = full.lines ?? [];
    const statusBadge = (s: string) => {
      const cls: Record<string, string> = {
        paid: "badge-success", sent: "badge-info", draft: "badge-muted",
        partial: "badge-warning", overdue: "badge-danger", void: "badge-muted",
      };
      return `<span class="badge ${cls[s] ?? "badge-muted"}">${s}</span>`;
    };
    const html = `
      ${buildLetterhead(profile)}
      <div style="display:flex;justify-content:space-between;margin-bottom:16px">
        <div>
          <h1 style="margin:0">TAX INVOICE</h1>
          <div><strong>${full.invoiceNumber}</strong></div>
          <div>Date: ${formatDate(full.invoiceDate)}</div>
          <div>Due: ${formatDate(full.dueDate)}</div>
          <div style="margin-top:4px">${statusBadge(full.status)}</div>
        </div>
      </div>
      <h2>Bill To</h2>
      <table><tr><td style="width:50%;border:none;padding:0">
        <strong>${party?.displayName ?? ""}</strong><br/>
        ${party?.email ? `Email: ${party.email}<br/>` : ""}
        ${party?.phone ? `Phone: ${party.phone}<br/>` : ""}
        ${party?.taxId ? `Tax ID (${party?.taxIdType ?? "GST"}): ${party.taxId}<br/>` : ""}
      </td><td style="border:none;padding:0;text-align:right">
        <strong>Payment Terms</strong><br/>
        Currency: ${full.currencyCode}<br/>
        ${full.termsConditions ? `<div class="muted" style="max-width:300px">${full.termsConditions}</div>` : ""}
      </td></tr></table>
      <h2>Line Items</h2>
      <table>
        <thead><tr>
          <th style="width:40px">#</th><th>Description</th>
          <th class="text-right" style="width:60px">Qty</th>
          <th class="text-right" style="width:90px">Unit Price</th>
          <th class="text-right" style="width:60px">Tax%</th>
          <th class="text-right" style="width:100px">Total</th>
        </tr></thead>
        <tbody>
          ${lines.map((l, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${l.description}</td>
              <td class="text-right">${l.quantity} ${l.uom}</td>
              <td class="text-right">${l.unitPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
              <td class="text-right">${l.taxPercent}%</td>
              <td class="text-right">${l.lineTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
      <table class="totals">
        <tr><td>Subtotal</td><td class="text-right">${full.currencyCode} ${full.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td></tr>
        <tr><td>Tax</td><td class="text-right">${full.currencyCode} ${full.taxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td></tr>
        <tr class="total"><td>Total</td><td class="text-right">${full.currencyCode} ${full.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td></tr>
        ${full.paidAmount > 0 ? `<tr><td>Paid</td><td class="text-right" style="color:#15803d">${full.currencyCode} ${full.paidAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td></tr>` : ""}
        ${full.balanceDue > 0 ? `<tr><td><strong>Balance Due</strong></td><td class="text-right" style="color:#b91c1c"><strong>${full.currencyCode} ${full.balanceDue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong></td></tr>` : ""}
      </table>
      ${full.notes ? `<h2>Notes</h2><p class="muted">${full.notes}</p>` : ""}
      ${buildFooter(profile)}
    `;
    printHTML(html, `Invoice ${full.invoiceNumber}`, getPrintCss(profile?.primaryColor ?? "#1B6D97"));
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2 text-base">
            <span className="font-mono">{invoice.invoiceNumber}</span>
            <div className="flex items-center gap-2">
              <span className={cn("text-[10px] px-2 py-0.5 rounded border font-medium uppercase", STATUS_TONES[invoice.status])}>
                {invoice.status}
              </span>
              <Button variant="default" size="sm" className="h-7" onClick={printInvoice} disabled={!full} title="Print / Save as PDF">
                <Printer className="mr-1.5 h-3.5 w-3.5" /> Print
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription>
            {new Date(invoice.invoiceDate).toLocaleDateString()} · Due {new Date(invoice.dueDate).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        {full ? (
          <div className="space-y-4">
            {/* Customer */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Bill To</p>
                <p className="font-medium">{full.party?.displayName ?? "—"}</p>
                {full.party?.email && <p className="text-xs text-muted-foreground">{full.party.email}</p>}
                {full.party?.phone && <p className="text-xs text-muted-foreground">{full.party.phone}</p>}
                {full.party?.taxId && <p className="text-xs text-muted-foreground">Tax ID: {full.party.taxId}</p>}
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase">Invoice Total</p>
                <p className="text-2xl font-bold tabular-nums">{full.currencyCode} {full.totalAmount.toLocaleString()}</p>
                {full.balanceDue > 0 && (
                  <p className="text-xs text-destructive">Balance due: {full.currencyCode} {full.balanceDue.toLocaleString()}</p>
                )}
              </div>
            </div>

            {/* Lines */}
            <div className="border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {full.lines?.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-sm">{l.description}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{l.quantity} {l.uom}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{l.unitPrice.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{l.taxPercent}%</TableCell>
                      <TableCell className="text-right text-xs tabular-nums font-medium">{l.lineTotal.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">₹{full.subtotal.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span className="tabular-nums">₹{full.taxAmount.toLocaleString()}</span></div>
                <div className="flex justify-between pt-1 border-t border-border font-bold"><span>Total</span><span className="tabular-nums">{full.currencyCode} {full.totalAmount.toLocaleString()}</span></div>
                {full.paidAmount > 0 && (
                  <div className="flex justify-between text-success"><span>Paid</span><span className="tabular-nums">₹{full.paidAmount.toLocaleString()}</span></div>
                )}
                {full.balanceDue > 0 && (
                  <div className="flex justify-between text-destructive font-medium"><span>Balance Due</span><span className="tabular-nums">₹{full.balanceDue.toLocaleString()}</span></div>
                )}
              </div>
            </div>

            {full.notes && (
              <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                <p className="font-medium text-foreground">Notes:</p>
                <p>{full.notes}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> Loading…
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
