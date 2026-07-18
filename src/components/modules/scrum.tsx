"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  ClipboardList, Plus, Loader2, GripVertical, Calendar, Clock, User as UserIcon, ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Task {
  id: string; title: string; description: string | null;
  status: string; priority: string; type: string; storyPoints: number | null;
  assigneeId: string | null; dueDate: string | null; order: number;
  tags: string;
  assignee: { id: string; name: string; avatarColor: string } | null;
}
interface Project {
  id: string; name: string; description: string | null; status: string;
  priority: string; progress: number; startDate: string | null; endDate: string | null;
  _count?: { tasks: number; sprints: number };
}
interface Member { id: string; name: string; avatarColor: string; }

const COLUMNS = [
  { id: "todo", label: "To Do", color: "border-t-muted" },
  { id: "in_progress", label: "In Progress", color: "border-t-info" },
  { id: "review", label: "Review", color: "border-t-warning" },
  { id: "done", label: "Done", color: "border-t-success" },
];

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-destructive/10 text-destructive border-destructive/30",
  high: "bg-warning/10 text-warning border-warning/30",
  medium: "bg-info/10 text-info border-info/30",
  low: "bg-muted text-muted-foreground border-border",
};

const TYPE_ICONS: Record<string, string> = { task: "📋", bug: "🐛", story: "📖", epic: "🎯" };

