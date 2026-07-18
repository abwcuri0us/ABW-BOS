"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "next-themes";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth-provider";
import { Settings as SettingsIcon, Moon, Sun, Monitor, Palette, Globe, Keyboard, Bell, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export function SettingsContent() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { user } = useAuth();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const [notifications, setNotifications] = React.useState({
    inApp: true,
    email: false,
    sound: true,
    quietHours: false,
  });

  const [locale, setLocale] = React.useState("en-IN");
  const [currency, setCurrency] = React.useState("INR");
  const [dateFormat, setDateFormat] = React.useState("DD/MM/YYYY");
  const [reduceMotion, setReduceMotion] = React.useState(false);

  async function saveSetting(key: string, value: unknown) {
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      toast({ title: "Setting saved", description: `${key} = ${JSON.stringify(value)}` });
    } catch {
      toast({ title: "Failed to save setting", variant: "destructive" });
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <SettingsIcon className="h-6 w-6" />
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Personalize your ABW-BOS experience
        </p>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Appearance
          </CardTitle>
          <CardDescription>Customize how ABW-BOS looks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Theme */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: "light", label: "Light", icon: Sun },
              { value: "dark", label: "Dark", icon: Moon },
              { value: "system", label: "Auto", icon: Monitor },
            ].map((opt) => {
              const Icon = opt.icon;
              const isActive = mounted && theme === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors",
                    isActive
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30",
                  )}
                >
                  <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
                  <span className={cn("text-sm font-medium", isActive && "text-primary")}>{opt.label}</span>
                </button>
              );
            })}
          </div>

          <Separator />

          {/* Reduce motion */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="reduce-motion" className="text-sm">Reduce motion</Label>
              <p className="text-xs text-muted-foreground">Minimize animations and transitions</p>
            </div>
            <Switch
              id="reduce-motion"
              checked={reduceMotion}
              onCheckedChange={(v) => {
                setReduceMotion(v);
                saveSetting("reduceMotion", v);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Locale */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Locale &amp; Region
          </CardTitle>
          <CardDescription>Date formats, currency, and language</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="locale">Language</Label>
              <Select value={locale} onValueChange={(v) => { setLocale(v); saveSetting("locale", v); }}>
                <SelectTrigger id="locale">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en-IN">English (India)</SelectItem>
                  <SelectItem value="en-US">English (US)</SelectItem>
                  <SelectItem value="en-GB">English (UK)</SelectItem>
                  <SelectItem value="hi">हिन्दी (Hindi)</SelectItem>
                  <SelectItem value="mr">मराठी (Marathi)</SelectItem>
                  <SelectItem value="ta">தமிழ் (Tamil)</SelectItem>
                  <SelectItem value="te">తెలుగు (Telugu)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Default Currency</Label>
              <Select value={currency} onValueChange={(v) => { setCurrency(v); saveSetting("currency", v); }}>
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">INR — Indian Rupee (₹)</SelectItem>
                  <SelectItem value="USD">USD — US Dollar ($)</SelectItem>
                  <SelectItem value="EUR">EUR — Euro (€)</SelectItem>
                  <SelectItem value="GBP">GBP — Pound (£)</SelectItem>
                  <SelectItem value="AED">AED — Dirham (د.إ)</SelectItem>
                  <SelectItem value="SGD">SGD — Singapore Dollar (S$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateFormat">Date Format</Label>
              <Select value={dateFormat} onValueChange={(v) => { setDateFormat(v); saveSetting("dateFormat", v); }}>
                <SelectTrigger id="dateFormat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (31/12/2026)</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (12/31/2026)</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2026-12-31)</SelectItem>
                  <SelectItem value="DD-MMM-YYYY">DD-MMM-YYYY (31-Dec-2026)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </CardTitle>
          <CardDescription>How you want to be notified</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: "inApp" as const, label: "In-app notifications", desc: "Show toasts in the corner of the app" },
            { key: "email" as const, label: "Email notifications", desc: "Send critical alerts to your email" },
            { key: "sound" as const, label: "Sound effects", desc: "Play a sound when notifications arrive" },
            { key: "quietHours" as const, label: "Quiet hours (22:00 – 07:00)", desc: "Suppress non-critical notifications during quiet hours" },
          ].map((opt) => (
            <div key={opt.key} className="flex items-center justify-between">
              <div>
                <Label className="text-sm">{opt.label}</Label>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </div>
              <Switch
                checked={notifications[opt.key]}
                onCheckedChange={(v) => {
                  setNotifications((n) => ({ ...n, [opt.key]: v }));
                  saveSetting(`notif.${opt.key}`, v);
                }}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Keyboard shortcuts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Keyboard className="h-4 w-4" />
            Keyboard Shortcuts
          </CardTitle>
          <CardDescription>Speed up your workflow</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { keys: ["⌘", "K"], desc: "Open quick navigation" },
            { keys: ["⌘", "/"], desc: "Show keyboard shortcuts" },
            { keys: ["Esc"], desc: "Close dialog or panel" },
            { keys: ["Tab"], desc: "Move to next field" },
            { keys: ["⌘", "Enter"], desc: "Submit form" },
          ].map((sc) => (
            <div key={sc.desc} className="flex items-center justify-between py-1.5">
              <span className="text-sm">{sc.desc}</span>
              <div className="flex gap-1">
                {sc.keys.map((k) => (
                  <kbd key={k} className="h-6 min-w-6 px-1.5 inline-flex items-center justify-center text-[11px] font-mono bg-muted border border-border rounded">
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Account
          </CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Username</p>
              <p className="font-medium">@{user?.username}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Display Name</p>
              <p className="font-medium">{user?.displayName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Roles</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {user?.roles.map((r) => (
                  <span key={r} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                    {r}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">User ID</p>
              <p className="font-mono text-xs text-muted-foreground">{user?.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
