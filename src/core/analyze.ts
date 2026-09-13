/**
 * Composition root for a ticker analysis: registry + live quotes + on-chain
 * mint powers, in, sentences out. The only impure part is the two fetchers,
 * which are injected so this stays testable without a network.
 */
import { analyzeSize, maxSafeSize, toRawAmount, type SizeAnalysis } from "./liquidity";
import { analyzeCustody, type MintPowers } from "./custody";
import { headlineFor, verdictFor, type WrapperVerdict } from "./verdict";
import { registry, wrappersFor, type Wrapper } from "@/registry/schema";

export const PROBE_SIZES_USD = [1_000, 10_000, 100_000] as const;
export const REFERENCE_SIZE_USD = 1_000;
const USDC_DECIMALS = 6;

export interface QuoteProbe {
  sizeUsd: number;
  routable: boolean;
  priceImpact?: number;
}

export type QuoteFetcher = (mint: string, amountRaw: bigint) => Promise<QuoteProbe>;
export type PowersFetcher = (mint: string) => Promise<MintPowers>;

export interface TickerAnalysis {
  ticker: string;
  headline: string;
  capturedAt: string;
  verdicts: WrapperVerdict[];
  /** Set only when the worst routable wrapper is a trap, to drive the cost bar. */
  worstCost?: { symbol: string; sizeUsd: number; costUsd: number };
}

async function measure(
  w: Wrapper,
  quote: QuoteFetcher,
  powers: PowersFetcher,
) {
  const probes: SizeAnalysis[] = [];
  let referenceCostUsd: number | undefined;

  for (const sizeUsd of PROBE_SIZES_USD) {
    const probe = await quote(w.mint, toRawAmount(sizeUsd, USDC_DECIMALS));
    if (!probe.routable || probe.priceImpact === undefined) continue;
    const a = analyzeSize(sizeUsd, probe.priceImpact);
    probes.push(a);
    if (sizeUsd === REFERENCE_SIZE_USD) referenceCostUsd = a.costUsd;
  }

  const mintPowers = await powers(w.mint);
  const issuerName = registry.issuers[w.issuer]?.name ?? w.issuer;
  const reference = probes.find((p) => p.sizeUsd === REFERENCE_SIZE_USD);

  return {
    symbol: w.symbol,
    issuerName,
    routable: probes.length > 0,
    bestTier: reference?.tier ?? probes[0]?.tier,
    maxSafeSizeUsd: maxSafeSize(probes),
    referenceCostUsd,
    custody: analyzeCustody(mintPowers),
    probes,
  };
}

export async function analyzeTicker(
  ticker: string,
  quote: QuoteFetcher,
  powers: PowersFetcher,
): Promise<TickerAnalysis> {
  const upper = ticker.toUpperCase();
  const wrappers = wrappersFor(upper);

  const measurements = await Promise.all(
    wrappers.map((w) => measure(w, quote, powers)),
  );

  const verdicts = measurements.map(verdictFor);

  let worstCost: TickerAnalysis["worstCost"];
  for (const m of measurements) {
    if (m.bestTier !== "trap" || m.referenceCostUsd === undefined) continue;
    if (!worstCost || m.referenceCostUsd > worstCost.costUsd) {
      worstCost = {
        symbol: m.symbol,
        sizeUsd: REFERENCE_SIZE_USD,
        costUsd: m.referenceCostUsd,
      };
    }
  }

  return {
    ticker: upper,
    headline: headlineFor(upper, verdicts),
    capturedAt: new Date().toISOString(),
    verdicts,
    ...(worstCost ? { worstCost } : {}),
  };
}
