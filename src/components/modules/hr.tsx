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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, Plus, Loader2, Trash2, Pencil, GraduationCap, Award, FileText, Briefcase, Search,
  Upload, X, FileCheck, CheckCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { printHTML, formatDate } from "@/lib/export";

export function HrContent() {
  const [tab, setTab] = React.useState("employees");
  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Users className="h-6 w-6" /> Human Resources</h1>
        <p className="text-sm text-muted-foreground mt-1">Employees, interns, courses, placements, certifications, and letters</p>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="employees" className="text-xs"><Users className="h-3.5 w-3.5 mr-1.5" /> Employees</TabsTrigger>
          <TabsTrigger value="interns" className="text-xs"><GraduationCap className="h-3.5 w-3.5 mr-1.5" /> Interns</TabsTrigger>
          <TabsTrigger value="courses" className="text-xs"><Briefcase className="h-3.5 w-3.5 mr-1.5" /> Courses</TabsTrigger>
          <TabsTrigger value="placements" className="text-xs"><Award className="h-3.5 w-3.5 mr-1.5" /> Placements</TabsTrigger>
          <TabsTrigger value="certifications" className="text-xs"><FileCheck className="h-3.5 w-3.5 mr-1.5" /> Certifications</TabsTrigger>
          <TabsTrigger value="letters" className="text-xs"><FileText className="h-3.5 w-3.5 mr-1.5" /> Letters</TabsTrigger>
        </TabsList>
        <TabsContent value="employees" className="mt-4"><EmployeesTab /></TabsContent>
        <TabsContent value="interns" className="mt-4"><SimpleTab apiPath="/api/hr/interns" title="Interns" icon="intern" /></TabsContent>
        <TabsContent value="courses" className="mt-4"><SimpleTab apiPath="/api/hr/courses" title="Courses" icon="course" /></TabsContent>
        <TabsContent value="placements" className="mt-4"><SimpleTab apiPath="/api/hr/placements" title="Placements" icon="placement" /></TabsContent>
        <TabsContent value="certifications" className="mt-4"><SimpleTab apiPath="/api/hr/certifications" title="Certifications" icon="cert" /></TabsContent>
        <TabsContent value="letters" className="mt-4"><LettersTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function EmployeesTab() {
  const { toast } = useToast();
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [editOpen, setEditOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<any>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [docs, setDocs] = React.useState<any[]>([]);
  const [form, setForm] = React.useState({
    fullName: "", email: "", phone: "", department: "", designation: "",
    employmentType: "full-time", joiningDate: new Date().toISOString().slice(0, 10),
    basicSalary: "", panNumber: "", aadhaarNumber: "", notes: "",
  });

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      const res = await fetch(`/api/hr/employees?${params}`, { cache: "no-store" });
      if (res.ok) setItems((await res.json()).items ?? []);
    } finally { setLoading(false); }
  }, [query]);

  React.useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  React.useEffect(() => {
    if (editOpen) {
      if (editing) {
        setDocs((() => { try { return JSON.parse(editing.documents || "[]"); } catch { return []; } })());
        setForm({
          fullName: editing.fullName || "", email: editing.email ?? "", phone: editing.phone ?? "",
          department: editing.department ?? "", designation: editing.designation ?? "",
          employmentType: editing.employmentType || "full-time",
          joiningDate: editing.joiningDate ? new Date(editing.joiningDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
          basicSalary: editing.basicSalary ? String(editing.basicSalary) : "",
          panNumber: editing.panNumber ?? "", aadhaarNumber: editing.aadhaarNumber ?? "",
          notes: (editing as any).notes ?? "",
        });
      } else {
        setDocs([]);
        setForm({ fullName: "", email: "", phone: "", department: "", designation: "", employmentType: "full-time", joiningDate: new Date().toISOString().slice(0, 10), basicSalary: "", panNumber: "", aadhaarNumber: "", notes: "" });
      }
    }
  }, [editOpen, editing]);

  function handleDocUpload(type: string, file: File) {
    const reader = new FileReader();
    reader.onload = () => { setDocs(prev => [...prev.filter(d => d.type !== type), { type, name: file.name, url: reader.result }]); toast({ title: `${type} uploaded` }); };
    reader.readAsDataURL(file);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fullName) { toast({ title: "Full name required", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const payload = { ...form, documents: docs, basicSalary: form.basicSalary ? Number(form.basicSalary) : 0 };
      const url = editing ? `/api/hr/employees/${editing.id}` : "/api/hr/employees";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) { toast({ title: editing ? "Employee updated" : "Employee added" }); setEditOpen(false); load(); }
    } finally { setSubmitting(false); }
  }

  async function handleDelete(e: any) {
    if (!confirm(`Delete ${e.fullName}?`)) return;
    await fetch(`/api/hr/employees/${e.id}`, { method: "DELETE" });
    toast({ title: "Employee deleted" }); load();
  }

  const DOC_TYPES = [{ key: "resume", label: "CV/Resume" }, { key: "aadhaar", label: "Aadhaar Card" }, { key: "pan", label: "PAN Card" }, { key: "graduation", label: "Graduation" }, { key: "photo", label: "Photo" }, { key: "offer_letter", label: "Offer Letter" }, { key: "id_proof", label: "ID Proof" }];

  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => { setEditing(null); setEditOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Add Employee</Button>
      </div>
      <Card><CardContent className="p-0">
        {loading ? <div className="p-8 text-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> Loading…</div>
        : items.length === 0 ? <div className="p-12 text-center text-sm text-muted-foreground">No employees yet</div>
        : <Table><TableHeader><TableRow className="bg-muted/50"><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead className="hidden md:table-cell">Dept</TableHead><TableHead className="hidden lg:table-cell">Salary</TableHead><TableHead>Status</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
          <TableBody>{items.map((e) => (
            <TableRow key={e.id} className="cursor-pointer hover:bg-accent/5" onClick={() => { setEditing(e); setEditOpen(true); }}>
              <TableCell className="font-mono text-xs">{e.employeeCode}</TableCell>
              <TableCell><div className="flex items-center gap-2"><Avatar className="h-8 w-8"><AvatarFallback className="bg-primary/10 text-primary text-xs">{e.fullName?.split(" ").map((s: string) => s[0]).slice(0, 2).join("")}</AvatarFallback></Avatar><div><div className="text-sm font-medium">{e.fullName}</div><div className="text-xs text-muted-foreground">{e.email ?? "—"}</div></div></div></TableCell>
              <TableCell className="hidden md:table-cell text-sm">{e.department ?? "—"}</TableCell>
              <TableCell className="hidden lg:table-cell text-sm tabular-nums">₹{e.basicSalary?.toLocaleString("en-IN") ?? 0}</TableCell>
              <TableCell><Badge variant={e.status === "active" ? "default" : "destructive"} className="text-[9px] capitalize">{e.status}</Badge></TableCell>
              <TableCell><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(ev) => { ev.stopPropagation(); handleDelete(e); }}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
            </TableRow>
          ))}</TableBody></Table>}
      </CardContent></Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2">{editing ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{editing ? "Edit Employee" : "Add Employee"}</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase">Personal Information</div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Full Name *</Label><Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="space-y-2"><Label>Department</Label><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
            </div>
            <div className="text-xs font-semibold text-muted-foreground uppercase pt-2">Employment Details</div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="space-y-2"><Label>Designation</Label><Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></div>
              <div className="space-y-2"><Label>Joining Date</Label><Input type="date" value={form.joiningDate} onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} /></div>
              <div className="space-y-2"><Label>Salary (₹)</Label><Input type="number" value={form.basicSalary} onChange={(e) => setForm({ ...form, basicSalary: e.target.value })} /></div>
            </div>
            <div className="text-xs font-semibold text-muted-foreground uppercase pt-2">KYC</div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-2"><Label>PAN</Label><Input value={form.panNumber} onChange={(e) => setForm({ ...form, panNumber: e.target.value })} /></div>
              <div className="space-y-2"><Label>Aadhaar</Label><Input value={form.aadhaarNumber} onChange={(e) => setForm({ ...form, aadhaarNumber: e.target.value })} /></div>
            </div>
            <div className="text-xs font-semibold text-muted-foreground uppercase pt-2">Documents</div>
            <div className="grid sm:grid-cols-2 gap-2">
              {DOC_TYPES.map(dt => {
                const uploaded = docs.find(d => d.type === dt.key);
                return (
                  <div key={dt.key} className="flex items-center gap-2 p-2 border border-border rounded-md">
                    <div className="flex-1"><div className="text-xs font-medium">{dt.label}</div>{uploaded ? <div className="text-[10px] text-success flex items-center gap-1"><CheckCircle className="h-3 w-3" /> {uploaded.name}</div> : <div className="text-[10px] text-muted-foreground">Not uploaded</div>}</div>
                    <label className="cursor-pointer"><span className="inline-flex items-center px-2 py-1 rounded text-[10px] border border-input hover:bg-accent/5"><Upload className="h-3 w-3 mr-1" /> Upload</span><input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleDocUpload(dt.key, f); }} /></label>
                    {uploaded && <button type="button" onClick={() => setDocs(prev => prev.filter(d => d.type !== dt.key))} className="text-destructive"><X className="h-3.5 w-3.5" /></button>}
                  </div>
                );
              })}
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editing ? "Save" : "Add"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SimpleTab({ apiPath, title, icon }: { apiPath: string; title: string; icon: string }) {
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<any | null>(null);
  const [viewing, setViewing] = React.useState<any | null>(null);
  const { toast } = useToast();
  const [form, setForm] = React.useState<Record<string, string>>({});

  const load = React.useCallback(async () => {
    setLoading(true);
    try { const res = await fetch(apiPath, { cache: "no-store" }); if (res.ok) setItems((await res.json()).items ?? []); } finally { setLoading(false); }
  }, [apiPath]);
  React.useEffect(() => { load(); }, [load]);

  React.useEffect(() => {
    if (createOpen && editing) {
      // hydrate form from editing record
      const next: Record<string, string> = {};
      for (const k of Object.keys(editing)) {
        const v = (editing as any)[k];
        if (v === null || v === undefined) continue;
        if (v instanceof Date || (typeof v === "string" && /^\d{4}-\d\d-\d\d/.test(v) && k.endsWith("Date"))) {
          next[k] = new Date(v).toISOString().slice(0, 10);
        } else if (typeof v === "object") continue;
        else next[k] = String(v);
      }
      setForm(next);
    } else if (createOpen && !editing) {
      setForm({});
    }
  }, [createOpen, editing]);

  async function handleDelete(item: any) {
    if (!confirm(`Delete this ${title.slice(0, -1).toLowerCase()}?`)) return;
    const res = await fetch(`${apiPath}/${item.id}`, { method: "DELETE" });
    if (res.ok) { toast({ title: "Deleted" }); load(); }
    else { toast({ title: "Delete failed", variant: "destructive" }); }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const isEdit = !!editing;
    const url = isEdit ? `${apiPath}/${editing.id}` : apiPath;
    const method = isEdit ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) {
      toast({ title: isEdit ? "Updated" : "Created" });
      setCreateOpen(false); setEditing(null); setForm({}); load();
    } else {
      const d = await res.json().catch(() => ({}));
      toast({ title: isEdit ? "Update failed" : "Create failed", description: d.error ?? "", variant: "destructive" });
    }
  }

  function openCreate() { setEditing(null); setForm({}); setCreateOpen(true); }
  function openEdit(item: any) { setEditing(item); setCreateOpen(true); }

  // Field config per icon type
  const fields: Array<{ key: string; label: string; type?: string; required?: boolean; options?: string[] }> = (() => {
    switch (icon) {
      case "intern":
        return [
          { key: "fullName", label: "Full Name", required: true },
          { key: "email", label: "Email", type: "email" },
          { key: "phone", label: "Phone" },
          { key: "college", label: "College" },
          { key: "degree", label: "Degree" },
          { key: "branch", label: "Branch" },
          { key: "year", label: "Year" },
          { key: "position", label: "Position" },
          { key: "department", label: "Department" },
          { key: "duration", label: "Duration" },
          { key: "stipend", label: "Stipend", type: "number" },
          { key: "startDate", label: "Start Date", type: "date" },
          { key: "endDate", label: "End Date", type: "date" },
          { key: "status", label: "Status", options: ["active", "completed", "terminated"] },
        ];
      case "course":
        return [
          { key: "title", label: "Title", required: true },
          { key: "description", label: "Description" },
          { key: "category", label: "Category" },
          { key: "provider", label: "Provider" },
          { key: "duration", label: "Duration" },
          { key: "mode", label: "Mode", options: ["online", "offline", "hybrid"] },
          { key: "cost", label: "Cost", type: "number" },
          { key: "instructor", label: "Instructor" },
          { key: "certificate", label: "Certificate", options: ["true", "false"] },
          { key: "status", label: "Status", options: ["available", "scheduled", "completed", "cancelled"] },
        ];
      case "placement":
        return [
          { key: "candidateName", label: "Candidate Name", required: true },
          { key: "candidateEmail", label: "Candidate Email", type: "email" },
          { key: "candidatePhone", label: "Candidate Phone" },
          { key: "companyName", label: "Company" },
          { key: "position", label: "Position" },
          { key: "salary", label: "Salary", type: "number" },
          { key: "commissionAmount", label: "Commission", type: "number" },
          { key: "status", label: "Status", options: ["pending", "interviewed", "offered", "accepted", "rejected", "joined"] },
        ];
      case "cert":
        return [
          { key: "title", label: "Title", required: true },
          { key: "holderName", label: "Holder Name", required: true },
          { key: "issuingBody", label: "Issuing Body" },
          { key: "issueDate", label: "Issue Date", type: "date" },
          { key: "expiryDate", label: "Expiry Date", type: "date" },
          { key: "holderType", label: "Holder Type", options: ["employee", "intern", "external"] },
          { key: "holderId", label: "Holder ID" },
          { key: "status", label: "Status", options: ["valid", "expired", "revoked"] },
        ];
      default:
        return [];
    }
  })();

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Add {title.slice(0, -1)}</Button></div>
      <Card><CardContent className="p-0">
        {loading ? <div className="p-8 text-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> Loading…</div>
        : items.length === 0 ? <div className="p-12 text-center text-sm text-muted-foreground">No {title.toLowerCase()} yet</div>
        : <Table><TableHeader><TableRow className="bg-muted/50"><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead className="hidden md:table-cell">Details</TableHead><TableHead>Status</TableHead><TableHead className="w-32"></TableHead></TableRow></TableHeader>
          <TableBody>{items.map((item) => (
            <TableRow key={item.id} className="cursor-pointer hover:bg-accent/5" onClick={() => setViewing(item)}>
              <TableCell className="font-mono text-xs">{item[`${icon}Code`] ?? item.placementCode ?? item.certCode ?? "—"}</TableCell>
              <TableCell className="text-sm font-medium">{item.fullName ?? item.title ?? item.candidateName ?? item.holderName ?? "—"}</TableCell>
              <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{item.department ?? item.companyName ?? item.issuingBody ?? item.college ?? "—"}</TableCell>
              <TableCell><Badge variant="secondary" className="text-[9px] capitalize">{item.status ?? "—"}</Badge></TableCell>
              <TableCell><div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)} title="Edit"><Pencil className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(item)} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div></TableCell>
            </TableRow>
          ))}</TableBody></Table>}
      </CardContent></Card>

      <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${title.slice(0, -1)}` : `Add ${title.slice(0, -1)}`}</DialogTitle>
            <DialogDescription>{editing ? "Update the details below" : "Fill in the details below"}</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              {fields.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label className="text-xs">{f.label}{f.required && " *"}</Label>
                  {f.options ? (
                    <Select value={form[f.key] ?? ""} onValueChange={(v) => setForm({ ...form, [f.key]: v })}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>{f.options.map((o) => <SelectItem key={o} value={o} className="text-xs capitalize">{o}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={f.type ?? "text"}
                      value={form[f.key] ?? ""}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      required={f.required}
                      className="h-8"
                    />
                  )}
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setCreateOpen(false); setEditing(null); }}>Cancel</Button>
              <Button type="submit">{editing ? "Save Changes" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {viewing && (
        <Dialog open onOpenChange={() => setViewing(null)}>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{viewing.fullName ?? viewing.title ?? viewing.candidateName ?? viewing.holderName ?? "Detail"}</DialogTitle>
              <DialogDescription className="font-mono">{viewing[`${icon}Code`] ?? viewing.placementCode ?? viewing.certCode ?? ""}</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(viewing)
                .filter(([k, v]) => !["id", "documents"].includes(k) && v !== null && typeof v !== "object")
                .map(([k, v]) => (
                  <div key={k} className="space-y-0.5">
                    <div className="text-muted-foreground uppercase text-[10px]">{k.replace(/([A-Z])/g, " $1").trim()}</div>
                    <div className="font-medium break-words">{String(v)}</div>
                  </div>
                ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setViewing(null); openEdit(viewing); }}><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Button>
              <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

const LETTER_TYPES = [
  { value: "offer", label: "Offer Letter" }, { value: "nda", label: "NDA" },
  { value: "warning", label: "Warning Letter" }, { value: "termination", label: "Termination Letter" },
  { value: "application", label: "Application Letter" }, { value: "experience", label: "Experience Letter" },
  { value: "relieving", label: "Relieving Letter" }, { value: "recommendation", label: "Recommendation Letter" },
];

function LettersTab() {
  const { toast } = useToast();
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [viewing, setViewing] = React.useState<any | null>(null);
  const [editing, setEditing] = React.useState<any | null>(null);
  const [form, setForm] = React.useState({ letterType: "offer", recipientName: "", recipientEmail: "", recipientAddress: "", subject: "", body: "" });

  const load = React.useCallback(async () => {
    setLoading(true);
    try { const res = await fetch("/api/hr/letters", { cache: "no-store" }); if (res.ok) setItems((await res.json()).items ?? []); } finally { setLoading(false); }
  }, []);
  React.useEffect(() => { load(); }, [load]);

  React.useEffect(() => {
    if (createOpen && editing) {
      setForm({ letterType: editing.letterType, recipientName: editing.recipientName, recipientEmail: editing.recipientEmail ?? "", recipientAddress: editing.recipientAddress ?? "", subject: editing.subject, body: editing.body });
    } else if (createOpen) {
      setForm({ letterType: "offer", recipientName: "", recipientEmail: "", recipientAddress: "", subject: "", body: "" });
    }
  }, [createOpen, editing]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = editing ? `/api/hr/letters/${editing.id}` : "/api/hr/letters";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { toast({ title: editing ? "Letter updated" : "Letter created" }); setCreateOpen(false); setEditing(null); load(); }
  }

  function printLetter(l: any) {
    const typeLabel = LETTER_TYPES.find(t => t.value === l.letterType)?.label ?? l.letterType;
    const html = `<div style="font-family:'Times New Roman',Times,serif;padding:40px;max-width:800px;margin:0 auto"><div style="text-align:center;margin-bottom:30px"><h1 style="color:#1B6D97;margin:0">${typeLabel}</h1><div style="font-size:12px;color:#64748b">Letter No: ${l.letterNumber}</div><div style="font-size:12px;color:#64748b">Date: ${formatDate(l.issueDate)}</div></div><div style="margin-bottom:20px"><strong>To:</strong><br/>${l.recipientName}<br/>${l.recipientAddress ?? ""}</div><div style="margin-bottom:20px"><strong>Subject:</strong> ${l.subject}</div><div style="white-space:pre-wrap;line-height:1.8">${l.body}</div><div style="margin-top:50px;text-align:right"><div>Sincerely,</div><div style="margin-top:40px"><strong>HR Department</strong></div><div>ABWcurious</div></div></div>`;
    printHTML(html, `${typeLabel} ${l.letterNumber}`);
  }

  async function handleDelete(l: any) {
    if (!confirm(`Delete letter ${l.letterNumber}?`)) return;
    await fetch(`/api/hr/letters/${l.id}`, { method: "DELETE" });
    toast({ title: "Letter deleted" }); load();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => { setEditing(null); setCreateOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Create Letter</Button></div>
      <Card><CardContent className="p-0">
        {loading ? <div className="p-8 text-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> Loading…</div>
        : items.length === 0 ? <div className="p-12 text-center text-sm text-muted-foreground">No letters yet</div>
        : <Table><TableHeader><TableRow className="bg-muted/50"><TableHead>Letter #</TableHead><TableHead>Type</TableHead><TableHead>Recipient</TableHead><TableHead className="hidden md:table-cell">Date</TableHead><TableHead>Status</TableHead><TableHead className="w-24"></TableHead></TableRow></TableHeader>
          <TableBody>{items.map((l) => (
            <TableRow key={l.id} className="cursor-pointer hover:bg-accent/5" onClick={() => setViewing(l)}>
              <TableCell className="font-mono text-xs">{l.letterNumber}</TableCell>
              <TableCell><Badge variant="outline" className="text-[9px]">{LETTER_TYPES.find(t => t.value === l.letterType)?.label ?? l.letterType}</Badge></TableCell>
              <TableCell className="text-sm font-medium">{l.recipientName}</TableCell>
              <TableCell className="hidden md:table-cell text-xs">{formatDate(l.issueDate)}</TableCell>
              <TableCell><Badge variant={l.status === "issued" ? "default" : "secondary"} className="text-[9px] capitalize">{l.status}</Badge></TableCell>
              <TableCell><div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(l); setCreateOpen(true); }} title="Edit"><Pencil className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => printLetter(l)} title="Print PDF"><FileText className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(l)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div></TableCell>
            </TableRow>
          ))}</TableBody></Table>}
      </CardContent></Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Letter" : "Create Letter"}</DialogTitle><DialogDescription>Generate offer, NDA, warning, termination, and other letters</DialogDescription></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Letter Type</Label><Select value={form.letterType} onValueChange={(v) => setForm({ ...form, letterType: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LETTER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid sm:grid-cols-2 gap-3"><div className="space-y-2"><Label>Recipient Name *</Label><Input value={form.recipientName} onChange={(e) => setForm({ ...form, recipientName: e.target.value })} required /></div><div className="space-y-2"><Label>Email</Label><Input type="email" value={form.recipientEmail} onChange={(e) => setForm({ ...form, recipientEmail: e.target.value })} /></div></div>
            <div className="space-y-2"><Label>Address</Label><Input value={form.recipientAddress} onChange={(e) => setForm({ ...form, recipientAddress: e.target.value })} /></div>
            <div className="space-y-2"><Label>Subject</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
            <div className="space-y-2"><Label>Body</Label><textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={8} className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" placeholder="Write letter content…" /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => { setCreateOpen(false); setEditing(null); }}>Cancel</Button><Button type="submit">{editing ? "Save" : "Create"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {viewing && <Dialog open onOpenChange={() => setViewing(null)}><DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center justify-between"><span>{LETTER_TYPES.find(t => t.value === viewing.letterType)?.label ?? viewing.letterType}</span><Button size="sm" variant="outline" onClick={() => printLetter(viewing)}><FileText className="mr-1.5 h-3.5 w-3.5" /> Print PDF</Button></DialogTitle><DialogDescription>{viewing.letterNumber} · {formatDate(viewing.issueDate)}</DialogDescription></DialogHeader>
        <div className="space-y-4"><div className="bg-muted/30 rounded-lg p-4"><div className="text-sm"><strong>To:</strong> {viewing.recipientName}</div>{viewing.recipientAddress && <div className="text-sm text-muted-foreground">{viewing.recipientAddress}</div>}</div><div className="text-sm"><strong>Subject:</strong> {viewing.subject}</div><div className="text-sm whitespace-pre-wrap leading-relaxed">{viewing.body || "No content"}</div></div>
      </DialogContent></Dialog>}
    </div>
  );
}
