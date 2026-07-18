"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Layout, Plus, Loader2, Pencil, Trash2, Star, Eye, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { printHTML } from "@/lib/export";

interface Template {
  id: string; type: string; name: string; content: string;
  headerHtml: string | null; footerHtml: string | null; css: string | null;
  isDefault: boolean; isActive: boolean;
  createdAt: string; updatedAt: string;
}

const TEMPLATE_TYPES = [
  { value: "invoice", label: "Invoice" },
  { value: "quotation", label: "Quotation" },
  { value: "letter", label: "Letter" },
  { value: "report", label: "Report" },
  { value: "salary_slip", label: "Salary Slip" },
];

const PLACEHOLDER_HINTS = `
Available placeholders (use {{placeholder}} in content):
Invoice: {{invoiceNumber}}, {{invoiceDate}}, {{dueDate}}, {{customerName}}, {{customerEmail}},
         {{customerPhone}}, {{customerTaxId}}, {{items}}, {{subtotal}}, {{tax}}, {{total}},
         {{paid}}, {{balance}}, {{status}}, {{notes}}, {{terms}}
Quotation: {{quotationNumber}}, {{quotationDate}}, {{validUntil}}, {{customerName}},
           {{items}}, {{subtotal}}, {{tax}}, {{total}}, {{notes}}, {{terms}}
Letter: {{letterNumber}}, {{letterDate}}, {{recipientName}}, {{recipientAddress}},
        {{subject}}, {{body}}
Company: {{companyName}}, {{companyAddress}}, {{companyPhone}}, {{companyEmail}},
         {{companyTaxId}}, {{companyLogo}}, {{bankName}}, {{bankAccount}}, {{bankIfsc}}
`;

