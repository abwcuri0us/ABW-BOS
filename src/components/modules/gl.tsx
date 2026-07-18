"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { BookOpen, Plus, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Account {
  id: string; code: string; name: string;
  accountType: string; subType: string | null;
  isGroup: boolean; isActive: boolean;
  openingBalance: number; currencyCode: string;
}

interface JournalEntry {
  id: string; entryNumber: string; entryDate: string;
  description: string | null; status: string;
  totalDebit: number; totalCredit: number; isBalanced: boolean;
  lines: Array<{
    id: string; lineNumber: number; debitAmount: number; creditAmount: number;
    description: string | null; account: { id: string; code: string; name: string };
  }>;
}

const TYPE_COLORS: Record<string, string> = {
  asset: "bg-info/10 text-info border-info/30",
  liability: "bg-warning/10 text-warning border-warning/30",
  equity: "bg-primary/10 text-primary border-primary/30",
  revenue: "bg-success/10 text-success border-success/30",
  expense: "bg-destructive/10 text-destructive border-destructive/30",
};

export function GlContent() {
  const [tab, setTab] = React.useState("accounts");
  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BookOpen className="h-6 w-6" />
          General Ledger
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Chart of accounts, journal entries, and financial reporting
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="accounts">Chart of Accounts</TabsTrigger>
          <TabsTrigger value="journal">Journal Entries</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="mt-4">
          <AccountsTab />
        </TabsContent>
        <TabsContent value="journal" className="mt-4">
          <JournalTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// Accounts Tab
// ============================================================

function AccountsTab() {
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [createOpen, setCreateOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gl/accounts", { cache: "no-store" });
      if (res.ok) setAccounts((await res.json()).items);
    } finally { setLoading(false); }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  // Group by type
  const grouped = accounts.reduce((acc, a) => {
    (acc[a.accountType] ??= []).push(a);
    return acc;
  }, {} as Record<string, Account[]>);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Account
        </Button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> Loading accounts…
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([type, items]) => (
            <Card key={type}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 capitalize">
                  <span className={cn("text-[10px] px-2 py-0.5 rounded border font-medium uppercase", TYPE_COLORS[type])}>
                    {type}
                  </span>
                  <span>{items.length} accounts</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="w-24">Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden md:table-cell">Sub-type</TableHead>
                      <TableHead className="text-right">Opening Balance</TableHead>
                      <TableHead className="w-20">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((a) => (
                      <TableRow key={a.id} className={cn(a.isGroup && "font-medium bg-muted/20")}>
                        <TableCell className="font-mono text-xs">{a.code}</TableCell>
                        <TableCell>
                          {a.isGroup && <Badge variant="outline" className="mr-2 text-[9px]">GROUP</Badge>}
                          {a.name}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground capitalize">
                          {a.subType ?? "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {a.currencyCode} {a.openingBalance.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={a.isActive ? "default" : "secondary"} className="text-[10px]">
                            {a.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateAccountDialog open={createOpen} onOpenChange={setCreateOpen} onSaved={load} />
    </div>
  );
}

function CreateAccountDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState({
    code: "", name: "", accountType: "asset", subType: "", openingBalance: "0", isGroup: false,
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code || !form.name) {
      toast({ title: "Code and name required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/gl/accounts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, openingBalance: Number(form.openingBalance) || 0 }),
      });
      if (res.ok) {
        toast({ title: "Account created" });
        setForm({ code: "", name: "", accountType: "asset", subType: "", openingBalance: "0", isGroup: false });
        onOpenChange(false);
        onSaved();
      } else {
        const d = await res.json();
        toast({ title: "Failed", description: d.error, variant: "destructive" });
      }
    } finally { setSubmitting(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create GL Account</DialogTitle>
          <DialogDescription>Add a new account to the chart of accounts</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="code">Code *</Label>
              <Input id="code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="1000" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={form.accountType} onValueChange={(v) => setForm({ ...form, accountType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="asset">Asset</SelectItem>
                  <SelectItem value="liability">Liability</SelectItem>
                  <SelectItem value="equity">Equity</SelectItem>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Cash on Hand" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="subType">Sub-type</Label>
              <Input id="subType" value={form.subType} onChange={(e) => setForm({ ...form, subType: e.target.value })} placeholder="current_asset" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="opening">Opening Balance</Label>
              <Input id="opening" type="number" value={form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Journal Tab
// ============================================================

function JournalTab() {
  const [entries, setEntries] = React.useState<JournalEntry[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<JournalEntry | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/gl/journal?page=${page}&pageSize=20`, { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setEntries(d.items); setTotal(d.total); setTotalPages(d.totalPages);
      }
    } finally { setLoading(false); }
  }, [page]);

  React.useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <p className="text-sm text-muted-foreground">{total} entries</p>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Journal Entry
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> Loading…
            </div>
          ) : entries.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">No journal entries yet</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-32">Entry #</TableHead>
                  <TableHead className="w-32">Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.id} className="cursor-pointer hover:bg-accent/5" onClick={() => setSelected(e)}>
                    <TableCell className="font-mono text-xs">{e.entryNumber}</TableCell>
                    <TableCell className="text-xs">{new Date(e.entryDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-sm">{e.description ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{e.totalDebit.toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums">{e.totalCredit.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={e.status === "posted" ? "default" : e.status === "draft" ? "secondary" : "outline"} className="text-[10px] capitalize">
                        {e.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-between">
          <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
          </div>
        </div>
      )}

      <CreateJournalDialog open={createOpen} onOpenChange={setCreateOpen} onSaved={load} />

      {selected && <JournalDetailDialog entry={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function CreateJournalDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = React.useState(false);
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [entryDate, setEntryDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = React.useState("");
  const [lines, setLines] = React.useState([
    { accountId: "", debitAmount: "", creditAmount: "", description: "" },
    { accountId: "", debitAmount: "", creditAmount: "", description: "" },
  ]);

  React.useEffect(() => {
    if (open) {
      fetch("/api/gl/accounts").then(r => r.json()).then(d => setAccounts(d?.items ?? [])).catch(() => {});
    }
  }, [open]);

  const totalDebit = lines.reduce((s, l) => s + (Number(l.debitAmount) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (Number(l.creditAmount) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  function updateLine(idx: number, field: string, value: string) {
    setLines((prev) => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  }
  function addLine() {
    setLines([...lines, { accountId: "", debitAmount: "", creditAmount: "", description: "" }]);
  }
  function removeLine(idx: number) {
    setLines(lines.filter((_, i) => i !== idx));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isBalanced) {
      toast({ title: "Entry not balanced", description: `Debit ${totalDebit} ≠ Credit ${totalCredit}`, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/gl/journal", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryDate, description,
          lines: lines.filter(l => l.accountId).map(l => ({
            accountId: l.accountId,
            debitAmount: Number(l.debitAmount) || 0,
            creditAmount: Number(l.creditAmount) || 0,
            description: l.description,
          })),
        }),
      });
      if (res.ok) {
        toast({ title: "Journal entry posted" });
        setLines([{ accountId: "", debitAmount: "", creditAmount: "", description: "" }, { accountId: "", debitAmount: "", creditAmount: "", description: "" }]);
        setDescription("");
        onOpenChange(false);
        onSaved();
      } else {
        const d = await res.json();
        toast({ title: "Failed", description: d.error, variant: "destructive" });
      }
    } finally { setSubmitting(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Journal Entry</DialogTitle>
          <DialogDescription>Create a double-entry journal. Debits must equal credits.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="jdate">Date</Label>
              <Input id="jdate" type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jdesc">Description</Label>
              <Input id="jdesc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Monthly rent payment" />
            </div>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Account</TableHead>
                  <TableHead className="w-32 text-right">Debit</TableHead>
                  <TableHead className="w-32 text-right">Credit</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((l, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Select value={l.accountId} onValueChange={(v) => updateLine(idx, "accountId", v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select account" /></SelectTrigger>
                        <SelectContent>
                          {(accounts ?? []).map(a => (
                            <SelectItem key={a.id} value={a.id} className="text-xs">
                              {a.code} — {a.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input className="h-8 text-xs text-right tabular-nums" type="number" step="0.01" value={l.debitAmount}
                        onChange={(e) => updateLine(idx, "debitAmount", e.target.value)} />
                    </TableCell>
                    <TableCell>
                      <Input className="h-8 text-xs text-right tabular-nums" type="number" step="0.01" value={l.creditAmount}
                        onChange={(e) => updateLine(idx, "creditAmount", e.target.value)} />
                    </TableCell>
                    <TableCell>
                      {lines.length > 2 && (
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeLine(idx)}>×</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="p-2 border-t border-border bg-muted/30 flex items-center justify-between">
              <Button type="button" variant="ghost" size="sm" onClick={addLine}>
                <Plus className="h-3 w-3 mr-1" /> Add line
              </Button>
              <div className="flex items-center gap-4 text-xs">
                <span className="tabular-nums">Debit: <b>{totalDebit.toLocaleString()}</b></span>
                <span className="tabular-nums">Credit: <b>{totalCredit.toLocaleString()}</b></span>
                <Badge variant={isBalanced ? "default" : "destructive"} className="text-[10px]">
                  {isBalanced ? "Balanced" : `Off by ${Math.abs(totalDebit - totalCredit).toFixed(2)}`}
                </Badge>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting || !isBalanced}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Post Entry
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function JournalDetailDialog({ entry, onClose }: { entry: JournalEntry; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="font-mono">{entry.entryNumber}</span>
            <Badge variant="outline" className="text-[10px] capitalize">{entry.status}</Badge>
          </DialogTitle>
          <DialogDescription>
            {new Date(entry.entryDate).toLocaleDateString()} · {entry.description ?? "No description"}
          </DialogDescription>
        </DialogHeader>
        <div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entry.lines.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <span className="font-mono text-xs">{l.account.code}</span>{" "}
                    <span>{l.account.name}</span>
                    {l.description && <div className="text-xs text-muted-foreground">{l.description}</div>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{l.debitAmount > 0 ? l.debitAmount.toLocaleString() : ""}</TableCell>
                  <TableCell className="text-right tabular-nums">{l.creditAmount > 0 ? l.creditAmount.toLocaleString() : ""}</TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2 border-border font-medium">
                <TableCell>Total</TableCell>
                <TableCell className="text-right tabular-nums">{entry.totalDebit.toLocaleString()}</TableCell>
                <TableCell className="text-right tabular-nums">{entry.totalCredit.toLocaleString()}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
