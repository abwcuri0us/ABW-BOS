"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users, UserCheck, Building2, Activity, Bell, ScrollText, TrendingUp,
  Package, FileText, AlertTriangle, IndianRupee, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardData {
  kpis: {
    totalParties: number; activeParties: number; customers: number; suppliers: number;
    todayAuditEntries: number; totalAuditEntries: number; unreadNotifications: number;
    totalProducts: number; lowStockProducts: number;
    totalInvoices: number; openInvoices: number;
    totalInvoiceAmount: number; paidInvoiceAmount: number; outstandingAmount: number;
  };
  breakdowns: { partyType: { person: number; organization: number } };
  chartData: Array<{ month: string; total: number; paid: number }>;
  recentActivity: Array<{
    id: string; ts: string; module: string; entityType: string; entityId: string;
    action: string; actorKind: string;
    user: { displayName: string; username: string } | null;
  }>;
}

export function DashboardContent() {
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    fetch("/api/dashboard", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) {
          // Handle 401/auth errors gracefully — return null so UI shows error state
          const body = await r.json().catch(() => ({}));
          throw new Error(body.error || `Request failed (${r.status})`);
        }
        return r.json();
      })
      .then((d) => {
        if (!d || !d.kpis) throw new Error("Invalid response from server");
        if (mounted) setData(d);
      })
      .catch((e) => {
        if (mounted) setError(e.message || "Failed to load dashboard");
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-6 h-28" /></Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-8 text-center">
            <p className="text-sm font-medium text-destructive mb-2">Failed to load dashboard</p>
            <p className="text-xs text-muted-foreground mb-4">{error || "Unknown error"}</p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              Reload
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const k = data.kpis;
  const kpiCards = [
    { label: "Total Parties", value: k.totalParties, icon: Users, sub: `${k.activeParties} active`, tone: "primary" as const },
    { label: "Customers", value: k.customers, icon: UserCheck, sub: "sub-type: customer", tone: "success" as const },
    { label: "Suppliers", value: k.suppliers, icon: Building2, sub: "sub-type: supplier", tone: "info" as const },
    { label: "Products", value: k.totalProducts, icon: Package, sub: `${k.lowStockProducts} low stock`, tone: k.lowStockProducts > 0 ? "warning" : "info" as const },
    { label: "Total Invoices", value: k.totalInvoices, icon: FileText, sub: `${k.openInvoices} open`, tone: "primary" as const },
    { label: "Outstanding", value: `₹${(k.outstandingAmount / 1000).toFixed(0)}k`, icon: Clock, sub: "receivables", tone: k.outstandingAmount > 0 ? "warning" : "success" as const },
    { label: "Revenue (Total)", value: `₹${(k.totalInvoiceAmount / 100000).toFixed(1)}L`, icon: IndianRupee, sub: `₹${(k.paidInvoiceAmount / 100000).toFixed(1)}L collected`, tone: "success" as const },
    { label: "Audit (Today)", value: k.todayAuditEntries, icon: Activity, sub: `${k.totalAuditEntries} total`, tone: "warning" as const },
  ];

  const toneClass: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    info: "bg-info/10 text-info",
    warning: "bg-warning/10 text-warning",
  };

  const actionColor: Record<string, string> = {
    create: "text-success",
    update: "text-info",
    delete: "text-destructive",
    login: "text-primary",
    logout: "text-muted-foreground",
    transition: "text-warning",
  };

  const maxChartValue = Math.max(...data.chartData.map((d) => d.total), 1);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of your business operating system</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
                    <p className="text-3xl font-bold tabular-nums tracking-tight">{kpi.value}</p>
                    <p className="text-xs text-muted-foreground">{kpi.sub}</p>
                  </div>
                  <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", toneClass[kpi.tone])}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Two-column: chart + breakdown */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Invoice trend chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Invoice Trend (6 months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-3 h-48 px-2">
              {data.chartData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-[10px] tabular-nums font-medium">₹{(d.total / 1000).toFixed(0)}k</div>
                  <div className="w-full flex flex-col justify-end h-32 gap-0.5">
                    <div
                      className="w-full bg-primary rounded-t transition-all hover:bg-primary/80"
                      style={{ height: `${(d.total / maxChartValue) * 100}%`, minHeight: d.total > 0 ? "4px" : "0" }}
                      title={`Total: ₹${d.total.toLocaleString()}`}
                    />
                    <div
                      className="w-full bg-success/60 rounded-t"
                      style={{ height: `${(d.paid / maxChartValue) * 100}%`, minHeight: d.paid > 0 ? "4px" : "0" }}
                      title={`Paid: ₹${d.paid.toLocaleString()}`}
                    />
                  </div>
                  <div className="text-[10px] text-muted-foreground">{d.month}</div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-4 mt-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded bg-primary" /> Total Invoiced
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded bg-success/60" /> Collected
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Party breakdown */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> Party Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="flex items-center gap-2">
                  <UserCheck className="h-3.5 w-3.5 text-success" /> Persons
                </span>
                <span className="tabular-nums font-medium">{data.breakdowns.partyType.person}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-success" style={{ width: `${data.kpis.totalParties > 0 ? (data.breakdowns.partyType.person / data.kpis.totalParties) * 100 : 0}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-info" /> Organizations
                </span>
                <span className="tabular-nums font-medium">{data.breakdowns.partyType.organization}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-info" style={{ width: `${data.kpis.totalParties > 0 ? (data.breakdowns.partyType.organization / data.kpis.totalParties) * 100 : 0}%` }} />
              </div>
            </div>
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Unread notifications</span>
                <Badge variant={data.kpis.unreadNotifications > 0 ? "default" : "secondary"}>{data.kpis.unreadNotifications}</Badge>
              </div>
            </div>
            {data.kpis.lowStockProducts > 0 && (
              <div className="pt-2 border-t border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-warning">
                    <AlertTriangle className="h-3.5 w-3.5" /> Low stock products
                  </span>
                  <Badge variant="destructive">{data.kpis.lowStockProducts}</Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" /> Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-80">
            {data.recentActivity.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No recent activity</div>
            ) : (
              <div className="divide-y divide-border">
                {data.recentActivity.map((entry) => (
                  <div key={entry.id} className="px-5 py-3 flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className={cn(
                        "h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold uppercase",
                        entry.action === "create" && "bg-success/10 text-success",
                        entry.action === "update" && "bg-info/10 text-info",
                        entry.action === "delete" && "bg-destructive/10 text-destructive",
                        entry.action === "login" && "bg-primary/10 text-primary",
                        entry.action === "logout" && "bg-muted text-muted-foreground",
                        !["create", "update", "delete", "login", "logout"].includes(entry.action) && "bg-muted text-muted-foreground",
                      )}>
                        {entry.action[0]}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className={cn("font-medium", actionColor[entry.action] ?? "text-foreground")}>{entry.action}</span>{" "}
                        <span className="text-muted-foreground">on</span>{" "}
                        <span className="font-medium">{entry.module}/{entry.entityType}</span>
                      </p>
                      <p className="text-xs text-muted-foreground truncate font-mono">{entry.entityId}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-muted-foreground">{entry.user?.displayName ?? entry.actorKind}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(entry.ts).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-4 flex items-center gap-3 text-sm">
          <ScrollText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Phase 2 expanding.</span>{" "}
            Now includes GL (chart of accounts, journal entries), Inventory (products, stock), Invoicing (tax invoices with line items), and Admin (user management). Next: payments, reports, AI integration.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
