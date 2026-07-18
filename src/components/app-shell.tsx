"use client";

import * as React from "react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutDashboard,
  Users,
  ScrollText,
  Settings,
  Bell,
  LogOut,
  Menu,
  Search,
  Command,
  Moon,
  Sun,
  Building2,
  ChevronRight,
  X,
  Check,
  BookOpen,
  Package,
  FileText,
  Shield,
  Loader2,
  BarChart3,
  Sparkles,
  Wrench,
  ArrowUpDown,
  UsersRound,
  ClipboardList,
  Calendar,
  StickyNote,
  FileSignature,
  Brain,
  Receipt,
  FileCheck,
  Wallet,
  History,
  Terminal,
  ShieldCheck,
  Layout,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { DashboardContent } from "@/components/modules/dashboard";
import { ContactsContent } from "@/components/modules/contacts";
import { AuditContent } from "@/components/modules/audit";
import { SettingsContent } from "@/components/modules/settings";
import { GlContent } from "@/components/modules/gl";
import { InventoryContent } from "@/components/modules/inventory";
import { InvoicingContent } from "@/components/modules/invoicing";
import { AdminContent } from "@/components/modules/admin";
import { ReportsContent } from "@/components/modules/reports";
import { AiContent } from "@/components/modules/ai";
import { ToolsContent } from "@/components/modules/tools";
import { TransactionsContent } from "@/components/modules/transactions";
import { TeamContent } from "@/components/modules/team";
import { ScrumContent } from "@/components/modules/scrum";
import { ScheduleContent } from "@/components/modules/schedule";
import { NotesContent } from "@/components/modules/notes";
import { QuotationsContent } from "@/components/modules/quotations";
import { AdvisoryContent } from "@/components/modules/advisory";
import { PayrollContent } from "@/components/modules/payroll";
import { BillsContent } from "@/components/modules/bills";
import { PaymentsContent } from "@/components/modules/payments";
import { GstContent } from "@/components/modules/gst";
import { LoginHistoryContent } from "@/components/modules/login-history";
import { SystemLogsContent } from "@/components/modules/system-logs";
import { CompanyProfileSettings } from "@/components/modules/company-profile";
import { HrContent } from "@/components/modules/hr";
import { AccessManagementContent } from "@/components/modules/access-management";
import { TemplatesContent } from "@/components/modules/templates";

type ModuleId =
  | "dashboard"
  | "contacts"
  | "quotations"
  | "invoicing"
  | "inventory"
  | "transactions"
  | "gl"
  | "reports"
  | "ai"
  | "advisory"
  | "scrum"
  | "team"
  | "schedule"
  | "notes"
  | "tools"
  | "audit"
  | "admin"
  | "settings"
  | "payroll"
  | "bills"
  | "payments"
  | "gst"
  | "loginHistory"
  | "systemLogs"
  | "companyProfile"
  | "hr"
  | "accessManagement"
  | "templates";

interface NavItem {
  id: ModuleId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  section: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, description: "KPIs and recent activity", section: "Overview" },
  { id: "contacts", label: "Contacts", icon: Users, description: "Customers, suppliers, parties", section: "Sales" },
  { id: "quotations", label: "Quotations", icon: FileSignature, description: "Quotes and proposals", section: "Sales" },
  { id: "invoicing", label: "Invoicing", icon: FileText, description: "Tax invoices and credit notes", section: "Sales" },
  { id: "inventory", label: "Inventory", icon: Package, description: "Products, stock, warehouses", section: "Operations" },
  { id: "scrum", label: "Scrum Board", icon: ClipboardList, description: "Projects, sprints, tasks", section: "Operations" },
  { id: "team", label: "Team", icon: UsersRound, description: "Team members and roles", section: "Operations" },
  { id: "hr", label: "Human Resources", icon: Users, description: "Employees, interns, courses, placements, letters", section: "Operations" },
  { id: "schedule", label: "Schedule", icon: Calendar, description: "Calendar and appointments", section: "Operations" },
  { id: "notes", label: "Notes", icon: StickyNote, description: "Notes and notebooks", section: "Operations" },
  { id: "payroll", label: "Payroll", icon: Receipt, description: "Salary slips and payroll", section: "Finance" },
  { id: "gl", label: "General Ledger", icon: BookOpen, description: "Chart of accounts, journal entries", section: "Finance" },
  { id: "transactions", label: "Transactions", icon: ArrowUpDown, description: "Income and expense tracking", section: "Finance" },
  { id: "bills", label: "Bills", icon: FileText, description: "Vendor bills and payables", section: "Finance" },
  { id: "payments", label: "Payments", icon: Wallet, description: "Payments received and made", section: "Finance" },
  { id: "gst", label: "GST Filings", icon: FileCheck, description: "GST returns and tax filings", section: "Finance" },
  { id: "reports", label: "Reports", icon: BarChart3, description: "P&L, Balance Sheet, Trial Balance, AR Aging", section: "Finance" },
  { id: "ai", label: "AI Assistant", icon: Sparkles, description: "Natural language business queries", section: "Finance" },
  { id: "advisory", label: "AI Advisory", icon: Brain, description: "Strategic business advice", section: "Finance" },
  { id: "tools", label: "Tools", icon: Wrench, description: "GST, EMI, tax calculators", section: "Utilities" },
  { id: "templates", label: "Templates", icon: Layout, description: "Customize invoice, quotation, letter layouts", section: "Utilities" },
  { id: "audit", label: "Audit Log", icon: ScrollText, description: "Tamper-evident activity trail", section: "System" },
  { id: "loginHistory", label: "Login History", icon: History, description: "Login and logout events", section: "System" },
  { id: "systemLogs", label: "System Logs", icon: Terminal, description: "All system activity logs", section: "System" },
  { id: "companyProfile", label: "Company Profile", icon: Building2, description: "Logo, letterhead, bank details", section: "System" },
  { id: "admin", label: "User Management", icon: Shield, description: "Manage users and roles", section: "System", adminOnly: true },
  { id: "accessManagement", label: "Access Management", icon: ShieldCheck, description: "Grant or revoke module access per role", section: "System", adminOnly: true },
  { id: "settings", label: "Settings", icon: Settings, description: "Preferences and configuration", section: "System" },
];

