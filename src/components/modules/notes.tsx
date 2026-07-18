"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { StickyNote, Plus, Loader2, Pin, Search, Trash2, Pencil, Archive } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Note {
  id: string; title: string; content: string; tags: string;
  color: string; isPinned: boolean; isArchived: boolean;
  updatedAt: string; createdAt: string;
}

const NOTE_COLORS = [
  { name: "white", value: "#FFFFFF" },
  { name: "yellow", value: "#FEF9C3" },
  { name: "green", value: "#DCFCE7" },
  { name: "blue", value: "#DBEAFE" },
  { name: "pink", value: "#FCE7F3" },
  { name: "orange", value: "#FED7AA" },
];

export function NotesContent() {
  const { toast } = useToast();
  const [items, setItems] = React.useState<Note[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [editOpen, setEditOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Note | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      const res = await fetch(`/api/notes?${params}`, { cache: "no-store" });
      if (res.ok) setItems((await res.json()).items ?? []);
    } finally { setLoading(false); }
  }, [query]);

  React.useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function togglePin(n: Note) {
    await fetch(`/api/notes/${n.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPinned: !n.isPinned }),
    });
    load();
  }

  async function handleDelete(n: Note) {
    if (!confirm(`Delete note "${n.title}"?`)) return;
    await fetch(`/api/notes/${n.id}`, { method: "DELETE" });
    toast({ title: "Note deleted" });
    load();
  }

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <StickyNote className="h-6 w-6" /> Notes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{items.length} notes</p>
        </div>
        <Button onClick={() => { setEditing(null); setEditOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> New Note
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search notes…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> Loading…</div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center">
          <StickyNote className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm font-medium">No notes found</p>
          <Button className="mt-4" onClick={() => { setEditing(null); setEditOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Create Note</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((n) => {
            const tags = (() => { try { return JSON.parse(n.tags); } catch { return []; } })();
            return (
              <Card key={n.id} className="hover:shadow-md transition-shadow group" style={{ backgroundColor: n.color }}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-sm flex-1">{n.title}</h3>
                    <button onClick={() => togglePin(n)} className={cn("opacity-0 group-hover:opacity-100 transition-opacity", n.isPinned && "opacity-100")}>
                      <Pin className={cn("h-3.5 w-3.5", n.isPinned ? "fill-primary text-primary" : "text-muted-foreground")} />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-4 whitespace-pre-wrap">{n.content || "No content"}</p>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tags.map((t: string) => <Badge key={t} variant="secondary" className="text-[9px]">{t}</Badge>)}
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/40">
                    <span className="text-[10px] text-muted-foreground">{new Date(n.updatedAt).toLocaleDateString()}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditing(n); setEditOpen(true); }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDelete(n)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <NoteDialog open={editOpen} onOpenChange={setEditOpen} note={editing} onSaved={() => { setEditOpen(false); load(); }} />
    </div>
  );
}

function NoteDialog({ open, onOpenChange, note, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  note: Note | null; onSaved: () => void;
}) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState({
    title: "", content: "", tags: "", color: "#FEF9C3", isPinned: false,
  });

  React.useEffect(() => {
    if (open) {
      if (note) {
        const tags = (() => { try { return JSON.parse(note.tags).join(", "); } catch { return ""; } })();
        setForm({ title: note.title, content: note.content, tags, color: note.color, isPinned: note.isPinned });
      } else {
        setForm({ title: "", content: "", tags: "", color: "#FEF9C3", isPinned: false });
      }
    }
  }, [open, note]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title) { toast({ title: "Title required", variant: "destructive" }); return; }
    setSubmitting(true);
    const tags = form.tags.split(",").map((s) => s.trim()).filter(Boolean);
    const payload = { ...form, tags };
    try {
      const url = note ? `/api/notes/${note.id}` : "/api/notes";
      const method = note ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) {
        toast({ title: note ? "Note updated" : "Note created" });
        onSaved();
      }
    } finally { setSubmitting(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{note ? "Edit Note" : "New Note"}</DialogTitle>
          <DialogDescription>{note ? "Update note" : "Create a new note"}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required autoFocus />
          </div>
          <div className="space-y-2">
            <Label>Content</Label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={6}
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              placeholder="Write your note here…"
            />
          </div>
          <div className="space-y-2">
            <Label>Tags (comma-separated)</Label>
            <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="important, meeting, idea" />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2">
              {NOTE_COLORS.map((c) => (
                <button key={c.value} type="button" onClick={() => setForm({ ...form, color: c.value })}
                  className={cn("h-8 w-8 rounded-full border-2", form.color === c.value ? "border-foreground" : "border-transparent")}
                  style={{ backgroundColor: c.value }} title={c.name} />
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.isPinned} onChange={(e) => setForm({ ...form, isPinned: e.target.checked })} className="rounded" />
            Pin this note
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{note ? "Save" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