export function ScrumContent() {
  const { toast } = useToast();
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = React.useState<string>("");
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [members, setMembers] = React.useState<Member[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [taskDialogOpen, setTaskDialogOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<Task | null>(null);
  const [projectDialogOpen, setProjectDialogOpen] = React.useState(false);
  const [draggingTask, setDraggingTask] = React.useState<string | null>(null);

  // Load projects
  React.useEffect(() => {
    fetch("/api/scrum/projects", { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        setProjects(d.items ?? []);
        if (d.items?.length > 0 && !selectedProject) setSelectedProject(d.items[0].id);
      })
      .finally(() => setLoading(false));
  }, [selectedProject]);

  // Load tasks + members when project changes
  React.useEffect(() => {
    if (!selectedProject) return;
    fetch(`/api/scrum/tasks?projectId=${selectedProject}`, { cache: "no-store" })
      .then(r => r.json())
      .then(d => setTasks(d.items ?? []))
      .catch(() => {});
    fetch("/api/team", { cache: "no-store" })
      .then(r => r.json())
      .then(d => setMembers(d.items ?? []))
      .catch(() => {});
  }, [selectedProject]);

  // Group tasks by status
  const tasksByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.id] = tasks.filter((t) => t.status === col.id).sort((a, b) => a.order - b.order);
    return acc;
  }, {} as Record<string, Task[]>);

  async function moveTask(taskId: string, newStatus: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;
    // Optimistic update
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t));
    // Persist
    const newOrder = tasksByStatus[newStatus]?.length ?? 0;
    await fetch("/api/scrum/tasks", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates: [{ id: taskId, status: newStatus, order: newOrder }] }),
    });
    toast({ title: `Task moved to ${COLUMNS.find(c => c.id === newStatus)?.label}` });
  }

  async function handleDeleteTask(t: Task) {
    if (!confirm(`Delete task "${t.title}"?`)) return;
    await fetch(`/api/scrum/tasks/${t.id}`, { method: "DELETE" });
    setTasks((prev) => prev.filter((x) => x.id !== t.id));
    toast({ title: "Task deleted" });
  }

  const currentProject = projects.find((p) => p.id === selectedProject);
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  if (loading) return <div className="p-8 text-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> Loading…</div>;

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardList className="h-6 w-6" /> Scrum Board
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Project management and task tracking</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Select project" /></SelectTrigger>
            <SelectContent>
              {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setProjectDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Project
          </Button>
          {selectedProject && (
            <Button onClick={() => { setEditingTask(null); setTaskDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Task
            </Button>
          )}
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="p-12 text-center">
          <ClipboardList className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm font-medium">No projects yet</p>
          <Button className="mt-4" onClick={() => setProjectDialogOpen(true)}><Plus className="mr-2 h-4 w-4" /> Create Project</Button>
        </div>
      ) : !selectedProject ? (
        <div className="p-12 text-center text-sm text-muted-foreground">Select a project to view tasks</div>
      ) : (
        <>
          {/* Project header */}
          {currentProject && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{currentProject.name}</h2>
                    <p className="text-xs text-muted-foreground">{currentProject.description ?? "No description"}</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-2xl font-bold tabular-nums">{progress}%</div>
                      <div className="text-[10px] text-muted-foreground uppercase">Complete</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold tabular-nums">{doneTasks}/{totalTasks}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">Tasks</div>
                    </div>
                    <Badge variant="outline" className="capitalize">{currentProject.status}</Badge>
                    <Badge variant="outline" className={cn("capitalize", PRIORITY_COLORS[currentProject.priority])}>{currentProject.priority}</Badge>
                  </div>
                </div>
                <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Kanban board */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {COLUMNS.map((col) => (
              <div key={col.id} className={cn("rounded-lg border-t-4 border border-border bg-muted/20", col.color)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); if (draggingTask) { moveTask(draggingTask, col.id); setDraggingTask(null); } }}
              >
                <div className="p-3 border-b border-border bg-card/50 flex items-center justify-between">
                  <span className="text-sm font-medium">{col.label}</span>
                  <Badge variant="secondary" className="text-[10px]">{tasksByStatus[col.id]?.length ?? 0}</Badge>
                </div>
                <div className="p-2 space-y-2 min-h-[200px]">
                  {tasksByStatus[col.id]?.map((t) => {
                    const tags = (() => { try { return JSON.parse(t.tags); } catch { return []; } })();
                    const assignee = members.find((m) => m.id === t.assigneeId);
                    const initials = assignee?.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase() ?? "?";
                    return (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={() => setDraggingTask(t.id)}
                        onClick={() => { setEditingTask(t); setTaskDialogOpen(true); }}
                        className="bg-card border border-border rounded-md p-3 cursor-pointer hover:shadow-md transition-shadow group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[10px]">{TYPE_ICONS[t.type] ?? "📋"}</span>
                          <GripVertical className="h-3 w-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100" />
                        </div>
                        <p className="text-sm font-medium mt-1">{t.title}</p>
                        {t.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>}
                        <div className="flex items-center justify-between mt-2">
                          <Badge variant="outline" className={cn("text-[9px] capitalize", PRIORITY_COLORS[t.priority])}>{t.priority}</Badge>
                          {t.storyPoints != null && <span className="text-[10px] font-mono text-muted-foreground">{t.storyPoints}pt</span>}
                        </div>
                        {t.dueDate && (
                          <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
                            <Calendar className="h-3 w-3" /> {new Date(t.dueDate).toLocaleDateString()}
                          </div>
                        )}
                        {assignee && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <Avatar className="h-5 w-5" style={{ backgroundColor: assignee.avatarColor }}>
                              <AvatarFallback className="text-[8px] text-white">{initials}</AvatarFallback>
                            </Avatar>
                            <span className="text-[10px] text-muted-foreground">{assignee.name}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {tasksByStatus[col.id]?.length === 0 && (
                    <div className="text-center py-8 text-xs text-muted-foreground">Drop tasks here</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Task dialog */}
      <TaskDialog
        open={taskDialogOpen} onOpenChange={setTaskDialogOpen}
        task={editingTask} projectId={selectedProject}
        members={members}
        onSaved={() => { setTaskDialogOpen(false);
          // Reload tasks
          fetch(`/api/scrum/tasks?projectId=${selectedProject}`, { cache: "no-store" })
            .then(r => r.json()).then(d => setTasks(d.items ?? []));
        }}
        onDelete={handleDeleteTask}
      />

      {/* Project dialog */}
      <ProjectDialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen} onSaved={() => {
        setProjectDialogOpen(false);
        fetch("/api/scrum/projects", { cache: "no-store" }).then(r => r.json()).then(d => setProjects(d.items ?? []));
      }} />
    </div>
  );
}

function TaskDialog({ open, onOpenChange, task, projectId, members, onSaved, onDelete }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  task: Task | null; projectId: string;
  members: Member[];
  onSaved: () => void; onDelete: (t: Task) => void;
}) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState({
    title: "", description: "", status: "todo", priority: "medium", type: "task",
    storyPoints: "", assigneeId: "", dueDate: "", estimatedHours: "",
  });

  React.useEffect(() => {
    if (open) {
      if (task) {
        setForm({
          title: task.title, description: task.description ?? "",
          status: task.status, priority: task.priority, type: task.type,
          storyPoints: task.storyPoints?.toString() ?? "", assigneeId: task.assigneeId ?? "",
          dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "", estimatedHours: "",
        });
      } else {
        setForm({ title: "", description: "", status: "todo", priority: "medium", type: "task", storyPoints: "", assigneeId: "", dueDate: "", estimatedHours: "" });
      }
    }
  }, [open, task]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title) { toast({ title: "Title required", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const url = task ? `/api/scrum/tasks/${task.id}` : "/api/scrum/tasks";
      const method = task ? "PUT" : "POST";
      const payload = { ...form, projectId };
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) {
        toast({ title: task ? "Task updated" : "Task created" });
        onSaved();
      } else {
        const d = await res.json(); toast({ title: "Failed", description: d.error, variant: "destructive" });
      }
    } finally { setSubmitting(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "New Task"}</DialogTitle>
          <DialogDescription>{task ? "Update task details" : "Create a new task"}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required autoFocus />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="bug">Bug</SelectItem>
                  <SelectItem value="story">Story</SelectItem>
                  <SelectItem value="epic">Epic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Story Points</Label>
              <Input type="number" value={form.storyPoints} onChange={(e) => setForm({ ...form, storyPoints: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Est. Hours</Label>
              <Input type="number" step="0.5" value={form.estimatedHours} onChange={(e) => setForm({ ...form, estimatedHours: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Assignee</Label>
            <Select value={form.assigneeId || "none"} onValueChange={(v) => setForm({ ...form, assigneeId: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {(members ?? []).map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="flex justify-between">
            <div>
              {task && (
                <Button type="button" variant="outline" className="text-destructive" onClick={() => { onDelete(task); onOpenChange(false); }}>
                  Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{task ? "Save" : "Create"}</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProjectDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", description: "", priority: "medium", startDate: "", endDate: "" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) { toast({ title: "Name required", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/scrum/projects", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast({ title: "Project created" });
        setForm({ name: "", description: "", priority: "medium", startDate: "", endDate: "" });
        onSaved();
      }
    } finally { setSubmitting(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
          <DialogDescription>Create a new scrum project</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Project Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
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
