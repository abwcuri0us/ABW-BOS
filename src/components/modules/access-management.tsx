"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Shield, Loader2, Save, Lock, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth-provider";
import { cn } from "@/lib/utils";

interface ModuleInfo { id: string; label: string; section: string; }
interface RoleInfo { id: string; code: string; name: string; description: string | null; isSystem: boolean; modules: string[]; }

export function AccessManagementContent() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [roles, setRoles] = React.useState<RoleInfo[]>([]);
  const [allModules, setAllModules] = React.useState<ModuleInfo[]>([]);
  const [selectedRole, setSelectedRole] = React.useState<string>("");
  const [accessMap, setAccessMap] = React.useState<Record<string, string[]>>({});
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [hasChanges, setHasChanges] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/access-management", { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setRoles(d.roles ?? []);
        setAllModules(d.allModules ?? []);
        if (d.roles?.length > 0 && !selectedRole) setSelectedRole(d.roles[0].code);
        const map: Record<string, string[]> = {};
        for (const r of d.roles ?? []) map[r.code] = r.modules;
        setAccessMap(map);
      }
    } finally { setLoading(false); }
  }, [selectedRole]);

  React.useEffect(() => { load(); }, [load]);

  const currentRole = roles.find(r => r.code === selectedRole);
  const currentModules = accessMap[selectedRole] ?? [];
  const sections = Array.from(new Set(allModules.map(m => m.section)));

  function toggleModule(moduleId: string) {
    if (selectedRole === "SuperAdmin") return;
    setAccessMap(prev => {
      const current = prev[selectedRole] ?? [];
      const updated = current.includes(moduleId) ? current.filter(m => m !== moduleId) : [...current, moduleId];
      return { ...prev, [selectedRole]: updated };
    });
    setHasChanges(true);
  }

  function selectAll() { setAccessMap(prev => ({ ...prev, [selectedRole]: allModules.map(m => m.id) })); setHasChanges(true); }
  function deselectAll() { setAccessMap(prev => ({ ...prev, [selectedRole]: ["dashboard"] })); setHasChanges(true); }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/access-management", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roleCode: selectedRole, modules: accessMap[selectedRole] ?? [] }) });
      if (res.ok) { toast({ title: "Access updated" }); setHasChanges(false); }
      else { const d = await res.json(); toast({ title: "Failed", description: d.error, variant: "destructive" }); }
    } finally { setSaving(false); }
  }

  if (loading) return <div className="p-8 text-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> Loading…</div>;

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Shield className="h-6 w-6" /> Access Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Control which modules each role can access</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Select Role</CardTitle><CardDescription>Choose a role to manage its module access</CardDescription></CardHeader>
        <CardContent><div className="flex flex-wrap gap-2">
          {roles.map(r => (
            <button key={r.code} onClick={() => { setSelectedRole(r.code); setHasChanges(false); }} className={cn("px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors flex items-center gap-2", selectedRole === r.code ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/30 text-muted-foreground")}>
              {r.code === "SuperAdmin" && <Lock className="h-3 w-3" />}{r.name}<Badge variant="secondary" className="text-[9px]">{accessMap[r.code]?.length ?? 0}</Badge>
            </button>
          ))}
        </div></CardContent>
      </Card>
      {currentRole && (
        <Card>
          <CardHeader><div className="flex items-center justify-between">
            <div><CardTitle className="text-base flex items-center gap-2">{currentRole.code === "SuperAdmin" && <Lock className="h-4 w-4 text-muted-foreground" />}{currentRole.name} — Module Access</CardTitle><CardDescription>{currentRole.code === "SuperAdmin" ? "SuperAdmin has all modules (locked)" : `Has access to ${currentModules.length} of ${allModules.length} modules`}</CardDescription></div>
            {currentRole.code !== "SuperAdmin" && <div className="flex gap-2"><Button variant="outline" size="sm" onClick={selectAll}>Select All</Button><Button variant="outline" size="sm" onClick={deselectAll}>Deselect All</Button></div>}
          </div></CardHeader>
          <CardContent className="space-y-4">
            {sections.map(section => (
              <div key={section}>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{section}</div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {allModules.filter(m => m.section === section).map(m => {
                    const hasAccess = currentModules.includes(m.id);
                    const isLocked = currentRole.code === "SuperAdmin";
                    return (
                      <label key={m.id} className={cn("flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors", hasAccess ? "border-primary/30 bg-primary/5" : "border-border hover:border-primary/20", isLocked && "cursor-not-allowed opacity-80")}>
                        <Checkbox checked={hasAccess} onCheckedChange={() => toggleModule(m.id)} disabled={isLocked} />
                        <span className={cn("text-sm", hasAccess ? "font-medium" : "text-muted-foreground")}>{m.label}</span>
                        {hasAccess && <CheckCircle2 className="h-3.5 w-3.5 text-primary ml-auto" />}
                      </label>
                    );
                  })}
                </div>
                <Separator className="mt-3" />
              </div>
            ))}
            {currentRole.code !== "SuperAdmin" && <div className="flex justify-end pt-2"><Button onClick={save} disabled={saving || !hasChanges}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{hasChanges ? "Save Changes" : "No Changes"}</Button></div>}
          </CardContent>
        </Card>
      )}
      {user && (
        <Card>
          <CardHeader><CardTitle className="text-base">Your Access ({user.displayName})</CardTitle><CardDescription>Roles: {user.roles.join(", ")}</CardDescription></CardHeader>
          <CardContent><div className="flex flex-wrap gap-1.5">
            {allModules.map(m => {
              const hasAccess = user.isSuperAdmin || user.roles.some(role => { const rm = accessMap[role] ?? []; return rm.includes(m.id); });
              return <Badge key={m.id} variant={hasAccess ? "default" : "outline"} className="text-[10px]">{hasAccess ? <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> : null}{m.label}</Badge>;
            })}
          </div></CardContent>
        </Card>
      )}
    </div>
  );
}
