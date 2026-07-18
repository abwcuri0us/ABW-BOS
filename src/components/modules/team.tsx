"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Users, Plus, Loader2, Mail, Phone, Briefcase, Trash2, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Member {
  id: string; name: string; email: string | null; phone: string | null;
  role: string; department: string | null; designation: string | null;
  avatarColor: string; skills: string; isActive: boolean; joinedAt: string;
}

const ROLE_COLORS: Record<string, string> = {
  lead: "bg-primary/10 text-primary border-primary/30",
  manager: "bg-info/10 text-info border-info/30",
  member: "bg-muted text-muted-foreground border-border",
};

const DEPT_COLORS: Record<string, string> = {
  sales: "bg-success/10 text-success",
  operations: "bg-info/10 text-info",
  finance: "bg-primary/10 text-primary",
  hr: "bg-accent/10 text-accent",
  tech: "bg-warning/10 text-warning",
};

export function TeamContent() {
  const { toast } = useToast();
  const [items, setItems] = React.useState<Member[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Member | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/team", { cache: "no-store" });
      if (res.ok) setItems((await res.json()).items);
    } finally { setLoading(false); }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  async function handleDelete(m: Member) {
    if (!confirm(`Remove ${m.name} from the team?`)) return;
    await fetch(`/api/team/${m.id}`, { method: "DELETE" });
    toast({ title: "Member removed" });
    load();
  }

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6" /> Team
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{items.length} team members</p>
        </div>
        <Button onClick={() => { setEditing(null); setCreateOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Member
        </Button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> Loading…</div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center text-sm text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
          No team members yet
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((m) => {
            const skills = (() => { try { return JSON.parse(m.skills); } catch { return []; } })();
            const initials = m.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
            return (
              <Card key={m.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12 flex-shrink-0" style={{ backgroundColor: m.avatarColor }}>
                      <AvatarFallback className="text-white font-medium">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-sm truncate">{m.name}</h3>
                        {!m.isActive && <Badge variant="secondary" className="text-[9px]">INACTIVE</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{m.designation ?? "—"}</p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        <Badge variant="outline" className={cn("text-[9px] capitalize", ROLE_COLORS[m.role])}>{m.role}</Badge>
                        {m.department && <Badge variant="outline" className={cn("text-[9px] capitalize", DEPT_COLORS[m.department])}>{m.department}</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {m.email && <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {m.email}</div>}
                    {m.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {m.phone}</div>}
                    <div className="flex items-center gap-1.5"><Briefcase className="h-3 w-3" /> Joined {new Date(m.joinedAt).toLocaleDateString()}</div>
                  </div>
                  {skills.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {skills.map((s: string) => <Badge key={s} variant="secondary" className="text-[9px]">{s}</Badge>)}
                    </div>
                  )}
                  <div className="mt-3 flex gap-2">
                    <Button variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={() => { setEditing(m); setCreateOpen(true); }}>
                      <Pencil className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => handleDelete(m)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <MemberDialog open={createOpen} onOpenChange={setCreateOpen} member={editing} onSaved={() => { setCreateOpen(false); load(); }} />
    </div>
  );
}

function MemberDialog({ open, onOpenChange, member, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  member: Member | null; onSaved: () => void;
}) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "", email: "", phone: "", role: "member", department: "",
    designation: "", avatarColor: "#1B6D97", skills: "",
  });

  React.useEffect(() => {
    if (open) {
      if (member) {
        const skills = (() => { try { return JSON.parse(member.skills).join(", "); } catch { return ""; } })();
        setForm({
          name: member.name, email: member.email ?? "", phone: member.phone ?? "",
          role: member.role, department: member.department ?? "",
          designation: member.designation ?? "", avatarColor: member.avatarColor, skills,
        });
      } else {
        setForm({ name: "", email: "", phone: "", role: "member", department: "", designation: "", avatarColor: "#1B6D97", skills: "" });
      }
    }
  }, [open, member]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const skills = form.skills.split(",").map((s) => s.trim()).filter(Boolean);
    const payload = { ...form, skills };
    try {
      const url = member ? `/api/team/${member.id}` : "/api/team";
      const method = member ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) {
        toast({ title: member ? "Member updated" : "Member added" });
        onSaved();
      } else {
        const d = await res.json(); toast({ title: "Failed", description: d.error, variant: "destructive" });
      }
    } finally { setSubmitting(false); }
  }

  const colors = ["#1B6D97", "#15803D", "#B45309", "#B91C1C", "#7C3AED", "#DB2777", "#0891B2", "#475569"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{member ? "Edit Member" : "Add Team Member"}</DialogTitle>
          <DialogDescription>{member ? "Update member details" : "Add a new team member"}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={form.department || "none"} onValueChange={(v) => setForm({ ...form, department: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="operations">Operations</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                  <SelectItem value="tech">Tech</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Designation</Label>
            <Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="Senior Developer" />
          </div>
          <div className="space-y-2">
            <Label>Skills (comma-separated)</Label>
            <Input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="React, Project Management, Sales" />
          </div>
          <div className="space-y-2">
            <Label>Avatar Color</Label>
            <div className="flex gap-2 flex-wrap">
              {colors.map((c) => (
                <button key={c} type="button" onClick={() => setForm({ ...form, avatarColor: c })}
                  className={cn("h-8 w-8 rounded-full border-2", form.avatarColor === c ? "border-foreground" : "border-transparent")}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{member ? "Save" : "Add"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