export function TemplatesContent() {
  const { toast } = useToast();
  const [items, setItems] = React.useState<Template[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [typeFilter, setTypeFilter] = React.useState("");
  const [editOpen, setEditOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Template | null>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewHtml, setPreviewHtml] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set("type", typeFilter);
      const res = await fetch(`/api/templates?${params}`, { cache: "no-store" });
      if (res.ok) setItems((await res.json()).items ?? []);
    } finally { setLoading(false); }
  }, [typeFilter]);

  React.useEffect(() => { load(); }, [load]);

  async function handleDelete(t: Template) {
    if (!confirm(`Delete template "${t.name}"?`)) return;
    await fetch(`/api/templates?id=${t.id}`, { method: "DELETE" });
    toast({ title: "Template deleted" });
    load();
  }

  async function setDefault(t: Template) {
    await fetch("/api/templates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: t.id, isDefault: true }),
    });
    toast({ title: `"${t.name}" set as default for ${t.type}` });
    load();
  }

  function preview(t: Template) {
    const sampleHtml = t.content
      .replace(/{{invoiceNumber}}/g, "INV-2026-00001")
      .replace(/{{quotationNumber}}/g, "QUO-2026-00001")
      .replace(/{{letterNumber}}/g, "LTR-2026-00001")
      .replace(/{{invoiceDate}}/g, new Date().toLocaleDateString())
      .replace(/{{quotationDate}}/g, new Date().toLocaleDateString())
      .replace(/{{letterDate}}/g, new Date().toLocaleDateString())
      .replace(/{{dueDate}}/g, new Date(Date.now() + 30 * 86400000).toLocaleDateString())
      .replace(/{{validUntil}}/g, new Date(Date.now() + 30 * 86400000).toLocaleDateString())
      .replace(/{{customerName}}/g, "Acme Industries Pvt Ltd")
      .replace(/{{recipientName}}/g, "John Doe")
      .replace(/{{customerEmail}}/g, "accounts@acme.example")
      .replace(/{{customerPhone}}/g, "+91 22 4567 8901")
      .replace(/{{customerTaxId}}/g, "27AABCA1234L1Z5")
      .replace(/{{recipientAddress}}/g, "123 Business Street, Mumbai 400001")
      .replace(/{{subject}}/g, "Offer of Employment")
      .replace(/{{subtotal}}/g, "₹1,50,000.00")
      .replace(/{{tax}}/g, "₹27,000.00")
      .replace(/{{total}}/g, "₹1,77,000.00")
      .replace(/{{paid}}/g, "₹0.00")
      .replace(/{{balance}}/g, "₹1,77,000.00")
      .replace(/{{status}}/g, "DRAFT")
      .replace(/{{companyName}}/g, "ABWcurious")
      .replace(/{{companyAddress}}/g, "Mumbai, Maharashtra, India")
      .replace(/{{companyPhone}}/g, "+91 22 1234 5678")
      .replace(/{{companyEmail}}/g, "info@abwcurious.local")
      .replace(/{{companyTaxId}}/g, "GSTIN: 27AABCA1234L1Z5")
      .replace(/{{bankName}}/g, "HDFC Bank")
      .replace(/{{bankAccount}}/g, "XXXX1234")
      .replace(/{{bankIfsc}}/g, "HDFC0001234")
      .replace(/{{items}}/g, `<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr><th style="text-align:left;padding:6px;border-bottom:2px solid #1B6D97">#</th><th style="text-align:left;padding:6px;border-bottom:2px solid #1B6D97">Description</th><th style="text-align:right;padding:6px;border-bottom:2px solid #1B6D97">Qty</th><th style="text-align:right;padding:6px;border-bottom:2px solid #1B6D97">Price</th><th style="text-align:right;padding:6px;border-bottom:2px solid #1B6D97">Total</th></tr></thead><tbody><tr><td style="padding:6px;border-bottom:1px solid #e2e8f0">1</td><td style="padding:6px;border-bottom:1px solid #e2e8f0">Dell Laptop</td><td style="text-align:right;padding:6px;border-bottom:1px solid #e2e8f0">2</td><td style="text-align:right;padding:6px;border-bottom:1px solid #e2e8f0">75,000</td><td style="text-align:right;padding:6px;border-bottom:1px solid #e2e8f0">1,50,000</td></tr></tbody></table>`)
      .replace(/{{notes}}/g, "Thank you for your business.")
      .replace(/{{terms}}/g, "Payment due within 30 days. 18% GST applicable.")
      .replace(/{{body}}/g, "Dear John Doe,\n\nWe are pleased to offer you the position of Software Engineer at ABWcurious...");

    const fullHtml = (t.headerHtml ?? "") + sampleHtml + (t.footerHtml ?? "");
    setPreviewHtml(fullHtml);
    setPreviewOpen(true);
  }

  function exportPdf(t: Template) {
    preview(t);
    setTimeout(() => {
      printHTML(previewHtml, `Template: ${t.name}`, t.css || undefined);
    }, 500);
  }

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Layout className="h-6 w-6" /> Document Templates
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Customize layouts for invoices, quotations, letters, reports, and salary slips
        </p>
      </div>

      <Card>
        <CardContent className="p-4 flex justify-between items-center gap-3 flex-wrap">
          <Select value={typeFilter || "all"} onValueChange={(v) => setTypeFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {TEMPLATE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => { setEditing(null); setEditOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> New Template
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center">
              <Layout className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm font-medium">No templates yet</p>
              <p className="text-xs text-muted-foreground mt-1">Create a custom template for invoices, quotations, or letters</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((t) => (
                <div key={t.id} className="p-4 flex items-center justify-between hover:bg-accent/5">
                  <div className="flex items-center gap-3">
                    <div className={cn("h-9 w-9 rounded-md flex items-center justify-center", t.isDefault ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                      <Layout className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{t.name}</span>
                        {t.isDefault && <Badge variant="default" className="text-[9px]"><Star className="h-2.5 w-2.5 mr-0.5" /> DEFAULT</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[9px] mr-1 capitalize">{t.type}</Badge>
                        Updated {new Date(t.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => preview(t)} title="Preview"><Eye className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => exportPdf(t)} title="Export PDF"><Download className="h-3.5 w-3.5" /></Button>
                    {!t.isDefault && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDefault(t)} title="Set as default"><Star className="h-3.5 w-3.5" /></Button>}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(t); setEditOpen(true); }} title="Edit"><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(t)} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Placeholder hints */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-4">
          <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap font-mono">{PLACEHOLDER_HINTS.trim()}</pre>
        </CardContent>
      </Card>

      <TemplateDialog open={editOpen} onOpenChange={setEditOpen} template={editing} onSaved={() => { setEditOpen(false); load(); }} />
      <PreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} html={previewHtml} />
    </div>
  );
}

function TemplateDialog({ open, onOpenChange, template, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  template: Template | null; onSaved: () => void;
}) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState({
    type: "invoice", name: "", content: "", headerHtml: "", footerHtml: "", css: "", isDefault: false,
  });

  React.useEffect(() => {
    if (open) {
      if (template) {
        setForm({
          type: template.type, name: template.name,
          content: template.content || "",
          headerHtml: template.headerHtml || "",
          footerHtml: template.footerHtml || "",
          css: template.css || "",
          isDefault: template.isDefault,
        });
      } else {
        setForm({ type: "invoice", name: "", content: "", headerHtml: "", footerHtml: "", css: "", isDefault: false });
      }
    }
  }, [open, template]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) { toast({ title: "Name required", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const payload = { ...form, ...(template ? { id: template.id } : {}) };
      const method = template ? "PUT" : "POST";
      const res = await fetch("/api/templates", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) {
        toast({ title: template ? "Template updated" : "Template created" });
        onSaved();
      } else {
        const d = await res.json(); toast({ title: "Failed", description: d.error, variant: "destructive" });
      }
    } finally { setSubmitting(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {template ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {template ? "Edit Template" : "New Template"}
          </DialogTitle>
          <DialogDescription>Customize the layout using HTML and placeholders</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Template Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TEMPLATE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Template Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Default Invoice Template" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Header HTML (optional — appears above content)</Label>
            <Textarea
              value={form.headerHtml}
              onChange={(e) => setForm({ ...form, headerHtml: e.target.value })}
              rows={3}
              className="font-mono text-xs"
              placeholder='<div style="text-align:center;border-bottom:2px solid #1B6D97;padding-bottom:10px"><h1>{{companyName}}</h1><p>{{companyAddress}} | {{companyPhone}}</p></div>'
            />
          </div>

          <div className="space-y-2">
            <Label>Main Content (HTML with placeholders)</Label>
            <Textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={12}
              className="font-mono text-xs"
              placeholder='<h2>TAX INVOICE</h2><p>Invoice #: {{invoiceNumber}} | Date: {{invoiceDate}}</p><p>Bill To: {{customerName}}</p>{{items}}<p>Subtotal: {{subtotal}} | Tax: {{tax}} | Total: {{total}}</p><p>{{notes}}</p>'
            />
          </div>

          <div className="space-y-2">
            <Label>Footer HTML (optional — appears below content)</Label>
            <Textarea
              value={form.footerHtml}
              onChange={(e) => setForm({ ...form, footerHtml: e.target.value })}
              rows={3}
              className="font-mono text-xs"
              placeholder='<div style="margin-top:30px;border-top:1px solid #ccc;padding-top:10px;text-align:center;font-size:10px">Bank: {{bankName}} | A/C: {{bankAccount}} | IFSC: {{bankIfsc}}</div>'
            />
          </div>

          <div className="space-y-2">
            <Label>Custom CSS (optional — overrides default styles)</Label>
            <Textarea
              value={form.css}
              onChange={(e) => setForm({ ...form, css: e.target.value })}
              rows={4}
              className="font-mono text-xs"
              placeholder="body { font-family: 'Times New Roman', serif; } h2 { color: #1B6D97; }"
            />
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Switch checked={form.isDefault} onCheckedChange={(v) => setForm({ ...form, isDefault: v })} />
            Set as default for this type
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{template ? "Save" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PreviewDialog({ open, onOpenChange, html }: { open: boolean; onOpenChange: (v: boolean) => void; html: string }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Template Preview</DialogTitle>
          <DialogDescription>Sample output with placeholder values filled in</DialogDescription>
        </DialogHeader>
        <div
          className="border border-border rounded-lg p-6 bg-white overflow-y-auto"
          style={{ fontFamily: "'Times New Roman', Times, serif" }}
          dangerouslySetInnerHTML={{ __html: html || "<p>No content</p>" }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => printHTML(html, "Template Preview")}>
            <Download className="mr-2 h-4 w-4" /> Print / Save as PDF
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
