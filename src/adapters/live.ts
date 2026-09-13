/**
 * Live data source for the web app: cached quotes and mint powers, wired into
 * the pure analyzer. Server-side only. Never import this from a client
 * component, or the RPC key would end up in the browser bundle.
 */
import "server-only";

import { analyzeTicker, type PowersFetcher, type QuoteFetcher, type TickerAnalysis } from "@/core/analyze";
import type { MintPowers } from "@/core/custody";
import { USDC_MINT, fetchQuote } from "./jupiter";
import { createConnection, fetchMintPowers } from "./rpc";
import { TtlCache } from "./cache";

/** Quotes move constantly; mint powers change roughly never. */
const QUOTE_TTL_MS = 30_000;
const POWERS_TTL_MS = 6 * 60 * 60 * 1_000;
const ANALYSIS_TTL_MS = 30_000;

const quoteCache = new TtlCache<{ routable: boolean; priceImpact?: number }>(QUOTE_TTL_MS);
const powersCache = new TtlCache<MintPowers>(POWERS_TTL_MS);
const analysisCache = new TtlCache<TickerAnalysis>(ANALYSIS_TTL_MS);

const liveQuote: QuoteFetcher = async (mint, amountRaw) => {
  const key = `${mint}:${amountRaw}`;
  const probe = await quoteCache.get(key, async () => {
    const result = await fetchQuote(USDC_MINT, mint, amountRaw);
    if (!result.ok) return { routable: false };
    return { routable: true, priceImpact: result.quote.priceImpact };
  });
  return { sizeUsd: 0, ...probe };
};

const livePowers: PowersFetcher = (mint) =>
  powersCache.get(mint, () => fetchMintPowers(createConnection(), mint));

/** Cached full analysis for one ticker. Safe to call on every request. */
export function getTickerAnalysis(ticker: string): Promise<TickerAnalysis> {
  return analysisCache.get(ticker.toUpperCase(), () =>
    analyzeTicker(ticker, liveQuote, livePowers),
  );
}
