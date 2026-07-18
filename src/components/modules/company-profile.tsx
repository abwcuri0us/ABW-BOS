"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Building2, Save, Loader2, Upload, ImageIcon, Palette } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Profile {
  id: string;
  companyName: string;
  tagline: string | null;
  logoUrl: string | null;
  letterheadUrl: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateProvince: string | null;
  postalCode: string | null;
  countryCode: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  taxId: string | null;
  taxIdType: string;
  bankName: string | null;
  bankAccount: string | null;
  bankIfsc: string | null;
  bankBranch: string | null;
  upiId: string | null;
  defaultFont: string;
  primaryColor: string;
  invoicePrefix: string;
  quotationPrefix: string;
  invoiceTerms: string | null;
  quotationTerms: string | null;
}

export function CompanyProfileSettings() {
  const { toast } = useToast();
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/company-profile", { cache: "no-store" });
      if (res.ok) setProfile((await res.json()).profile);
    } finally { setLoading(false); }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((prev) => prev ? { ...prev, [key]: value } : prev);
  }

  async function onSave() {
    if (!profile) return;
    setSaving(true);
    try {
      const res = await fetch("/api/company-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        toast({ title: "Company profile saved", description: "Changes will reflect in invoices and quotations" });
      } else {
        toast({ title: "Failed to save", variant: "destructive" });
      }
    } finally { setSaving(false); }
  }

  function handleImageUpload(field: "logoUrl" | "letterheadUrl" | "signatureUrl", file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      update(field as any, reader.result as string);
      toast({ title: `${field === "logoUrl" ? "Logo" : field === "letterheadUrl" ? "Letterhead" : "Signature"} uploaded` });
    };
    reader.readAsDataURL(file);
  }

  if (loading || !profile) {
    return <div className="p-8 text-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> Loading company profile…</div>;
  }

  const colors = ["#1B6D97", "#15803D", "#B45309", "#B91C1C", "#7C3AED", "#DB2777", "#0891B2", "#475569", "#0F172A"];

  return (
    <div className="space-y-6">
      {/* Company Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" /> Company Identity</CardTitle>
          <CardDescription>Company name, logo, and letterhead — used on all printed documents</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company Name *</Label>
              <Input value={profile.companyName} onChange={(e) => update("companyName", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tagline</Label>
              <Input value={profile.tagline ?? ""} onChange={(e) => update("tagline", e.target.value)} placeholder="Business Operating System" />
            </div>
          </div>

          {/* Logo upload */}
          <div className="space-y-2">
            <Label>Company Logo (appears on invoices, quotations, reports)</Label>
            <div className="flex items-center gap-4">
              {profile.logoUrl ? (
                <img src={profile.logoUrl} alt="Logo" className="h-16 w-16 rounded-lg object-contain border border-border" />
              ) : (
                <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background hover:bg-accent/5 text-sm transition-colors">
                    <Upload className="h-4 w-4" /> Upload Logo
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImageUpload("logoUrl", f);
                  }} />
                </label>
                {profile.logoUrl && (
                  <Button variant="ghost" size="sm" className="ml-2 text-destructive" onClick={() => update("logoUrl", null)}>Remove</Button>
                )}
              </div>
            </div>
          </div>

          {/* Letterhead upload */}
          <div className="space-y-2">
            <Label>Full Letterhead Image (optional — overrides text header on printed documents)</Label>
            <div className="flex items-center gap-4">
              {profile.letterheadUrl ? (
                <img src={profile.letterheadUrl} alt="Letterhead" className="h-20 w-32 rounded-lg object-cover border border-border" />
              ) : (
                <div className="h-20 w-32 rounded-lg bg-muted flex items-center justify-center">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background hover:bg-accent/5 text-sm transition-colors">
                    <Upload className="h-4 w-4" /> Upload Letterhead
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImageUpload("letterheadUrl", f);
                  }} />
                </label>
                {profile.letterheadUrl && (
                  <Button variant="ghost" size="sm" className="ml-2 text-destructive" onClick={() => update("letterheadUrl", null)}>Remove</Button>
                )}
                <p className="text-xs text-muted-foreground mt-1">Upload a full letterhead image (JPG/PNG) to use as the header on all PDF documents</p>
              </div>
            </div>
          </div>

          {/* Primary color */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Palette className="h-3.5 w-3.5" /> Brand Color (used in PDF headers, borders, accents)</Label>
            <div className="flex gap-2 items-center">
              {colors.map((c) => (
                <button key={c} type="button" onClick={() => update("primaryColor", c)}
                  className={cn("h-8 w-8 rounded-full border-2", profile.primaryColor === c ? "border-foreground" : "border-transparent")}
                  style={{ backgroundColor: c }} />
              ))}
              <Input type="color" value={profile.primaryColor} onChange={(e) => update("primaryColor", e.target.value)} className="w-12 h-8 p-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address & Contact */}
      <Card>
        <CardHeader><CardTitle className="text-base">Address & Contact</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Address Line 1</Label><Input value={profile.addressLine1 ?? ""} onChange={(e) => update("addressLine1", e.target.value)} /></div>
            <div className="space-y-2"><Label>Address Line 2</Label><Input value={profile.addressLine2 ?? ""} onChange={(e) => update("addressLine2", e.target.value)} /></div>
          </div>
          <div className="grid sm:grid-cols-4 gap-4">
            <div className="space-y-2"><Label>City</Label><Input value={profile.city ?? ""} onChange={(e) => update("city", e.target.value)} /></div>
            <div className="space-y-2"><Label>State</Label><Input value={profile.stateProvince ?? ""} onChange={(e) => update("stateProvince", e.target.value)} /></div>
            <div className="space-y-2"><Label>Postal Code</Label><Input value={profile.postalCode ?? ""} onChange={(e) => update("postalCode", e.target.value)} /></div>
            <div className="space-y-2"><Label>Country</Label><Input value={profile.countryCode} onChange={(e) => update("countryCode", e.target.value)} /></div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Phone</Label><Input value={profile.phone ?? ""} onChange={(e) => update("phone", e.target.value)} /></div>
            <div className="space-y-2"><Label>Email</Label><Input value={profile.email ?? ""} onChange={(e) => update("email", e.target.value)} /></div>
            <div className="space-y-2"><Label>Website</Label><Input value={profile.website ?? ""} onChange={(e) => update("website", e.target.value)} /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Tax ID ({profile.taxIdType})</Label><Input value={profile.taxId ?? ""} onChange={(e) => update("taxId", e.target.value)} /></div>
            <div className="space-y-2"><Label>Tax ID Type</Label><Input value={profile.taxIdType} onChange={(e) => update("taxIdType", e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      {/* Bank Details */}
      <Card>
        <CardHeader><CardTitle className="text-base">Bank Details (printed on invoices)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Bank Name</Label><Input value={profile.bankName ?? ""} onChange={(e) => update("bankName", e.target.value)} /></div>
            <div className="space-y-2"><Label>Account Number</Label><Input value={profile.bankAccount ?? ""} onChange={(e) => update("bankAccount", e.target.value)} /></div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>IFSC Code</Label><Input value={profile.bankIfsc ?? ""} onChange={(e) => update("bankIfsc", e.target.value)} /></div>
            <div className="space-y-2"><Label>Branch</Label><Input value={profile.bankBranch ?? ""} onChange={(e) => update("bankBranch", e.target.value)} /></div>
            <div className="space-y-2"><Label>UPI ID</Label><Input value={profile.upiId ?? ""} onChange={(e) => update("upiId", e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      {/* Document Settings */}
      <Card>
        <CardHeader><CardTitle className="text-base">Document Settings</CardTitle><CardDescription>Prefixes and default terms for generated documents</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Invoice Prefix</Label><Input value={profile.invoicePrefix} onChange={(e) => update("invoicePrefix", e.target.value)} /></div>
            <div className="space-y-2"><Label>Quotation Prefix</Label><Input value={profile.quotationPrefix} onChange={(e) => update("quotationPrefix", e.target.value)} /></div>
          </div>
          <div className="space-y-2">
            <Label>Default Invoice Terms & Conditions</Label>
            <textarea
              value={profile.invoiceTerms ?? ""}
              onChange={(e) => update("invoiceTerms", e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label>Default Quotation Terms & Conditions</Label>
            <textarea
              value={profile.quotationTerms ?? ""}
              onChange={(e) => update("quotationTerms", e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end sticky bottom-4">
        <Button onClick={onSave} disabled={saving} size="lg" className="shadow-lg">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Company Profile
        </Button>
      </div>
    </div>
  );
}
