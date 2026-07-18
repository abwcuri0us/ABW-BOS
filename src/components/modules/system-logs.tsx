"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Terminal, Loader2, Download } from "lucide-react";
import { exportCSV } from "@/lib/export";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface LogEntry {
  id: string; ts: string; action: string; module: string;
  entityType: string; entityId: string; reason: string | null;
  source: string; sourceIp: string | null;
  user: { displayName: string; username: string } | null;
}

const ACTION_TONES: Record<string, string> = {
  create: "text-success",
  update: "text-info",
  delete: "text-destructive",
  login: "text-primary",
  logout: "text-muted-foreground",
  transition: "text-warning",
};

export function SystemLogsContent() {
  const [items, setItems] = React.useState<LogEntry[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [level, setLevel] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: "100" });
      if (level) params.set("level", level);
      const res = await fetch(`/api/system-logs?${params}`, { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setItems(d.items ?? []);
        setTotal(d.total ?? 0);
      }
    } finally { setLoading(false); }
  }, [level]);

  React.useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Terminal className="h-6 w-6" /> System Logs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">All system activity · {total} entries</p>
        </div>
        <div className="flex gap-2">
          <Select value={level || "all"} onValueChange={(v) => setLevel(v === "all" ? "" : v)}>
            <SelectTrigger className="w-32"><SelectValue placeholder="All levels" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warn">Warnings</SelectItem>
              <SelectItem value="error">Errors</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => exportCSV("system_logs", items as unknown as Record<string, unknown>[])}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">No log entries</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow className="bg-muted/50">
                  <TableHead className="w-40">Timestamp</TableHead>
                  <TableHead className="w-20">Level</TableHead>
                  <TableHead className="w-24">Module</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="hidden md:table-cell">Entity</TableHead>
                  <TableHead className="hidden lg:table-cell">User</TableHead>
                  <TableHead className="hidden lg:table-cell">IP</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {items.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">{new Date(e.ts).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={e.action === "delete" ? "destructive" : e.reason ? "secondary" : "outline"} className="text-[9px]">
                          {e.action === "delete" ? "ERROR" : e.reason ? "WARN" : "INFO"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{e.module}</TableCell>
                      <TableCell className={cn("text-xs font-medium capitalize", ACTION_TONES[e.action] ?? "")}>{e.action}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs font-mono text-muted-foreground">{e.entityType}/{e.entityId.slice(0, 12)}</TableCell>
                      <TableCell className="hidden lg:table-cell text-xs">{e.user?.displayName ?? "system"}</TableCell>
                      <TableCell className="hidden lg:table-cell text-xs font-mono text-muted-foreground">{e.sourceIp ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
