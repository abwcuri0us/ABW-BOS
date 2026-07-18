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
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Package, Plus, Search, Loader2, Pencil, Trash2, MoreHorizontal, AlertTriangle, Boxes,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Product {
  id: string; sku: string; barcode: string | null; name: string;
  description: string | null; category: string | null; uom: string;
  productType: string; isStockable: boolean;
  costPrice: number; salePrice: number; currencyCode: string;
  taxCode: string | null; reorderPoint: number | null; reorderQty: number | null;
  weightGrams: number | null; isActive: boolean;
  createdAt: string; updatedAt: string;
  stockEntries?: Array<{
    id: string; quantityOnHand: number; quantityReserved: number;
    averageCost: number; warehouse: { id: string; code: string; name: string };
  }>;
}

export function InventoryContent() {
  const { toast } = useToast();
  const [items, setItems] = React.useState<Product[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [editOpen, setEditOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Product | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (query) params.set("q", query);
      const res = await fetch(`/api/inventory/products?${params}`, { cache: "no-store" });
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

  function openNew() { setEditing(null); setEditOpen(true); }
  function openEdit(p: Product) { setEditing(p); setEditOpen(true); }

  async function handleDelete(p: Product) {
    if (!confirm(`Delete product "${p.name}" (${p.sku})?`)) return;
    const res = await fetch(`/api/inventory/products/${p.id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Product deleted" });
      load();
    } else {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-6 w-6" /> Inventory
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Products, stock on hand, and warehouses · {total} products
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" /> New Product
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by SKU, name, or barcode…"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
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
              <Boxes className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm font-medium">No products found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-24">SKU</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Category</TableHead>
                    <TableHead className="hidden lg:table-cell text-right">Stock</TableHead>
                    <TableHead className="hidden md:table-cell text-right">Cost</TableHead>
                    <TableHead className="text-right">Sale Price</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((p) => {
                    const totalStock = p.stockEntries?.reduce((s, e) => s + e.quantityOnHand, 0) ?? 0;
                    const isLow = p.reorderPoint != null && totalStock < p.reorderPoint && p.isStockable;
                    return (
                      <TableRow key={p.id} className="cursor-pointer hover:bg-accent/5" onClick={() => openEdit(p)}>
                        <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{p.name}</span>
                            {p.productType === "service" && (
                              <Badge variant="outline" className="text-[9px]">SERVICE</Badge>
                            )}
                            {!p.isActive && (
                              <Badge variant="secondary" className="text-[9px]">INACTIVE</Badge>
                            )}
                          </div>
                          {p.barcode && <div className="text-xs text-muted-foreground font-mono">{p.barcode}</div>}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{p.category ?? "—"}</TableCell>
                        <TableCell className="hidden lg:table-cell text-right">
                          {p.isStockable ? (
                            <span className={cn("tabular-nums inline-flex items-center gap-1", isLow && "text-destructive font-medium")}>
                              {isLow && <AlertTriangle className="h-3 w-3" />}
                              {totalStock} {p.uom}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-right tabular-nums text-muted-foreground">
                          {p.costPrice > 0 ? `${p.currencyCode} ${p.costPrice.toLocaleString()}` : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {p.currencyCode} {p.salePrice.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem onClick={() => openEdit(p)}>
                                <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(p)} className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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

      <ProductEditDialog
        open={editOpen} onOpenChange={setEditOpen}
        product={editing} submitting={submitting} setSubmitting={setSubmitting}
        onSaved={() => { setEditOpen(false); load(); }}
      />
    </div>
  );
}

function ProductEditDialog({
  open, onOpenChange, product, submitting, setSubmitting, onSaved,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  product: Product | null; submitting: boolean; setSubmitting: (v: boolean) => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const isEdit = !!product;

  const [form, setForm] = React.useState({
    sku: "", barcode: "", name: "", description: "", category: "",
    uom: "pcs", productType: "goods", isStockable: true,
    costPrice: "", salePrice: "", currencyCode: "INR", taxCode: "",
    reorderPoint: "", reorderQty: "", weightGrams: "", isActive: true,
  });

  React.useEffect(() => {
    if (open) {
      if (product) {
        setForm({
          sku: product.sku,
          barcode: product.barcode ?? "",
          name: product.name,
          description: product.description ?? "",
          category: product.category ?? "",
          uom: product.uom,
          productType: product.productType,
          isStockable: product.isStockable,
          costPrice: String(product.costPrice),
          salePrice: String(product.salePrice),
          currencyCode: product.currencyCode,
          taxCode: product.taxCode ?? "",
          reorderPoint: product.reorderPoint != null ? String(product.reorderPoint) : "",
          reorderQty: product.reorderQty != null ? String(product.reorderQty) : "",
          weightGrams: product.weightGrams != null ? String(product.weightGrams) : "",
          isActive: product.isActive,
        });
      } else {
        setForm({
          sku: "", barcode: "", name: "", description: "", category: "",
          uom: "pcs", productType: "goods", isStockable: true,
          costPrice: "", salePrice: "", currencyCode: "INR", taxCode: "",
          reorderPoint: "", reorderQty: "", weightGrams: "", isActive: true,
        });
      }
    }
  }, [open, product]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.sku || !form.name) {
      toast({ title: "SKU and name required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        costPrice: form.costPrice === "" ? 0 : Number(form.costPrice),
        salePrice: form.salePrice === "" ? 0 : Number(form.salePrice),
        reorderPoint: form.reorderPoint === "" ? null : Number(form.reorderPoint),
        reorderQty: form.reorderQty === "" ? null : Number(form.reorderQty),
        weightGrams: form.weightGrams === "" ? null : Number(form.weightGrams),
        taxCode: form.taxCode || null,
        barcode: form.barcode || null,
        category: form.category || null,
        description: form.description || null,
      };
      const url = isEdit ? `/api/inventory/products/${product!.id}` : "/api/inventory/products";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast({ title: isEdit ? "Product updated" : "Product created" });
        onSaved();
      } else {
        const d = await res.json();
        toast({ title: "Failed", description: d.error, variant: "destructive" });
      }
    } finally { setSubmitting(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {isEdit ? "Edit Product" : "New Product"}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? "Update product details" : "Create a new product or service"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU *</Label>
              <Input id="sku" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} disabled={isEdit} required placeholder="LAP-001" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="barcode">Barcode</Label>
              <Input id="barcode" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="8901234567890" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Input id="desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cat">Category</Label>
              <Input id="cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Electronics" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uom">UOM</Label>
              <Select value={form.uom} onValueChange={(v) => setForm({ ...form, uom: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pcs">pcs</SelectItem>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="m">m</SelectItem>
                  <SelectItem value="ream">ream</SelectItem>
                  <SelectItem value="pack">pack</SelectItem>
                  <SelectItem value="hour">hour</SelectItem>
                  <SelectItem value="box">box</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ptype">Type</Label>
              <Select value={form.productType} onValueChange={(v) => setForm({ ...form, productType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="goods">Goods</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="bundle">Bundle</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost">Cost Price</Label>
              <Input id="cost" type="number" step="0.01" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sale">Sale Price</Label>
              <Input id="sale" type="number" step="0.01" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="curr">Currency</Label>
              <Select value={form.currencyCode} onValueChange={(v) => setForm({ ...form, currencyCode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">INR ₹</SelectItem>
                  <SelectItem value="USD">USD $</SelectItem>
                  <SelectItem value="EUR">EUR €</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.isStockable && (
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reorder">Reorder Point</Label>
                <Input id="reorder" type="number" value={form.reorderPoint} onChange={(e) => setForm({ ...form, reorderPoint: e.target.value })} placeholder="5" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reorderQty">Reorder Qty</Label>
                <Input id="reorderQty" type="number" value={form.reorderQty} onChange={(e) => setForm({ ...form, reorderQty: e.target.value })} placeholder="20" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (g)</Label>
                <Input id="weight" type="number" value={form.weightGrams} onChange={(e) => setForm({ ...form, weightGrams: e.target.value })} placeholder="1500" />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={form.isStockable} onCheckedChange={(v) => setForm({ ...form, isStockable: Boolean(v) })} />
                Stockable
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
                Active
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Save changes" : "Create product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
