"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { Wrench, Calculator, Percent, Calendar, FileText, Copy, Check, TrendingUp, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ToolsContent() {
  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Wrench className="h-6 w-6" /> Tools
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Calculators, converters, and business utilities
        </p>
      </div>

      <Tabs defaultValue="gst">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="gst" className="text-xs"><Percent className="h-3.5 w-3.5 mr-1.5" /> GST</TabsTrigger>
          <TabsTrigger value="loan" className="text-xs"><Calculator className="h-3.5 w-3.5 mr-1.5" /> EMI</TabsTrigger>
          <TabsTrigger value="date" className="text-xs"><Calendar className="h-3.5 w-3.5 mr-1.5" /> Date</TabsTrigger>
          <TabsTrigger value="tax" className="text-xs"><FileText className="h-3.5 w-3.5 mr-1.5" /> Tax</TabsTrigger>
          <TabsTrigger value="compound" className="text-xs"><TrendingUp className="h-3.5 w-3.5 mr-1.5" /> Compound Interest</TabsTrigger>
          <TabsTrigger value="percentage" className="text-xs"><Percent className="h-3.5 w-3.5 mr-1.5" /> Percentage</TabsTrigger>
          <TabsTrigger value="unit" className="text-xs"><Calculator className="h-3.5 w-3.5 mr-1.5" /> Unit Converter</TabsTrigger>
          <TabsTrigger value="currency" className="text-xs"><TrendingUp className="h-3.5 w-3.5 mr-1.5" /> Currency</TabsTrigger>
        </TabsList>

        <TabsContent value="gst" className="mt-4"><GstCalculator /></TabsContent>
        <TabsContent value="loan" className="mt-4"><LoanCalculator /></TabsContent>
        <TabsContent value="date" className="mt-4"><DateCalculator /></TabsContent>
        <TabsContent value="tax" className="mt-4"><TaxCalculator /></TabsContent>
        <TabsContent value="compound" className="mt-4"><CompoundInterestCalculator /></TabsContent>
        <TabsContent value="percentage" className="mt-4"><PercentageCalculator /></TabsContent>
        <TabsContent value="unit" className="mt-4"><UnitConverter /></TabsContent>
        <TabsContent value="currency" className="mt-4"><CurrencyConverter /></TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// GST Calculator
// ============================================================

