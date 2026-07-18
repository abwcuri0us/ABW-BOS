"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send, Loader2, Bot, User as UserIcon, Lightbulb, TrendingUp, AlertCircle, Cloud, Cpu } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { LocalAiPanel } from "@/components/local-ai-panel";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  contextStats?: { parties: number; products: number; invoices: number };
}

const SUGGESTED_QUERIES = [
  "Show me all overdue invoices",
  "What is our total outstanding receivables?",
  "List all customers with credit limit above ₹100,000",
  "Which products are low in stock?",
  "How many invoices were created this month?",
  "What is our revenue trend?",
  "Show me the top 5 customers by invoice amount",
  "List all inactive parties",
];

export function AiContent() {
  const { toast } = useToast();
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new message
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function ask(query: string) {
    if (!query.trim() || loading) return;
    const userMsg: ChatMessage = { role: "user", content: query.trim(), timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userMsg.content }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: data.answer,
          timestamp: data.timestamp,
          contextStats: data.contextStats,
        }]);
      } else {
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: `⚠️ ${data.error ?? "Failed to get response"}\n\n${data.details ?? ""}`,
          timestamp: new Date().toISOString(),
        }]);
        toast({ title: "AI query failed", description: data.error, variant: "destructive" });
      }
    } catch (err) {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "⚠️ Network error. Please try again.",
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    ask(input);
  }

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" /> AI Assistant
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ask questions about your business in natural language · choose between cloud (GLM-4.6) and in-browser (WebLLM)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Cloud AI (left) */}
        <Card className="flex flex-col min-h-0">
        <CardHeader className="border-b border-border py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Cloud className="h-4 w-4 text-primary" /> Cloud AI
            <Badge variant="secondary" className="text-[9px]">GLM-4.6</Badge>
          </CardTitle>
          <CardDescription className="text-[10px]">Server-side · analyzes all CRM data</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0 min-h-0">
          <ScrollArea className="flex-1" ref={scrollRef as never}>
            <div className="p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary">
                    <Bot className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-base font-medium">Ask me anything about your business</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      I can analyze your parties, products, invoices, and GL accounts
                    </p>
                  </div>
                  <div className="max-w-2xl mx-auto space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                      <Lightbulb className="h-3.5 w-3.5" /> Try asking:
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {SUGGESTED_QUERIES.map((q) => (
                        <button
                          key={q}
                          onClick={() => ask(q)}
                          className="text-left p-3 rounded-lg border border-border bg-card hover:bg-accent/5 hover:border-primary/30 transition-colors text-sm"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={cn("flex gap-3", msg.role === "user" && "flex-row-reverse")}>
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                      msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-accent/10 text-accent",
                    )}>
                      {msg.role === "user" ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>
                    <div className={cn(
                      "max-w-[80%] rounded-lg p-3 text-sm",
                      msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
                    )}>
                      <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                      <div className="mt-2 flex items-center gap-2 text-[10px] opacity-70">
                        <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                        {msg.contextStats && (
                          <span>· {msg.contextStats.parties} parties, {msg.contextStats.products} products, {msg.contextStats.invoices} invoices analyzed</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {loading && (
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-accent/10 text-accent flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-muted rounded-lg p-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing your business data…
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="border-t border-border p-3 flex-shrink-0">
            <form onSubmit={onSubmit} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your business… (e.g. 'show me overdue invoices')"
                disabled={loading}
                className="flex-1 px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50"
              />
              <Button type="submit" disabled={loading || !input.trim()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

        {/* Local AI (right) */}
        <LocalAiPanel />
      </div>
    </div>
  );
}