// ============================================================
// Notification center
// ============================================================

interface NotificationItem {
  id: string;
  notificationId: string;
  status: string;
  channel: string;
  readAt: string | null;
  dismissedAt: string | null;
  notification: {
    id: string;
    type: string;
    module: string;
    title: string;
    body: string;
    urgency: string;
    createdAt: string;
  };
}

function NotificationCenter({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast();
  const [items, setItems] = React.useState<NotificationItem[]>([]);
  const [loading, setLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?pageSize=20", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (open) load();
  }, [open, load]);

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "read" }),
    });
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, status: "read", readAt: new Date().toISOString() } : it)),
    );
  }

  async function dismiss(id: string) {
    await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "dismissed" }),
    });
    setItems((prev) => prev.filter((it) => it.id !== id));
    toast({ title: "Notification dismissed" });
  }

  const urgencyColor: Record<string, string> = {
    low: "bg-muted text-muted-foreground",
    medium: "bg-info/10 text-info border-info/30",
    high: "bg-warning/10 text-warning border-warning/30",
    critical: "bg-destructive/10 text-destructive border-destructive/30",
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" />
            Notifications
            {items.some((i) => i.status === "delivered") && (
              <Badge variant="default" className="ml-1 h-5 px-1.5 text-[10px]">
                {items.filter((i) => i.status === "delivered").length} new
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Your recent notifications and alerts
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1">
          {loading && items.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No notifications
            </div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "p-4 space-y-1.5 transition-colors",
                    item.status === "delivered" && "bg-accent/5",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium uppercase", urgencyColor[item.notification.urgency])}>
                        {item.notification.urgency}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{item.notification.module}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(item.notification.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm font-medium leading-tight">{item.notification.title}</p>
                  <p className="text-xs text-muted-foreground leading-snug">{item.notification.body}</p>
                  <div className="flex gap-2 pt-1">
                    {item.status === "delivered" && (
                      <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => markRead(item.id)}>
                        <Check className="mr-1 h-3 w-3" /> Mark read
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-6 text-xs text-muted-foreground" onClick={() => dismiss(item.id)}>
                      <X className="mr-1 h-3 w-3" /> Dismiss
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// ============================================================
// Command palette (with global search)
// ============================================================

interface SearchResult {
  id: string; module: string; title: string; subtitle: string; badge: string; route: string;
}
interface SearchGroup { type: string; label: string; results: SearchResult[]; }

function CommandPalette({
  open,
  onOpenChange,
  onNavigate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onNavigate: (id: ModuleId) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [groups, setGroups] = React.useState<SearchGroup[]>([]);
  const [searching, setSearching] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setQuery("");
      setGroups([]);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  React.useEffect(() => {
    if (!query.trim()) { setGroups([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { cache: "no-store" });
        if (res.ok) setGroups((await res.json()).groups ?? []);
      } finally { setSearching(false); }
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  function handleNavigate(route: string) {
    const moduleMap: Record<string, ModuleId> = {
      contacts: "contacts", inventory: "inventory", invoicing: "invoicing",
      gl: "gl", reports: "reports", ai: "ai", advisory: "advisory",
      tools: "tools", transactions: "transactions", scrum: "scrum",
      team: "team", schedule: "schedule", notes: "notes",
      quotations: "quotations", payroll: "payroll", bills: "bills",
      payments: "payments", gst: "gst",
      loginHistory: "loginHistory", systemLogs: "systemLogs",
      companyProfile: "companyProfile",
      hr: "hr",
      accessManagement: "accessManagement",
      templates: "templates",
      audit: "audit", admin: "admin", settings: "settings", dashboard: "dashboard",
    };
    if (moduleMap[route]) onNavigate(moduleMap[route]);
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="top" className="w-full sm:max-w-xl mx-auto mt-20 p-0 h-auto rounded-b-xl">
        <SheetHeader className="px-4 py-3 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Command className="h-4 w-4" /> Command Palette
          </SheetTitle>
          <SheetDescription className="sr-only">
            Search and navigate to any module or record
          </SheetDescription>
        </SheetHeader>
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search modules, contacts, products, invoices…"
              className="w-full pl-9 pr-3 py-2 text-sm bg-transparent border-0 outline-none placeholder:text-muted-foreground"
            />
            {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          </div>
        </div>
        <ScrollArea className="max-h-96">
          <div className="p-2">
            {/* Module navigation (when no query) */}
            {!query.trim() && (
              <>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-2 py-1.5">Navigate</div>
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { onNavigate(item.id); onOpenChange(false); }}
                      className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent/10 text-left transition-colors"
                    >
                      <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{item.label}</div>
                        <div className="text-xs text-muted-foreground truncate">{item.description}</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  );
                })}
              </>
            )}

            {/* Search results (when query) */}
            {query.trim() && groups.length === 0 && !searching && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No results for &ldquo;{query}&rdquo;
              </div>
            )}

            {groups.map((group) => (
              <div key={group.type} className="mb-2">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-2 py-1.5">
                  {group.label} ({group.results.length})
                </div>
                {group.results.map((r) => (
                  <button
                    key={`${r.module}-${r.id}`}
                    onClick={() => handleNavigate(r.route)}
                    className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent/10 text-left transition-colors"
                  >
                    <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center text-[10px] font-medium uppercase">
                      {r.module[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{r.title}</div>
                      <div className="text-xs text-muted-foreground truncate">{r.subtitle}</div>
                    </div>
                    <Badge variant="outline" className="text-[9px]">{r.badge}</Badge>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// ============================================================
// Sidebar
// ============================================================

interface SidebarProps {
  active: ModuleId;
  onNavigate: (id: ModuleId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

function Sidebar({ active, onNavigate, collapsed, onToggleCollapse }: SidebarProps) {
  const { user } = useAuth();
  const visibleItems = NAV_ITEMS.filter((i) => !i.adminOnly || user?.isSuperAdmin || user?.roles.includes("Admin"));
  const sections = Array.from(new Set(visibleItems.map((i) => i.section)));

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-all duration-200",
        collapsed ? "w-16" : "w-60",
      )}
    >
      {/* Brand */}
      <div className="h-14 flex items-center gap-2 px-4 border-b border-sidebar-border flex-shrink-0">
        <img src="/abw-logo.svg" alt="ABW-BOS" className="h-8 w-8 rounded-lg flex-shrink-0" />
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold tracking-tight leading-tight">ABW-BOS</div>
            <div className="text-[10px] text-muted-foreground leading-tight">Business OS</div>
          </div>
        )}
      </div>

      {/* Nav (grouped by section) */}
      <nav className="flex-1 p-2 overflow-y-auto scrollbar-thin">
        {sections.map((section) => (
          <div key={section} className="mb-3">
            {!collapsed && (
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-3 py-1.5">
                {section}
              </div>
            )}
            <div className="space-y-0.5">
              {visibleItems.filter((i) => i.section === section).map((item) => {
                const Icon = item.icon;
                const isActive = active === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                      collapsed && "justify-center px-0",
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-sidebar-border flex-shrink-0">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs text-muted-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          <Menu className="h-3.5 w-3.5" />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}

// ============================================================
// Mobile sidebar (drawer)
// ============================================================

function MobileNav({
  open,
  onOpenChange,
  active,
  onNavigate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  active: ModuleId;
  onNavigate: (id: ModuleId) => void;
}) {
  const { user } = useAuth();
  const visibleItems = NAV_ITEMS.filter((i) => !i.adminOnly || user?.isSuperAdmin || user?.roles.includes("Admin"));
  const sections = Array.from(new Set(visibleItems.map((i) => i.section)));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="px-4 py-3 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-base">
            <img src="/abw-logo.svg" alt="ABW-BOS" className="h-7 w-7 rounded-lg" />
            ABW-BOS
          </SheetTitle>
          <SheetDescription className="sr-only">Main navigation</SheetDescription>
        </SheetHeader>
        <nav className="p-2 overflow-y-auto scrollbar-thin">
          {sections.map((section) => (
            <div key={section} className="mb-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-3 py-1.5">
                {section}
              </div>
              <div className="space-y-0.5">
                {visibleItems.filter((i) => i.section === section).map((item) => {
                  const Icon = item.icon;
                  const isActive = active === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { onNavigate(item.id); onOpenChange(false); }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm",
                        isActive
                          ? "bg-accent/10 text-accent font-medium"
                          : "text-foreground hover:bg-accent/5",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

// ============================================================
// Top bar
// ============================================================

function TopBar({
  onOpenMobileNav,
  onOpenCommand,
  onOpenNotifications,
  unreadCount,
  title,
}: {
  onOpenMobileNav: () => void;
  onOpenCommand: () => void;
  onOpenNotifications: () => void;
  unreadCount: number;
  title: string;
}) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const initials = (user?.displayName ?? "U")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="h-14 flex items-center gap-3 px-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30">
      {/* Mobile nav toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onOpenMobileNav}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Page title */}
      <h2 className="text-lg font-semibold tracking-tight hidden sm:block">{title}</h2>

      {/* Search */}
      <button
        onClick={onOpenCommand}
        className="ml-auto flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-muted/50 text-sm text-muted-foreground hover:bg-muted transition-colors w-48 md:w-64"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 px-1.5 text-[10px] font-mono bg-background border border-border rounded">
          ⌘K
        </kbd>
      </button>

      {/* Theme toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        title="Toggle theme"
      >
        {mounted && theme === "dark" ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
      </Button>

      {/* Notifications */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onOpenNotifications}
        className="relative"
        title="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-medium flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-9 px-1.5 gap-2">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate">
              {user?.displayName}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{user?.displayName}</span>
              <span className="text-xs text-muted-foreground">@{user?.username}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {user?.isSuperAdmin && (
            <div className="px-2 py-1">
              <Badge variant="default" className="text-[10px]">SuperAdmin</Badge>
            </div>
          )}
          {user?.roles.filter((r) => r !== "SuperAdmin").map((role) => (
            <div key={role} className="px-2 py-0.5">
              <Badge variant="secondary" className="text-[10px]">{role}</Badge>
            </div>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => logout()}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

// ============================================================
// App shell
// ============================================================

export function AppShell() {
  const [active, setActive] = React.useState<ModuleId>("dashboard");
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const [commandOpen, setCommandOpen] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);

  // Load unread count
  React.useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch("/api/notifications?pageSize=1", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (mounted) setUnreadCount(data.unreadCount ?? 0);
        }
      } catch { /* ignore */ }
    }
    load();
    const interval = setInterval(load, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [notifOpen]);

  // Keyboard shortcut: Cmd/Ctrl + K
  React.useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Resolve current module label
  const activeItem = NAV_ITEMS.find((i) => i.id === active);
  const title = activeItem?.label ?? "ABW-BOS";

  // Render the active module's content
  function renderContent() {
    switch (active) {
      case "dashboard": return <DashboardContent />;
      case "contacts": return <ContactsContent />;
      case "quotations": return <QuotationsContent />;
      case "invoicing": return <InvoicingContent />;
      case "inventory": return <InventoryContent />;
      case "transactions": return <TransactionsContent />;
      case "scrum": return <ScrumContent />;
      case "team": return <TeamContent />;
      case "schedule": return <ScheduleContent />;
      case "notes": return <NotesContent />;
      case "payroll": return <PayrollContent />;
      case "gl": return <GlContent />;
      case "bills": return <BillsContent />;
      case "payments": return <PaymentsContent />;
      case "gst": return <GstContent />;
      case "reports": return <ReportsContent />;
      case "ai": return <AiContent />;
      case "advisory": return <AdvisoryContent />;
      case "tools": return <ToolsContent />;
      case "audit": return <AuditContent />;
      case "loginHistory": return <LoginHistoryContent />;
      case "systemLogs": return <SystemLogsContent />;
      case "companyProfile": return <CompanyProfileSettings />;
      case "hr": return <HrContent />;
      case "accessManagement": return <AccessManagementContent />;
      case "templates": return <TemplatesContent />;
      case "admin": return <AdminContent />;
      case "settings": return <SettingsContent />;
      default: return null;
    }
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        active={active}
        onNavigate={setActive}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
      />

      <MobileNav
        open={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
        active={active}
        onNavigate={setActive}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onOpenCommand={() => setCommandOpen(true)}
          onOpenNotifications={() => setNotifOpen(true)}
          unreadCount={unreadCount}
          title={title}
        />

        <main className="flex-1 overflow-y-auto scrollbar-thin">
          {renderContent()}
        </main>
      </div>

      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        onNavigate={setActive}
      />
      <NotificationCenter open={notifOpen} onOpenChange={setNotifOpen} />
    </div>
  );
}

// ============================================================
// Module content placeholders (real implementations imported above)
// ============================================================
