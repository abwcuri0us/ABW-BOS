/**
 * /api/currency
 * GET — returns exchange rates (fetched from open.er-api.com, cached for 1 hour)
 *
 * Usage: /api/currency?from=USD&to=INR&amount=100
 * Or:    /api/currency (returns all rates from USD)
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";

// In-memory cache (expires after 1 hour)
let rateCache: { data: Record<string, number>; ts: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function fetchRates(): Promise<Record<string, number>> {
  // Check cache
  if (rateCache && Date.now() - rateCache.ts < CACHE_TTL) {
    return rateCache.data;
  }

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      // @ts-ignore - next.js fetch options
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`API returned ${res.status}`);
    const data = await res.json();
    if (data.rates) {
      rateCache = { data: data.rates, ts: Date.now() };
      return data.rates;
    }
    throw new Error("No rates in response");
  } catch (err) {
    // Fallback to hardcoded rates if API is unavailable
    console.error("[currency] Failed to fetch rates, using fallback:", err);
    const fallback: Record<string, number> = {
      USD: 1, INR: 83.25, EUR: 0.92, GBP: 0.79, JPY: 149.5, AUD: 1.52,
      CAD: 1.36, CHF: 0.88, CNY: 7.24, SGD: 1.34, AED: 3.67, SAR: 3.75,
      HKD: 7.82, NZD: 1.64, SEK: 10.5, NOK: 10.7, DKK: 6.85, PLN: 4.05,
      THB: 35.8, MYR: 4.68, IDR: 15800, PHP: 56.2, VND: 24800, KRW: 1320,
      BRL: 5.05, MXN: 17.2, ZAR: 18.8, TRY: 32.1, RUB: 92.5, NGN: 1600,
      PKR: 278, BDT: 117, LKR: 325, NPR: 133.5, BTC: 0.000023,
    };
    return fallback;
  }
}

export async function GET(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(req.url);
  const from = (url.searchParams.get("from") ?? "USD").toUpperCase();
  const to = (url.searchParams.get("to") ?? "INR").toUpperCase();
  const amount = parseFloat(url.searchParams.get("amount") ?? "1");

  try {
    const rates = await fetchRates();

    // If no specific conversion requested, return all rates
    if (!url.searchParams.has("from") && !url.searchParams.has("to")) {
      return NextResponse.json({
        base: "USD",
        rates,
        cached: rateCache ? Date.now() - rateCache.ts < CACHE_TTL : false,
        timestamp: new Date().toISOString(),
      });
    }

    // Convert: amount in 'from' → USD → 'to'
    const fromRate = rates[from];
    const toRate = rates[to];
    if (!fromRate || !toRate) {
      return NextResponse.json(
        { error: `Currency code not supported: ${!fromRate ? from : to}` },
        { status: 400 },
      );
    }

    // amount in 'from' → USD → 'to'
    const usdAmount = amount / fromRate;
    const convertedAmount = usdAmount * toRate;
    const exchangeRate = toRate / fromRate;

    return NextResponse.json({
      from,
      to,
      amount,
      converted: Math.round(convertedAmount * 100) / 100,
      exchangeRate: Math.round(exchangeRate * 10000) / 10000,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[currency] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch exchange rates" },
      { status: 500 },
    );
  }
}
