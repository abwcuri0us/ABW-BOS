"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollText, Search, Loader2, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AuditEntry {
  id: string;
  ts: string;
  userId: string | null;
  actorKind: string;
  actorId: string;
  module: string;
  entityType: string;
  entityId: string;
  action: string;
  diff: string | null;
  reason: string | null;
  source: string;
  sourceIp: string | null;
  user: { displayName: string; username: string } | null;
}

const ACTION_TONES: Record<string, string> = {
  create: "bg-success/10 text-success border-success/30",
  update: "bg-info/10 text-info border-info/30",
  delete: "bg-destructive/10 text-destructive border-destructive/30",
  login: "bg-primary/10 text-primary border-primary/30",
  logout: "bg-muted text-muted-foreground border-border",
  transition: "bg-warning/10 text-warning border-warning/30",
  read: "bg-muted text-muted-foreground border-border",
  export: "bg-accent/10 text-accent border-accent/30",
  print: "bg-accent/10 text-accent border-accent/30",
};

export function AuditContent() {
  const [items, setItems] = React.useState<AuditEntry[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [actionFilter, setActionFilter] = React.useState<string>("");
  const [moduleFilter, setModuleFilter] = React.useState<string>("");
  const [selected, setSelected] = React.useState<AuditEntry | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "50",
      });
      if (query) params.set("q", query);
      if (actionFilter) params.set("action", actionFilter);
      if (moduleFilter) params.set("module", moduleFilter);
      const res = await fetch(`/api/audit?${params}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } finally {
      setLoading(false);
    }
  }, [page, query, actionFilter, moduleFilter]);

  React.useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ScrollText className="h-6 w-6" />
          Audit Log
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tamper-evident record of every business-relevant mutation · {total} entries
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by entity ID, reason, or diff…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={actionFilter || "all"}
            onValueChange={(v) => {
              setActionFilter(v === "all" ? "" : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              <SelectItem value="create">Create</SelectItem>
              <SelectItem value="update">Update</SelectItem>
              <SelectItem value="delete">Delete</SelectItem>
              <SelectItem value="login">Login</SelectItem>
              <SelectItem value="logout">Logout</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={moduleFilter || "all"}
            onValueChange={(v) => {
              setModuleFilter(v === "all" ? "" : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All modules" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All modules</SelectItem>
              <SelectItem value="contacts">contacts</SelectItem>
              <SelectItem value="auth">auth</SelectItem>
              <SelectItem value="kernel">kernel</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading audit log…
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center">
              <Filter className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm font-medium">No audit entries found</p>
              <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-32">Timestamp</TableHead>
                    <TableHead className="w-24">Action</TableHead>
                    <TableHead className="w-32">Module</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead className="hidden md:table-cell">Actor</TableHead>
                    <TableHead className="hidden lg:table-cell">Source</TableHead>
                    <TableHead className="hidden lg:table-cell">IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((entry) => (
                    <TableRow
                      key={entry.id}
                      className="cursor-pointer hover:bg-accent/5"
                      onClick={() => setSelected(entry)}
                    >
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                        {new Date(entry.ts).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded border font-medium uppercase",
                          ACTION_TONES[entry.action] ?? ACTION_TONES.read,
                        )}>
                          {entry.action}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{entry.module}</TableCell>
                      <TableCell className="text-xs">
                        <div className="font-mono">{entry.entityType}</div>
                        <div className="font-mono text-muted-foreground truncate max-w-[200px]">
                          {entry.entityId}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs">
                        {entry.user?.displayName ?? entry.actorKind}
                        {entry.user?.username && (
                          <div className="text-muted-foreground">@{entry.user.username}</div>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge variant="outline" className="text-[10px]">{entry.source}</Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground font-mono">
                        {entry.sourceIp ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Detail dialog */}
      {selected && <AuditDetailDialog entry={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

// Need to import Button at the bottom (already used above)

function AuditDetailDialog({ entry, onClose }: { entry: AuditEntry; onClose: () => void }) {
  let diff: Record<string, [unknown, unknown]> | null = null;
  try {
    diff = entry.diff ? JSON.parse(entry.diff) : null;
  } catch {
    diff = null;
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded border font-medium uppercase",
              ACTION_TONES[entry.action] ?? ACTION_TONES.read,
            )}>
              {entry.action}
            </span>
            <span className="font-mono text-sm">{entry.module}/{entry.entityType}</span>
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {entry.entityId}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Timestamp</p>
              <p className="font-mono text-xs">{new Date(entry.ts).toISOString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Actor</p>
              <p className="text-sm">{entry.user?.displayName ?? entry.actorKind}</p>
              <p className="text-xs text-muted-foreground">@{entry.user?.username ?? entry.actorId}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Source</p>
              <Badge variant="outline" className="text-[10px]">{entry.source}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">IP Address</p>
              <p className="font-mono text-xs">{entry.sourceIp ?? "—"}</p>
            </div>
            {entry.reason && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground uppercase">Reason</p>
                <p className="text-sm">{entry.reason}</p>
              </div>
            )}
          </div>

          {/* Diff */}
          {diff && Object.keys(diff).length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground uppercase mb-2">Changes</p>
              <ScrollArea className="h-64 rounded-md border border-border">
                <div className="divide-y divide-border">
                  {Object.entries(diff).map(([key, [oldVal, newVal]]) => (
                    <div key={key} className="px-3 py-2 grid grid-cols-3 gap-2 text-xs">
                      <div className="font-mono font-medium">{key}</div>
                      <div className="font-mono text-destructive line-through opacity-70 break-all">
                        {oldVal === null ? "null" : JSON.stringify(oldVal)}
                      </div>
                      <div className="font-mono text-success break-all">
                        {newVal === null ? "null" : JSON.stringify(newVal)}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {!diff && (
            <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              No field-level diff recorded for this entry.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
