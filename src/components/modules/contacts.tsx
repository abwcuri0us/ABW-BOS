"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Users,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Mail,
  Phone,
  Building2,
  User as UserIcon,
  Loader2,
  AlertCircle,
  Download,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { exportCSV, exportExcel } from "@/lib/export";

interface Party {
  id: string;
  partyType: "person" | "organization";
  subTypes: string;
  displayName: string;
  legalName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  taxId: string | null;
  taxIdType: string | null;
  currencyCode: string;
  creditLimit: number | null;
  paymentTermsDays: number | null;
  isActive: boolean;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  addresses?: Array<{
    id: string;
    addressType: string;
    line1: string;
    line2: string | null;
    city: string;
    stateProvince: string | null;
    postalCode: string | null;
    countryCode: string;
    isDefault: boolean;
  }>;
  contactMethods?: Array<{
    id: string;
    methodType: string;
    value: string;
    label: string | null;
    isDefault: boolean;
  }>;
}

function parseSubTypes(s: string): string[] {
  try {
    return JSON.parse(s);
  } catch {
    return [];
  }
}

export function ContactsContent() {
  const { toast } = useToast();
  const [items, setItems] = React.useState<Party[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<string>("");
  const [editOpen, setEditOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Party | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "20",
      });
      if (query) params.set("q", query);
      if (typeFilter) params.set("type", typeFilter);
      const res = await fetch(`/api/contacts?${params}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } finally {
      setLoading(false);
    }
  }, [page, query, typeFilter]);

  React.useEffect(() => {
    const t = setTimeout(load, 250); // debounce
    return () => clearTimeout(t);
  }, [load]);

  function openNew() {
    setEditing(null);
    setEditOpen(true);
  }

  function openEdit(p: Party) {
    setEditing(p);
    setEditOpen(true);
  }

  async function handleDelete(p: Party) {
    if (!confirm(`Delete party "${p.displayName}"? This is a soft-delete and can be undone by an admin.`)) return;
    const res = await fetch(`/api/contacts/${p.id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Party deleted", description: p.displayName });
      load();
    } else {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6" />
            Contacts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Customers, suppliers, and other parties · {total} total
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
                const rows = items.map((p) => ({
                  displayName: p.displayName, legalName: p.legalName ?? "",
                  partyType: p.partyType, subTypes: p.subTypes,
                  email: p.email ?? "", phone: p.phone ?? "",
                  taxId: p.taxId ?? "", currencyCode: p.currencyCode,
                  creditLimit: p.creditLimit ?? "", paymentTermsDays: p.paymentTermsDays ?? "",
                  isActive: p.isActive, createdAt: p.createdAt,
                }));
                exportCSV("contacts", rows);
              }}>
                <FileText className="mr-2 h-3.5 w-3.5" /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                const rows = items.map((p) => ({
                  displayName: p.displayName, legalName: p.legalName ?? "",
                  partyType: p.partyType, subTypes: p.subTypes,
                  email: p.email ?? "", phone: p.phone ?? "",
                  taxId: p.taxId ?? "", currencyCode: p.currencyCode,
                  creditLimit: p.creditLimit ?? "", paymentTermsDays: p.paymentTermsDays ?? "",
                  isActive: p.isActive, createdAt: p.createdAt,
                }));
                exportExcel("contacts", rows, "Contacts");
              }}>
                <FileSpreadsheet className="mr-2 h-3.5 w-3.5" /> Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" />
            New Party
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, phone, tax ID…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={typeFilter}
            onValueChange={(v) => {
              setTypeFilter(v === "all" ? "" : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="customer">Customers</SelectItem>
              <SelectItem value="supplier">Suppliers</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading parties…
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm font-medium">No parties found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {query || typeFilter ? "Try adjusting your filters." : "Create your first party to get started."}
              </p>
              {!query && !typeFilter && (
                <Button onClick={openNew} className="mt-4" size="sm">
                  <Plus className="mr-2 h-4 w-4" /> New Party
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead className="hidden md:table-cell">Sub-types</TableHead>
                  <TableHead className="hidden lg:table-cell">Email</TableHead>
                  <TableHead className="hidden lg:table-cell">Phone</TableHead>
                  <TableHead className="hidden xl:table-cell text-right">Credit Limit</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((party) => {
                  const subTypes = parseSubTypes(party.subTypes);
                  return (
                    <TableRow
                      key={party.id}
                      className="cursor-pointer hover:bg-accent/5"
                      onClick={() => openEdit(party)}
                    >
                      <TableCell>
                        <div className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center",
                          party.partyType === "organization"
                            ? "bg-info/10 text-info"
                            : "bg-success/10 text-success",
                        )}>
                          {party.partyType === "organization" ? (
                            <Building2 className="h-4 w-4" />
                          ) : (
                            <UserIcon className="h-4 w-4" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{party.displayName}</div>
                        {party.legalName && party.legalName !== party.displayName && (
                          <div className="text-xs text-muted-foreground">{party.legalName}</div>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {party.partyType}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {subTypes.map((st) => (
                            <Badge
                              key={st}
                              variant={st === "customer" ? "default" : st === "supplier" ? "secondary" : "outline"}
                              className="text-[10px] capitalize"
                            >
                              {st}
                            </Badge>
                          ))}
                          {subTypes.length === 0 && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {party.email ? (
                          <span className="flex items-center gap-1.5">
                            <Mail className="h-3 w-3" /> {party.email}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {party.phone ? (
                          <span className="flex items-center gap-1.5">
                            <Phone className="h-3 w-3" /> {party.phone}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-right tabular-nums text-sm">
                        {party.creditLimit != null ? (
                          <>
                            {party.currencyCode}{" "}
                            {party.creditLimit.toLocaleString()}
                          </>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => openEdit(party)}>
                              <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(party)}
                              className="text-destructive focus:text-destructive"
                            >
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
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Edit / Create dialog */}
      <PartyEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        party={editing}
        submitting={submitting}
        setSubmitting={setSubmitting}
        onSaved={() => {
          setEditOpen(false);
          load();
        }}
      />
    </div>
  );
}

// ============================================================
// Party create/edit dialog
// ============================================================

interface PartyEditDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  party: Party | null;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
  onSaved: () => void;
}

function PartyEditDialog({
  open,
  onOpenChange,
  party,
  submitting,
  setSubmitting,
  onSaved,
}: PartyEditDialogProps) {
  const { toast } = useToast();
  const isEdit = !!party;

  // Form state
  const [form, setForm] = React.useState({
    partyType: "organization" as "person" | "organization",
    subTypes: [] as string[],
    displayName: "",
    legalName: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    taxId: "",
    taxIdType: "gst",
    currencyCode: "INR",
    creditLimit: "" as string | number,
    paymentTermsDays: "" as string | number,
    isActive: true,
  });

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      if (party) {
        setForm({
          partyType: party.partyType,
          subTypes: parseSubTypes(party.subTypes),
          displayName: party.displayName,
          legalName: party.legalName ?? "",
          firstName: party.firstName ?? "",
          lastName: party.lastName ?? "",
          email: party.email ?? "",
          phone: party.phone ?? "",
          taxId: party.taxId ?? "",
          taxIdType: party.taxIdType ?? "gst",
          currencyCode: party.currencyCode,
          creditLimit: party.creditLimit ?? "",
          paymentTermsDays: party.paymentTermsDays ?? "",
          isActive: party.isActive,
        });
      } else {
        setForm({
          partyType: "organization",
          subTypes: ["customer"],
          displayName: "",
          legalName: "",
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          taxId: "",
          taxIdType: "gst",
          currencyCode: "INR",
          creditLimit: "",
          paymentTermsDays: "",
          isActive: true,
        });
      }
    }
  }, [open, party]);

  function toggleSubType(st: string) {
    setForm((f) => ({
      ...f,
      subTypes: f.subTypes.includes(st)
        ? f.subTypes.filter((x) => x !== st)
        : [...f.subTypes, st],
    }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.displayName.trim()) {
      toast({ title: "Display name is required", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const payload = {
      ...form,
      creditLimit: form.creditLimit === "" ? null : Number(form.creditLimit),
      paymentTermsDays: form.paymentTermsDays === "" ? null : Number(form.paymentTermsDays),
      ...(isEdit && party ? { version: party.version } : {}),
    };

    try {
      const url = isEdit ? `/api/contacts/${party!.id}` : "/api/contacts";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast({
          title: isEdit ? "Party updated" : "Party created",
          description: form.displayName,
        });
        onSaved();
      } else if (res.status === 409) {
        const data = await res.json();
        toast({
          title: "Conflict",
          description: data.message ?? "Record was modified by another user. Reload and try again.",
          variant: "destructive",
        });
      } else {
        const data = await res.json().catch(() => ({}));
        toast({
          title: "Save failed",
          description: data.error ?? "Unknown error",
          variant: "destructive",
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {isEdit ? "Edit Party" : "New Party"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update party details. Changes are audit-logged."
              : "Create a new customer, supplier, or other party."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Party type */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Party Type</Label>
              <Select
                value={form.partyType}
                onValueChange={(v) => setForm((f) => ({ ...f, partyType: v as "person" | "organization" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="organization">Organization</SelectItem>
                  <SelectItem value="person">Person</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sub-types</Label>
              <div className="flex flex-wrap gap-3 pt-1.5">
                {["customer", "supplier", "partner", "vendor"].map((st) => (
                  <label
                    key={st}
                    className="flex items-center gap-1.5 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={form.subTypes.includes(st)}
                      onCheckedChange={() => toggleSubType(st)}
                    />
                    <span className="capitalize">{st}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Name fields */}
          {form.partyType === "organization" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="displayName">Display Name *</Label>
                <Input
                  id="displayName"
                  value={form.displayName}
                  onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                  required
                  placeholder="Acme Industries Pvt Ltd"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="legalName">Legal Name</Label>
                <Input
                  id="legalName"
                  value={form.legalName}
                  onChange={(e) => setForm((f) => ({ ...f, legalName: e.target.value }))}
                  placeholder="Acme Industries Private Limited"
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="salutation">Salutation</Label>
                <Input
                  id="salutation"
                  placeholder="Mr."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                />
              </div>
              <div className="space-y-2 sm:col-span-3">
                <Label htmlFor="displayName-person">Display Name *</Label>
                <Input
                  id="displayName-person"
                  value={form.displayName}
                  onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                  required
                  placeholder="Rajesh Kumar"
                />
              </div>
            </div>
          )}

          {/* Contact info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="accounts@acme.example"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          {/* Tax info */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="taxId">Tax ID</Label>
              <Input
                id="taxId"
                value={form.taxId}
                onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value }))}
                placeholder="27AABCA1234L1Z5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxIdType">Tax Type</Label>
              <Select
                value={form.taxIdType}
                onValueChange={(v) => setForm((f) => ({ ...f, taxIdType: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gst">GST</SelectItem>
                  <SelectItem value="pan">PAN</SelectItem>
                  <SelectItem value="ein">EIN</SelectItem>
                  <SelectItem value="vat">VAT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Financial info */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={form.currencyCode}
                onValueChange={(v) => setForm((f) => ({ ...f, currencyCode: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">INR ₹</SelectItem>
                  <SelectItem value="USD">USD $</SelectItem>
                  <SelectItem value="EUR">EUR €</SelectItem>
                  <SelectItem value="GBP">GBP £</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="creditLimit">Credit Limit</Label>
              <Input
                id="creditLimit"
                type="number"
                value={form.creditLimit}
                onChange={(e) => setForm((f) => ({ ...f, creditLimit: e.target.value }))}
                placeholder="500000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentTerms">Payment Terms (days)</Label>
              <Input
                id="paymentTerms"
                type="number"
                value={form.paymentTermsDays}
                onChange={(e) => setForm((f) => ({ ...f, paymentTermsDays: e.target.value }))}
                placeholder="30"
              />
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div>
              <Label htmlFor="isActive" className="text-sm">Active</Label>
              <p className="text-xs text-muted-foreground">Inactive parties cannot be selected on new transactions</p>
            </div>
            <Switch
              id="isActive"
              checked={form.isActive}
              onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
            />
          </div>

          {/* Submit */}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Save changes" : "Create party"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
