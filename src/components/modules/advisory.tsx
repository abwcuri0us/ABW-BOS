"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Brain, Send, Loader2, Lightbulb, TrendingUp, AlertCircle, Target, CheckCircle2, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AdvisorySession {
  id: string; topic: string; category: string; question: string; answer: string;
  insights: string; recommendations: string; followUpQuestions: string;
  rating: number | null; createdAt: string;
}

const CATEGORIES = [
  { value: "financial", label: "Financial", icon: TrendingUp },
  { value: "operational", label: "Operational", icon: Target },
  { value: "strategic", label: "Strategic", icon: Brain },
  { value: "compliance", label: "Compliance", icon: AlertCircle },
  { value: "growth", label: "Growth", icon: TrendingUp },
  { value: "general", label: "General", icon: Lightbulb },
];

const SUGGESTED_QUESTIONS = [
  "How can I improve my cash flow based on current outstanding receivables?",
  "What should my inventory reorder strategy be given the low-stock products?",
  "Analyze my revenue trend and suggest growth strategies",
  "What are the financial risks in my current business snapshot?",
  "How should I prioritize my outstanding invoices for collection?",
  "What cost-cutting measures would you recommend?",
];

export function AdvisoryContent() {
  const { toast } = useToast();
  const [question, setQuestion] = React.useState("");
  const [category, setCategory] = React.useState("general");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<AdvisorySession | null>(null);
  const [history, setHistory] = React.useState<AdvisorySession[]>([]);
  const [showHistory, setShowHistory] = React.useState(false);

  const loadHistory = React.useCallback(async () => {
    try {
      const res = await fetch("/api/advisory", { cache: "no-store" });
      if (res.ok) setHistory((await res.json()).items ?? []);
    } catch { /* ignore */ }
  }, []);

  React.useEffect(() => { loadHistory(); }, [loadHistory]);

  function parseJSON<T>(s: string): T[] {
    try { return JSON.parse(s); } catch { return []; }
  }

  async function ask(q?: string) {
    const query = q ?? question;
    if (!query.trim() || loading) return;
    setQuestion(query);
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/advisory", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query, category }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data.advisory);
        loadHistory();
      } else {
        toast({ title: "Advisory failed", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally { setLoading(false); }
  }

  async function rate(sessionId: string, rating: number) {
    await fetch("/api/advisory", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: sessionId, rating }),
    });
    if (result) setResult({ ...result, rating });
  }

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto h-full flex flex-col">
      <div className="flex-shrink-0">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Brain className="h-6 w-6 text-primary" /> AI Advisory
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Strategic business advice powered by AI — analyzes your data and provides actionable recommendations
        </p>
      </div>

      {/* Query input */}
      <Card className="flex-shrink-0">
        <CardContent className="p-4 space-y-3">
          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-2">
              <Label className="text-xs">Your Question</Label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask for strategic advice about your business…"
                rows={3}
                className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => ask()} disabled={loading || !question.trim()} className="h-10">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          {/* Suggested questions */}
          {!result && !loading && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Lightbulb className="h-3 w-3" /> Suggested questions:
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button key={q} onClick={() => ask(q)} className="text-left p-2.5 rounded-lg border border-border bg-card hover:bg-accent/5 hover:border-primary/30 transition-colors text-xs">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Result */}
      {loading && (
        <Card className="flex-shrink-0">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
            <p className="text-sm text-muted-foreground">Analyzing your business data and generating strategic advice…</p>
          </CardContent>
        </Card>
      )}

      {result && !loading && (
        <Card className="flex-shrink-0">
          <CardContent className="p-6 space-y-4">
            {/* Question */}
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[9px] capitalize">{result.category}</Badge>
                <span className="text-xs text-muted-foreground">{new Date(result.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-sm font-medium">{result.question}</p>
            </div>

            {/* Answer */}
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{result.answer}</div>
            </div>

            {/* Insights */}
            {parseJSON<string>(result.insights).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-1.5"><Lightbulb className="h-4 w-4 text-warning" /> Key Insights</h3>
                <ul className="space-y-1">
                  {parseJSON<string>(result.insights).map((insight, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-warning mt-0.5">•</span> {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {parseJSON<string>(result.recommendations).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" /> Recommendations</h3>
                <ol className="space-y-1">
                  {parseJSON<string>(result.recommendations).map((rec, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-success font-medium mt-0.5">{i + 1}.</span> {rec}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Follow-up questions */}
            {parseJSON<string>(result.followUpQuestions).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-1.5"><Target className="h-4 w-4 text-primary" /> Follow-up Questions</h3>
                <div className="space-y-1">
                  {parseJSON<string>(result.followUpQuestions).map((fq, i) => (
                    <button key={i} onClick={() => ask(fq)} className="block text-left text-sm text-primary hover:underline">
                      → {fq}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Rating */}
            <div className="flex items-center gap-2 pt-3 border-t border-border">
              <span className="text-xs text-muted-foreground">Rate this advice:</span>
              {[1, 2, 3, 4, 5].map((r) => (
                <button key={r} onClick={() => rate(result.id, r)} className={cn("text-lg", r <= (result.rating ?? 0) ? "text-warning" : "text-muted-foreground/40 hover:text-warning")}>
                  ★
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* History toggle */}
      <div className="flex-shrink-0">
        <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)}>
          <History className="mr-2 h-3.5 w-3.5" /> {showHistory ? "Hide" : "Show"} History ({history.length})
        </Button>
      </div>

      {/* History */}
      {showHistory && (
        <Card className="flex-1 min-h-0">
          <CardContent className="p-0">
            <ScrollArea className="h-80">
              <div className="divide-y divide-border">
                {history.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">No advisory history yet</div>
                ) : history.map((h) => (
                  <button key={h.id} onClick={() => setResult(h)} className="w-full text-left p-4 hover:bg-accent/5 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[9px] capitalize">{h.category}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(h.createdAt).toLocaleString()}</span>
                      {h.rating && <span className="text-[10px] text-warning">{"★".repeat(h.rating)}</span>}
                    </div>
                    <p className="text-sm font-medium truncate">{h.topic}</p>
                    <p className="text-xs text-muted-foreground truncate">{h.question}</p>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