function GstCalculator() {
  const [amount, setAmount] = React.useState("10000");
  const [rate, setRate] = React.useState("18");
  const [mode, setMode] = React.useState<"exclusive" | "inclusive">("exclusive");

  const amt = parseFloat(amount) || 0;
  const r = parseFloat(rate) || 0;
  let baseAmount, gstAmount, totalAmount;
  if (mode === "exclusive") {
    baseAmount = amt;
    gstAmount = (amt * r) / 100;
    totalAmount = amt + gstAmount;
  } else {
    totalAmount = amt;
    baseAmount = amt / (1 + r / 100);
    gstAmount = totalAmount - baseAmount;
  }

  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);
  function copyResult() {
    navigator.clipboard.writeText(`Base: ₹${baseAmount.toFixed(2)}, GST (${r}%): ₹${gstAmount.toFixed(2)}, Total: ₹${totalAmount.toFixed(2)}`);
    setCopied(true);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Input</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Calculation Mode</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as "exclusive" | "inclusive")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="exclusive">Exclusive (add GST to amount)</SelectItem>
                <SelectItem value="inclusive">Inclusive (extract GST from amount)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amt">Amount (₹)</Label>
            <Input id="amt" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>GST Rate</Label>
            <div className="grid grid-cols-5 gap-2">
              {["0", "5", "12", "18", "28"].map((r) => (
                <Button key={r} variant={rate === r ? "default" : "outline"} size="sm" onClick={() => setRate(r)} className="text-xs">
                  {r}%
                </Button>
              ))}
            </div>
            <Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="Custom rate" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            Result
            <Button variant="ghost" size="sm" onClick={copyResult}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Base Amount</span>
            <span className="font-medium tabular-nums">₹{baseAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">GST ({r}%)</span>
            <span className="font-medium tabular-nums text-warning">₹{gstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
            <span>Total</span>
            <span className="tabular-nums text-primary">₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="p-2 rounded-md bg-muted/50 text-center">
              <div className="text-[10px] text-muted-foreground uppercase">CGST (50%)</div>
              <div className="text-sm font-medium tabular-nums">₹{(gstAmount / 2).toFixed(2)}</div>
            </div>
            <div className="p-2 rounded-md bg-muted/50 text-center">
              <div className="text-[10px] text-muted-foreground uppercase">SGST (50%)</div>
              <div className="text-sm font-medium tabular-nums">₹{(gstAmount / 2).toFixed(2)}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Loan EMI Calculator
// ============================================================

function LoanCalculator() {
  const [principal, setPrincipal] = React.useState("500000");
  const [rate, setRate] = React.useState("12");
  const [tenure, setTenure] = React.useState("60");

  const p = parseFloat(principal) || 0;
  const r = (parseFloat(rate) || 0) / 12 / 100;
  const n = parseInt(tenure) || 0;
  const emi = r > 0 && n > 0 ? (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : 0;
  const totalPayment = emi * n;
  const totalInterest = totalPayment - p;

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Loan Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="principal">Principal Amount (₹)</Label>
            <Input id="principal" type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rate">Annual Interest Rate (%)</Label>
            <Input id="rate" type="number" step="0.1" value={rate} onChange={(e) => setRate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenure">Tenure (months)</Label>
            <Input id="tenure" type="number" value={tenure} onChange={(e) => setTenure(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Result</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="text-xs text-muted-foreground uppercase">Monthly EMI</div>
            <div className="text-3xl font-bold tabular-nums text-primary">₹{emi.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Principal</span>
              <span className="font-medium tabular-nums">₹{p.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Interest</span>
              <span className="font-medium tabular-nums text-warning">₹{totalInterest.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-2 border-t border-border">
              <span>Total Payment</span>
              <span className="tabular-nums">₹{totalPayment.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
          <div className="pt-2">
            <div className="text-xs text-muted-foreground mb-1">Composition</div>
            <div className="h-3 rounded-full overflow-hidden bg-muted flex">
              <div className="bg-primary" style={{ width: `${(p / totalPayment) * 100}%` }} title="Principal" />
              <div className="bg-warning" style={{ width: `${(totalInterest / totalPayment) * 100}%` }} title="Interest" />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>Principal {((p / totalPayment) * 100).toFixed(1)}%</span>
              <span>Interest {((totalInterest / totalPayment) * 100).toFixed(1)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Date Calculator
// ============================================================

function DateCalculator() {
  const [startDate, setStartDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = React.useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [addDays, setAddDays] = React.useState("30");

  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  const futureDate = new Date(start.getTime() + parseInt(addDays || "0") * 24 * 60 * 60 * 1000);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Date Difference</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="start">Start Date</Label>
              <Input id="start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">End Date</Label>
              <Input id="end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-md bg-primary/5 text-center">
              <div className="text-[10px] text-muted-foreground uppercase">Days</div>
              <div className="text-xl font-bold tabular-nums text-primary">{diffDays}</div>
            </div>
            <div className="p-3 rounded-md bg-muted/50 text-center">
              <div className="text-[10px] text-muted-foreground uppercase">Weeks</div>
              <div className="text-xl font-bold tabular-nums">{diffWeeks}</div>
            </div>
            <div className="p-3 rounded-md bg-muted/50 text-center">
              <div className="text-[10px] text-muted-foreground uppercase">Months</div>
              <div className="text-xl font-bold tabular-nums">{diffMonths}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Add/Subtract Days</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="addDays">Days to Add</Label>
            <Input id="addDays" type="number" value={addDays} onChange={(e) => setAddDays(e.target.value)} />
          </div>
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="text-xs text-muted-foreground uppercase">Result Date</div>
            <div className="text-xl font-bold text-primary">{futureDate.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</div>
          </div>
          <div className="text-xs text-muted-foreground">
            Starting from {start.toLocaleDateString("en-IN")} + {addDays} days = {futureDate.toLocaleDateString("en-IN")}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Income Tax Calculator (India, FY 2025-26 new regime)
// ============================================================

function TaxCalculator() {
  const [income, setIncome] = React.useState("1000000");
  const [regime, setRegime] = React.useState("new");

  const totalIncome = parseFloat(income) || 0;
  const standardDeduction = regime === "new" ? 75000 : 50000;
  const taxableIncome = Math.max(0, totalIncome - standardDeduction);

  // New regime slabs (FY 2025-26)
  function calculateNewRegime(ti: number): number {
    let tax = 0;
    if (ti <= 400000) return 0;
    if (ti <= 800000) tax += (ti - 400000) * 0.05;
    else tax += 400000 * 0.05;
    if (ti <= 1200000) tax += (ti - 800000) * 0.10;
    else if (ti > 800000) tax += 400000 * 0.10;
    if (ti <= 1600000) tax += (ti - 1200000) * 0.15;
    else if (ti > 1200000) tax += 400000 * 0.15;
    if (ti <= 2000000) tax += (ti - 1600000) * 0.20;
    else if (ti > 1600000) tax += 400000 * 0.20;
    if (ti <= 2400000) tax += (ti - 2000000) * 0.25;
    else if (ti > 2000000) tax += 400000 * 0.25;
    if (ti > 2400000) tax += (ti - 2400000) * 0.30;
    return tax;
  }

  // Old regime slabs
  function calculateOldRegime(ti: number): number {
    let tax = 0;
    if (ti <= 250000) return 0;
    if (ti <= 500000) tax += (ti - 250000) * 0.05;
    else tax += 250000 * 0.05;
    if (ti <= 1000000) tax += (ti - 500000) * 0.20;
    else if (ti > 500000) tax += 500000 * 0.20;
    if (ti > 1000000) tax += (ti - 1000000) * 0.30;
    return tax;
  }

  const baseTax = regime === "new" ? calculateNewRegime(taxableIncome) : calculateOldRegime(taxableIncome);
  const cess = baseTax * 0.04; // 4% health & education cess
  const totalTax = baseTax + cess;

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Income Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tax Regime</Label>
            <Select value={regime} onValueChange={setRegime}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New Regime (FY 2025-26)</SelectItem>
                <SelectItem value="old">Old Regime</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="income">Annual Income (₹)</Label>
            <Input id="income" type="number" value={income} onChange={(e) => setIncome(e.target.value)} />
          </div>
          <div className="p-3 rounded-md bg-muted/50 text-xs space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Total Income</span><span className="tabular-nums">₹{totalIncome.toLocaleString("en-IN")}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Standard Deduction</span><span className="tabular-nums">- ₹{standardDeduction.toLocaleString("en-IN")}</span></div>
            <div className="flex justify-between font-medium pt-1 border-t border-border"><span>Taxable Income</span><span className="tabular-nums">₹{taxableIncome.toLocaleString("en-IN")}</span></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Tax Calculation</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Income Tax</span>
            <span className="font-medium tabular-nums">₹{baseTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Health &amp; Education Cess (4%)</span>
            <span className="font-medium tabular-nums">₹{cess.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
            <span>Total Tax</span>
            <span className="tabular-nums text-destructive">₹{totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-sm pt-2">
            <span className="text-muted-foreground">Post-tax Income</span>
            <span className="font-medium tabular-nums text-success">₹{(totalIncome - totalTax).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Effective Tax Rate</span>
            <Badge variant="outline">{totalIncome > 0 ? ((totalTax / totalIncome) * 100).toFixed(2) : 0}%</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Compound Interest Calculator
// ============================================================

function CompoundInterestCalculator() {
  const [principal, setPrincipal] = React.useState("100000");
  const [rate, setRate] = React.useState("8");
  const [years, setYears] = React.useState("5");
  const [freq, setFreq] = React.useState("4"); // compounding frequency per year

  const p = parseFloat(principal) || 0;
  const r = (parseFloat(rate) || 0) / 100;
  const n = parseInt(years) || 0;
  const f = parseInt(freq) || 1;
  const amount = p * Math.pow(1 + r / f, f * n);
  const interest = amount - p;

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Input</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Principal (₹)</Label><Input type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Rate (%)</Label><Input type="number" step="0.1" value={rate} onChange={(e) => setRate(e.target.value)} /></div>
            <div className="space-y-2"><Label>Years</Label><Input type="number" value={years} onChange={(e) => setYears(e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label>Compounding Frequency</Label>
            <Select value={freq} onValueChange={setFreq}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Annually</SelectItem>
                <SelectItem value="2">Semi-annually</SelectItem>
                <SelectItem value="4">Quarterly</SelectItem>
                <SelectItem value="12">Monthly</SelectItem>
                <SelectItem value="365">Daily</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Result</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="text-xs text-muted-foreground uppercase">Maturity Amount</div>
            <div className="text-3xl font-bold tabular-nums text-primary">₹{amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Principal</span><span className="tabular-nums">₹{p.toLocaleString("en-IN")}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Interest Earned</span><span className="tabular-nums text-success font-medium">₹{interest.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
            <div className="flex justify-between text-sm font-bold pt-2 border-t border-border"><span>Total</span><span className="tabular-nums">₹{amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
          </div>
          <div className="h-3 rounded-full overflow-hidden bg-muted flex">
            <div className="bg-primary" style={{ width: `${(p / amount) * 100}%` }} title="Principal" />
            <div className="bg-success" style={{ width: `${(interest / amount) * 100}%` }} title="Interest" />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Principal {((p / amount) * 100).toFixed(1)}%</span>
            <span>Interest {((interest / amount) * 100).toFixed(1)}%</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Percentage Calculator
// ============================================================

function PercentageCalculator() {
  const [mode, setMode] = React.useState("of");
  const [value1, setValue1] = React.useState("250");
  const [value2, setValue2] = React.useState("20");

  const v1 = parseFloat(value1) || 0;
  const v2 = parseFloat(value2) || 0;
  let result = 0;
  let label = "";
  if (mode === "of") { result = (v2 / 100) * v1; label = `${v2}% of ${v1}`; }
  else if (mode === "isWhat") { result = v1 === 0 ? 0 : (v2 / v1) * 100; label = `${v2} is ${result.toFixed(2)}% of ${v1}`; }
  else if (mode === "change") { result = v1 === 0 ? 0 : ((v2 - v1) / v1) * 100; label = `Change from ${v1} to ${v2}`; }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Input</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Calculation Type</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="of">X% of Y</SelectItem>
                <SelectItem value="isWhat">X is what % of Y</SelectItem>
                <SelectItem value="change">% change from X to Y</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>{mode === "of" ? "Value (Y)" : mode === "isWhat" ? "Value (X)" : "Original (X)"}</Label><Input type="number" value={value1} onChange={(e) => setValue1(e.target.value)} /></div>
            <div className="space-y-2"><Label>{mode === "of" ? "Percentage (X%)" : mode === "isWhat" ? "Value (Y)" : "New (Y)"}</Label><Input type="number" value={value2} onChange={(e) => setValue2(e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Result</CardTitle></CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="text-xs text-muted-foreground uppercase">{label}</div>
            <div className="text-3xl font-bold tabular-nums text-primary">{mode === "isWhat" || mode === "change" ? `${result.toFixed(2)}%` : `₹${result.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Unit Converter
// ============================================================

function UnitConverter() {
  const [category, setCategory] = React.useState("length");
  const [input, setInput] = React.useState("1");
  const [fromUnit, setFromUnit] = React.useState("meter");
  const [toUnit, setToUnit] = React.useState("feet");

  const UNITS: Record<string, Record<string, number>> = {
    length: { meter: 1, kilometer: 1000, centimeter: 0.01, millimeter: 0.001, mile: 1609.34, yard: 0.9144, feet: 0.3048, inch: 0.0254 },
    weight: { kilogram: 1, gram: 0.001, ton: 1000, pound: 0.453592, ounce: 0.0283495 },
    volume: { liter: 1, milliliter: 0.001, gallon: 3.78541, quart: 0.946353, cup: 0.236588 },
    temperature: { celsius: 1, fahrenheit: 1, kelvin: 1 },
    area: { sqmeter: 1, sqkilometer: 1000000, sqfeet: 0.092903, acre: 4046.86, hectare: 10000 },
  };

  const units = Object.keys(UNITS[category] || {});
  const inputValue = parseFloat(input) || 0;
  let result = 0;
  if (category === "temperature") {
    // Special handling for temperature
    let celsius: number;
    if (fromUnit === "celsius") celsius = inputValue;
    else if (fromUnit === "fahrenheit") celsius = (inputValue - 32) * 5 / 9;
    else celsius = inputValue - 273.15;
    if (toUnit === "celsius") result = celsius;
    else if (toUnit === "fahrenheit") result = celsius * 9 / 5 + 32;
    else result = celsius + 273.15;
  } else {
    const fromFactor = UNITS[category]?.[fromUnit] ?? 1;
    const toFactor = UNITS[category]?.[toUnit] ?? 1;
    result = (inputValue * fromFactor) / toFactor;
  }

  function changeCategory(c: string) {
    setCategory(c);
    const newUnits = Object.keys(UNITS[c] || {});
    if (newUnits.length > 0) { setFromUnit(newUnits[0]); setToUnit(newUnits[1] ?? newUnits[0]); }
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Input</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Category</Label>
            <Select value={category} onValueChange={changeCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="length">Length</SelectItem>
                <SelectItem value="weight">Weight</SelectItem>
                <SelectItem value="volume">Volume</SelectItem>
                <SelectItem value="temperature">Temperature</SelectItem>
                <SelectItem value="area">Area</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Value</Label><Input type="number" value={input} onChange={(e) => setInput(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>From</Label>
              <Select value={fromUnit} onValueChange={setFromUnit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{units.map((u) => <SelectItem key={u} value={u} className="capitalize">{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>To</Label>
              <Select value={toUnit} onValueChange={setToUnit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{units.map((u) => <SelectItem key={u} value={u} className="capitalize">{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Result</CardTitle></CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="text-xs text-muted-foreground uppercase">{inputValue} {fromUnit} =</div>
            <div className="text-3xl font-bold tabular-nums text-primary">{result.toLocaleString("en-IN", { maximumFractionDigits: 6 })} {toUnit}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Currency Converter (live rates)
// ============================================================

function CurrencyConverter() {
  const [amount, setAmount] = React.useState("100");
  const [from, setFrom] = React.useState("USD");
  const [to, setTo] = React.useState("INR");
  const [result, setResult] = React.useState<{ converted: number; exchangeRate: number; timestamp: string } | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

  const CURRENCIES = [
    "USD", "INR", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY", "SGD",
    "AED", "SAR", "HKD", "NZD", "SEK", "NOK", "DKK", "PLN", "THB", "MYR",
    "IDR", "PHP", "VND", "KRW", "BRL", "MXN", "ZAR", "TRY", "RUB", "NGN",
    "PKR", "BDT", "LKR", "NPR",
  ];

  async function convert() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/currency?from=${from}&to=${to}&amount=${amount}`);
      if (!res.ok) throw new Error("Failed to fetch rates");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      toast({ title: "Conversion failed", description: err instanceof Error ? err.message : "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    const t = setTimeout(convert, 500);
    return () => clearTimeout(t);
  }, [amount, from, to]);

  function swap() {
    setFrom(to);
    setTo(from);
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Input</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Amount</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>From</Label>
              <Select value={from} onValueChange={setFrom}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>To</Label>
              <Select value={to} onValueChange={setTo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={swap} className="w-full">↑↓ Swap currencies</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Result</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> Fetching live rates…</div>
          ) : error ? (
            <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20 text-sm text-destructive">{error}</div>
          ) : result ? (
            <>
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="text-xs text-muted-foreground uppercase">{amount} {from} =</div>
                <div className="text-3xl font-bold tabular-nums text-primary">
                  {result.converted.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {to}
                </div>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Exchange Rate</span><span className="tabular-nums">1 {from} = {result.exchangeRate} {to}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Updated</span><span className="text-xs">{new Date(result.timestamp).toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Source</span><span className="text-xs">open.er-api.com (live)</span></div>
              </div>
              <div className="text-[10px] text-muted-foreground border-t border-border pt-2">
                Rates are fetched from a live API and cached for 1 hour. For informational purposes only.
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

// Need Loader2 import for currency converter
