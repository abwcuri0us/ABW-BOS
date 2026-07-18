"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Calendar, Plus, Loader2, Clock, MapPin, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ScheduleEvent {
  id: string; title: string; description: string | null;
  type: string; startDate: string; endDate: string; allDay: boolean;
  location: string | null; status: string; priority: string; color: string;
}

const TYPE_COLORS: Record<string, string> = {
  meeting: "#1B6D97", call: "#15803D", task: "#B45309",
  appointment: "#7C3AED", reminder: "#DB2777", break: "#0891B2",
};

const TYPE_LABELS: Record<string, string> = {
  meeting: "Meeting", call: "Call", task: "Task",
  appointment: "Appointment", reminder: "Reminder", break: "Break",
};

export function ScheduleContent() {
  const { toast } = useToast();
  const [events, setEvents] = React.useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [currentDate, setCurrentDate] = React.useState(new Date());

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const firstOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      const res = await fetch(`/api/schedules?from=${firstOfMonth.toISOString()}&to=${lastOfMonth.toISOString()}`, { cache: "no-store" });
      if (res.ok) setEvents((await res.json()).items ?? []);
    } finally { setLoading(false); }
  }, [currentDate]);

  React.useEffect(() => { load(); }, [load]);

  async function handleDelete(e: ScheduleEvent) {
    if (!confirm(`Delete "${e.title}"?`)) return;
    await fetch(`/api/schedules/${e.id}`, { method: "DELETE" });
    toast({ title: "Event deleted" });
    load();
  }

  // Calendar grid
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const today = new Date();
  const isToday = (d: number) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

  const eventsForDay = (d: number) => {
    const dayStart = new Date(year, month, d, 0, 0, 0);
    const dayEnd = new Date(year, month, d, 23, 59, 59);
    return events.filter((e) => {
      const start = new Date(e.startDate);
      return start >= dayStart && start <= dayEnd;
    });
  };

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-6 w-6" /> Daily Schedule
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Calendar and appointments</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" /> New Event</Button>
      </div>

      {/* Month navigation */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold min-w-[160px] text-center">{monthNames[month]} {year}</h2>
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Today</Button>
        </CardContent>
      </Card>

      {/* Calendar grid */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> Loading…</div>
          ) : (
            <div className="grid grid-cols-7 min-w-[700px]">
              {days.map((d) => (
                <div key={d} className="p-2 text-center text-xs font-semibold text-muted-foreground border-b border-border bg-muted/30">{d}</div>
              ))}
              {/* Empty cells before day 1 */}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[100px] border-r border-b border-border bg-muted/10" />
              ))}
              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayEvents = eventsForDay(day);
                return (
                  <div key={day} className={cn(
                    "min-h-[100px] border-r border-b border-border p-1.5 relative",
                    isToday(day) && "bg-primary/5",
                  )}>
                    <div className={cn(
                      "text-xs font-medium mb-1 inline-flex items-center justify-center w-6 h-6 rounded-full",
                      isToday(day) ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                    )}>{day}</div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map((e) => (
                        <div
                          key={e.id}
                          className="text-[10px] px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80"
                          style={{ backgroundColor: `${e.color}20`, color: e.color, borderLeft: `2px solid ${e.color}` }}
                          onClick={() => { if (confirm(`Delete "${e.title}"?`)) handleDelete(e); }}
                        >
                          {new Date(e.startDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} {e.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-[10px] text-muted-foreground px-1">+{dayEvents.length - 3} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming events list */}
      <Card>
        <CardHeader><CardTitle className="text-base">Upcoming Events</CardTitle></CardHeader>
        <CardContent className="p-0">
          {events.filter((e) => new Date(e.startDate) >= new Date(new Date().setHours(0, 0, 0, 0))).slice(0, 10).length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No upcoming events</div>
          ) : (
            <div className="divide-y divide-border">
              {events.filter((e) => new Date(e.startDate) >= new Date(new Date().setHours(0, 0, 0, 0))).slice(0, 10).map((e) => (
                <div key={e.id} className="px-4 py-3 flex items-center gap-3 group">
                  <div className="w-1 h-10 rounded-full" style={{ backgroundColor: e.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{e.title}</span>
                      <Badge variant="outline" className="text-[9px]">{TYPE_LABELS[e.type] ?? e.type}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(e.startDate).toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                      {e.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {e.location}</span>}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => handleDelete(e)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateEventDialog open={createOpen} onOpenChange={setCreateOpen} onSaved={() => { setCreateOpen(false); load(); }} />
    </div>
  );
}

function CreateEventDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState({
    title: "", description: "", type: "meeting",
    startDate: new Date().toISOString().slice(0, 16),
    endDate: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
    location: "", priority: "medium",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title) { toast({ title: "Title required", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/schedules", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, color: TYPE_COLORS[form.type] ?? "#1B6D97" }),
      });
      if (res.ok) {
        toast({ title: "Event created" });
        setForm({ ...form, title: "", description: "", location: "" });
        onSaved();
      }
    } finally { setSubmitting(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Event</DialogTitle>
          <DialogDescription>Schedule a meeting, call, or task</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required autoFocus />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start</Label>
              <Input type="datetime-local" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>End</Label>
              <Input type="datetime-local" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Conference room / Zoom link" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
