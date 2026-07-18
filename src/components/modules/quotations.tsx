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
import { FileSignature, Plus, Search, Loader2, Eye, Trash2, MoreHorizontal, X, Printer, CheckCircle, Pencil } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { printHTML, formatDate } from "@/lib/export";
import { getCompanyProfile, buildLetterhead, buildFooter, getPrintCss } from "@/lib/company";

interface Party {
  id: string; displayName: string;
  email?: string | null;
  phone?: string | null;
  taxId?: string | null;
  taxIdType?: string | null;
}
interface Product { id: string; sku: string; name: string; salePrice: number; uom: string; }
interface Quotation {
  id: string; quotationNumber: string; quotationDate: string; validUntil: string;
  partyId: string; currencyCode: string; status: string;
  subtotal: number; taxAmount: number; totalAmount: number;
  notes?: string | null;
  termsConditions?: string | null;
  party?: Party;
  lines?: Array<{ id: string; lineNumber: number; description: string; quantity: number; uom: string; unitPrice: number; taxPercent: number; lineTotal: number; }>;
}

const STATUS_TONES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  sent: "bg-info/10 text-info border-info/30",
  accepted: "bg-success/10 text-success border-success/30",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
  expired: "bg-muted text-muted-foreground border-border",
  converted: "bg-primary/10 text-primary border-primary/30",
};

