"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Loader2, LogIn, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoginEntry {
  id: string; ts: string; action: string; reason: string | null;
  source: string; sourceIp: string | null;
  user: { displayName: string; username: string } | null;
}

export function LoginHistoryContent() {
  const [items, setItems] = React.useState<LoginEntry[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/login-history?limit=50", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((d) => { if (d?.items) setItems(d.items); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <History className="h-6 w-6" /> Login History
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Recent login and logout events</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">No login history yet</div>
          ) : (
            <Table>
              <TableHeader><TableRow className="bg-muted/50">
                <TableHead className="w-32">Timestamp</TableHead>
                <TableHead className="w-20">Action</TableHead>
                <TableHead>User</TableHead>
                <TableHead className="hidden md:table-cell">IP Address</TableHead>
                <TableHead className="hidden md:table-cell">Reason</TableHead>
                <TableHead className="hidden lg:table-cell">Source</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {items.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">{new Date(e.ts).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {e.action === "login" ? <LogIn className="h-3.5 w-3.5 text-success" /> : <LogOut className="h-3.5 w-3.5 text-muted-foreground" />}
                        <span className={cn("text-xs font-medium capitalize", e.action === "login" ? "text-success" : "text-muted-foreground")}>{e.action}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{e.user?.displayName ?? "Unknown"}<div className="text-xs text-muted-foreground">@{e.user?.username ?? "—"}</div></TableCell>
                    <TableCell className="hidden md:table-cell text-xs font-mono text-muted-foreground">{e.sourceIp ?? "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs">
                      {e.reason ? <Badge variant="outline" className="text-[9px] text-destructive border-destructive/30">{e.reason}</Badge> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell"><Badge variant="secondary" className="text-[9px]">{e.source}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
