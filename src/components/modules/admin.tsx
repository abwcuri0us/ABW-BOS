"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Users as UsersIcon, Plus, Loader2, Shield, Trash2, MoreHorizontal, Eye, EyeOff } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth-provider";
import { cn } from "@/lib/utils";

interface User {
  id: string; username: string; displayName: string; email: string | null;
  isActive: boolean; isSuperAdmin: boolean;
  lastLoginAt: string | null; createdAt: string;
  roles: string[];
}

const ALL_ROLES = ["SuperAdmin", "Admin", "Manager", "Staff", "Auditor", "Guest"];

export function AdminContent() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [createOpen, setCreateOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      if (res.ok) setUsers((await res.json()).items);
    } finally { setLoading(false); }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  async function toggleActive(u: User) {
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !u.isActive }),
    });
    if (res.ok) {
      toast({ title: `User ${!u.isActive ? "activated" : "deactivated"}` });
      load();
    } else {
      toast({ title: "Failed", variant: "destructive" });
    }
  }

  async function handleDelete(u: User) {
    if (!confirm(`Delete user "${u.displayName}"? This is a soft-delete.`)) return;
    const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "User deleted" });
      load();
    } else {
      const d = await res.json();
      toast({ title: "Failed", description: d.error, variant: "destructive" });
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6" /> User Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage user accounts and roles · {users.length} users
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New User
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> Loading…
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>User</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead className="hidden lg:table-cell">Last Login</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const initials = u.displayName.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className={cn("text-xs", u.isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-sm flex items-center gap-2">
                              {u.displayName}
                              {isSelf && <Badge variant="outline" className="text-[9px]">YOU</Badge>}
                            </div>
                            <div className="text-xs text-muted-foreground">@{u.username}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{u.email ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {u.isSuperAdmin && <Badge variant="default" className="text-[9px]">SUPERADMIN</Badge>}
                          {u.roles.filter(r => r !== "SuperAdmin").map((r) => (
                            <Badge key={r} variant="secondary" className="text-[9px]">{r}</Badge>
                          ))}
                          {u.roles.length === 0 && !u.isSuperAdmin && <span className="text-xs text-muted-foreground">No roles</span>}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "Never"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.isActive ? "default" : "secondary"} className="text-[10px]">
                          {u.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {!isSelf && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => toggleActive(u)}>
                                {u.isActive ? "Deactivate" : "Activate"}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(u)} className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} onSaved={() => { setCreateOpen(false); load(); }} />
    </div>
  );
}

function CreateUserDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [form, setForm] = React.useState({
    username: "", displayName: "", email: "", password: "", isSuperAdmin: false,
  });
  const [selectedRoles, setSelectedRoles] = React.useState<string[]>(["Staff"]);

  function toggleRole(role: string) {
    setSelectedRoles((prev) => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.username || !form.displayName || !form.password) {
      toast({ title: "Username, display name, and password are required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, roleCodes: selectedRoles }),
      });
      if (res.ok) {
        toast({ title: "User created" });
        setForm({ username: "", displayName: "", email: "", password: "", isSuperAdmin: false });
        setSelectedRoles(["Staff"]);
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
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> New User
          </DialogTitle>
          <DialogDescription>Create a new user account</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username *</Label>
            <Input id="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })} required placeholder="jsmith" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name *</Label>
            <Input id="displayName" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required placeholder="John Smith" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@abwcurious.local" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                placeholder="Minimum 8 characters"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Roles</Label>
            <div className="flex flex-wrap gap-3 pt-1">
              {ALL_ROLES.map((r) => (
                <label key={r} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <Checkbox checked={selectedRoles.includes(r)} onCheckedChange={() => toggleRole(r)} />
                  <span>{r}</span>
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer pt-2 border-t border-border">
            <Switch checked={form.isSuperAdmin} onCheckedChange={(v) => setForm({ ...form, isSuperAdmin: v })} />
            <span>Super Administrator (bypasses all permission checks)</span>
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create User
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