export function QuotationsContent() {
  const { toast } = useToast();
  const [items, setItems] = React.useState<Quotation[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Quotation | null>(null);
  const [viewing, setViewing] = React.useState<Quotation | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (query) params.set("q", query);
      const res = await fetch(`/api/quotations?${params}`, { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setItems(d.items); setTotal(d.total); setTotalPages(d.totalPages);
      }
    } finally { setLoading(false); }
  }, [page, query]);

  React.useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function handleStatusChange(q: Quotation, status: string) {
    const res = await fetch(`/api/quotations/${q.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast({ title: `Quotation ${status}` });
      if (status === "converted") {
        const d = await res.json();
        toast({ title: "Quotation converted to invoice", description: d.invoice?.invoiceNumber });
      }
      load();
    }
  }

  async function handleDelete(q: Quotation) {
    if (!confirm(`Delete quotation ${q.quotationNumber}?`)) return;
    await fetch(`/api/quotations/${q.id}`, { method: "DELETE" });
    toast({ title: "Quotation deleted" });
    load();
  }

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileSignature className="h-6 w-6" /> Quotations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{total} quotations</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" /> New Quotation</Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search quotations…" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} className="pl-9" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center">
              <FileSignature className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm font-medium">No quotations found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-32">Quote #</TableHead>
                  <TableHead className="w-32">Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden md:table-cell w-32">Valid Until</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((q) => (
                  <TableRow key={q.id} className="cursor-pointer hover:bg-accent/5" onClick={() => setViewing(q)}>
                    <TableCell className="font-mono text-xs">{q.quotationNumber}</TableCell>
                    <TableCell className="text-xs">{new Date(q.quotationDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-sm font-medium">{q.party?.displayName ?? "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{new Date(q.validUntil).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{q.currencyCode} {q.totalAmount.toLocaleString()}</TableCell>
                    <TableCell>
                      <span className={cn("text-[10px] px-2 py-0.5 rounded border font-medium uppercase", STATUS_TONES[q.status])}>{q.status}</span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={() => setViewing(q)}><Eye className="mr-2 h-3.5 w-3.5" /> View</DropdownMenuItem>
                          {q.status !== "converted" && (
                            <DropdownMenuItem onClick={() => { setEditing(q); setCreateOpen(true); }}>
                              <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                            </DropdownMenuItem>
                          )}
                          {q.status === "draft" && <DropdownMenuItem onClick={() => handleStatusChange(q, "sent")}>Mark as Sent</DropdownMenuItem>}
                          {q.status === "sent" && <DropdownMenuItem onClick={() => handleStatusChange(q, "accepted")}><CheckCircle className="mr-2 h-3.5 w-3.5" /> Mark Accepted</DropdownMenuItem>}
                          {q.status === "accepted" && <DropdownMenuItem onClick={() => handleStatusChange(q, "converted")}>Convert to Invoice</DropdownMenuItem>}
                          <DropdownMenuItem onClick={() => handleStatusChange(q, "rejected")}>Reject</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(q)} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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

      <CreateQuotationDialog
        open={createOpen}
        onOpenChange={(v) => { setCreateOpen(v); if (!v) setEditing(null); }}
        onSaved={() => { setCreateOpen(false); setEditing(null); load(); }}
        editing={editing}
      />
      {viewing && <QuotationViewDialog quotation={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

function CreateQuotationDialog({
  open, onOpenChange, onSaved, editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
  editing?: Quotation | null;
}) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = React.useState(false);
  const [parties, setParties] = React.useState<Party[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [form, setForm] = React.useState({
    partyId: "", quotationDate: new Date().toISOString().slice(0, 10),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    currencyCode: "INR",
    notes: "Thank you for your interest. This quotation is valid for 30 days.",
    termsConditions: "Prices are subject to change after the validity period. 18% GST applicable.",
  });
  const [lines, setLines] = React.useState<Array<{
    productId: string; description: string; quantity: string; uom: string;
    unitPrice: string; taxPercent: string;
  }>>([{ productId: "", description: "", quantity: "1", uom: "pcs", unitPrice: "0", taxPercent: "18" }]);

  // Load parties + products
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
      // Fetch full quotation (with lines)
      fetch(`/api/quotations/${editing.id}`).then(r => r.json()).then(d => {
        const q = d?.quotation;
        if (!q) return;
        setForm({
          partyId: q.partyId ?? "",
          quotationDate: q.quotationDate ? new Date(q.quotationDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
          validUntil: q.validUntil ? new Date(q.validUntil).toISOString().slice(0, 10) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          currencyCode: q.currencyCode ?? "INR",
          notes: q.notes ?? "",
          termsConditions: q.termsConditions ?? "",
        });
        if (Array.isArray(q.lines) && q.lines.length > 0) {
          setLines(q.lines.map((l: any) => ({
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
        partyId: "", quotationDate: new Date().toISOString().slice(0, 10),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        currencyCode: "INR",
        notes: "Thank you for your interest. This quotation is valid for 30 days.",
        termsConditions: "Prices are subject to change after the validity period. 18% GST applicable.",
      });
      setLines([{ productId: "", description: "", quantity: "1", uom: "pcs", unitPrice: "0", taxPercent: "18" }]);
    }
  }, [open, editing]);

  function selectProduct(idx: number, productId: string) {
    const p = products.find((x) => x.id === productId);
    if (p) setLines((prev) => prev.map((l, i) => i === idx ? { ...l, productId, description: p.name, unitPrice: String(p.salePrice), uom: p.uom } : l));
  }

  let subtotal = 0, taxAmount = 0;
  lines.forEach((l) => {
    const gross = (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0);
    const tax = (gross * (Number(l.taxPercent) || 0)) / 100;
    subtotal += gross; taxAmount += tax;
  });
  const total = subtotal + taxAmount;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.partyId) { toast({ title: "Select customer", variant: "destructive" }); return; }
    if (!lines.some(l => l.description)) { toast({ title: "Add at least one line", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        lines: lines.filter(l => l.description).map(l => ({
          productId: l.productId || null, description: l.description,
          quantity: Number(l.quantity) || 0, uom: l.uom, unitPrice: Number(l.unitPrice) || 0,
          taxPercent: Number(l.taxPercent) || 0,
        })),
      };
      const url = editing ? `/api/quotations/${editing.id}` : "/api/quotations";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast({ title: editing ? "Quotation updated" : "Quotation created" });
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
            {editing ? `Edit Quotation ${editing.quotationNumber}` : "New Quotation"}
          </DialogTitle>
          <DialogDescription>
            {editing ? "Update the quotation details below" : "Create a new quotation for a customer"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-4 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>Customer *</Label>
              <Select value={form.partyId} onValueChange={(v) => setForm({ ...form, partyId: v })}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>{(parties ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.displayName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={form.quotationDate} onChange={(e) => setForm({ ...form, quotationDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Valid Until</Label>
              <Input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
            </div>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Product / Description</TableHead>
                  <TableHead className="w-20 text-right">Qty</TableHead>
                  <TableHead className="w-32 text-right">Unit Price</TableHead>
                  <TableHead className="w-20 text-right">Tax%</TableHead>
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
                          <SelectContent>{(products ?? []).map((p) => <SelectItem key={p.id} value={p.id} className="text-xs">{p.sku} — {p.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Input className="h-7 text-xs" placeholder="Description" value={l.description} onChange={(e) => setLines(prev => prev.map((x, i) => i === idx ? { ...x, description: e.target.value } : x))} />
                      </TableCell>
                      <TableCell><Input className="h-8 text-xs text-right tabular-nums" type="number" step="0.01" value={l.quantity} onChange={(e) => setLines(prev => prev.map((x, i) => i === idx ? { ...x, quantity: e.target.value } : x))} /></TableCell>
                      <TableCell><Input className="h-8 text-xs text-right tabular-nums" type="number" step="0.01" value={l.unitPrice} onChange={(e) => setLines(prev => prev.map((x, i) => i === idx ? { ...x, unitPrice: e.target.value } : x))} /></TableCell>
                      <TableCell><Input className="h-8 text-xs text-right tabular-nums" type="number" step="0.01" value={l.taxPercent} onChange={(e) => setLines(prev => prev.map((x, i) => i === idx ? { ...x, taxPercent: e.target.value } : x))} /></TableCell>
                      <TableCell className="text-right text-xs tabular-nums font-medium">{lineTotal.toFixed(2)}</TableCell>
                      <TableCell>{lines.length > 1 && <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setLines(lines.filter((_, i) => i !== idx))}><X className="h-3 w-3" /></Button>}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="p-2 border-t border-border bg-muted/30">
              <Button type="button" variant="ghost" size="sm" onClick={() => setLines([...lines, { productId: "", description: "", quantity: "1", uom: "pcs", unitPrice: "0", taxPercent: "18" }])}>
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
            <div className="space-y-2 sm:col-span-1">
              <Label className="text-xs">Notes (visible to customer)</Label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 text-xs bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                placeholder="Add a note for the customer…"
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
              placeholder="Payment terms, validity, GST applicability…"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Save Changes" : "Create Quotation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function QuotationViewDialog({ quotation, onClose }: { quotation: Quotation; onClose: () => void }) {
  const [full, setFull] = React.useState<Quotation | null>(null);

  React.useEffect(() => {
    fetch(`/api/quotations/${quotation.id}`).then(r => r.json()).then(d => setFull(d?.quotation ?? null)).catch(() => {});
  }, [quotation.id]);

  async function printQuotation() {
    if (!full) return;
    const profile = await getCompanyProfile();
    const html = `
      ${buildLetterhead(profile)}
      <div style="display:flex;justify-content:space-between;margin-bottom:16px">
        <div><h1 style="margin:0">QUOTATION</h1><div><strong>${full.quotationNumber}</strong></div></div>
        <div style="text-align:right;font-size:11px;color:#64748b">
          <div>Date: ${formatDate(full.quotationDate)}</div>
          <div>Valid Until: ${formatDate(full.validUntil)}</div>
        </div>
      </div>
      <h2>Quote For</h2>
      <p><strong>${full.party?.displayName ?? ""}</strong></p>
      ${full.party?.email ? `<p class="muted">${full.party.email}</p>` : ""}
      ${full.party?.phone ? `<p class="muted">${full.party.phone}</p>` : ""}
      ${full.party?.taxId ? `<p class="muted">Tax ID: ${full.party.taxId}</p>` : ""}
      <h2>Line Items</h2>
      <table>
        <thead><tr><th>#</th><th>Description</th><th class="text-right">Qty</th><th class="text-right">Price</th><th class="text-right">Tax%</th><th class="text-right">Total</th></tr></thead>
        <tbody>
          ${(full.lines ?? []).map((l, i) => `<tr><td>${i + 1}</td><td>${l.description}</td><td class="text-right">${l.quantity} ${l.uom}</td><td class="text-right">${l.unitPrice.toFixed(2)}</td><td class="text-right">${l.taxPercent}%</td><td class="text-right">${l.lineTotal.toFixed(2)}</td></tr>`).join("")}
        </tbody>
      </table>
      <table class="totals">
        <tr><td>Subtotal</td><td class="text-right">${full.currencyCode} ${full.subtotal.toFixed(2)}</td></tr>
        <tr><td>Tax</td><td class="text-right">${full.currencyCode} ${full.taxAmount.toFixed(2)}</td></tr>
        <tr class="total"><td>Total</td><td class="text-right">${full.currencyCode} ${full.totalAmount.toFixed(2)}</td></tr>
      </table>
      ${full.notes ? `<h2>Notes</h2><p class="muted">${full.notes}</p>` : ""}
      ${full.termsConditions ? `<h2>Terms &amp; Conditions</h2><p class="muted">${full.termsConditions}</p>` : ""}
      ${buildFooter(profile)}
    `;
    printHTML(html, `Quotation ${full.quotationNumber}`, getPrintCss(profile?.primaryColor ?? "#1B6D97"));
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2 text-base">
            <span className="font-mono">{quotation.quotationNumber}</span>
            <Button variant="default" size="sm" className="h-7" onClick={printQuotation} disabled={!full}>
              <Printer className="mr-1.5 h-3.5 w-3.5" /> Print
            </Button>
          </DialogTitle>
          <DialogDescription>{new Date(quotation.quotationDate).toLocaleDateString()} · Valid until {new Date(quotation.validUntil).toLocaleDateString()}</DialogDescription>
        </DialogHeader>
        {full ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Customer</p>
                <p className="font-medium">{full.party?.displayName ?? "—"}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase">Total</p>
                <p className="text-2xl font-bold tabular-nums">{full.currencyCode} {full.totalAmount.toLocaleString()}</p>
              </div>
            </div>
            <div className="border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader><TableRow className="bg-muted/50">
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {full.lines?.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-sm">{l.description}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{l.quantity} {l.uom}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{l.unitPrice.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums font-medium">{l.lineTotal.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end">
              <div className="w-64 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">₹{full.subtotal.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span className="tabular-nums">₹{full.taxAmount.toLocaleString()}</span></div>
                <div className="flex justify-between pt-1 border-t border-border font-bold"><span>Total</span><span className="tabular-nums">{full.currencyCode} {full.totalAmount.toLocaleString()}</span></div>
              </div>
            </div>
          </div>
        ) : <div className="p-8 text-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> Loading…</div>}
      </DialogContent>
    </Dialog>
  );
}
