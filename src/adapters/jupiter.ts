/**
 * Jupiter API edge. The only place in the codebase that talks to the aggregator.
 */
import type { RawQuote } from "@/core/liquidity";

const DEFAULT_BASE = "https://lite-api.jup.ag";
export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const USDC_DECIMALS = 6;

export type QuoteFailure =
  | { kind: "no_route"; message: string }
  | { kind: "api_error"; message: string };

export type QuoteResult =
  | { ok: true; quote: RawQuote }
  | { ok: false; failure: QuoteFailure };

const NO_ROUTE = /no route|not tradable|could not find any route/i;

function baseUrl(): string {
  return process.env.JUPITER_BASE_URL || DEFAULT_BASE;
}

/**
 * Fetches an executable quote. Never throws on a routing failure: an
 * unroutable token is a finding, not an error. Infrastructure failures are
 * reported separately so they are never mistaken for illiquidity.
 */
export async function fetchQuote(
  inputMint: string,
  outputMint: string,
  amountRaw: bigint,
  slippageBps = 100,
): Promise<QuoteResult> {
  const url =
    `${baseUrl()}/swap/v1/quote?inputMint=${inputMint}&outputMint=${outputMint}` +
    `&amount=${amountRaw}&slippageBps=${slippageBps}`;

  let text: string;
  let status: number;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(25_000) });
    status = res.status;
    text = await res.text();
  } catch (e) {
    return { ok: false, failure: { kind: "api_error", message: `request failed: ${(e as Error).message}` } };
  }

  if (status === 429 || text.startsWith("Rate limit")) {
    return { ok: false, failure: { kind: "api_error", message: "rate limited" } };
  }

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, failure: { kind: "api_error", message: `non-JSON response (${status})` } };
  }

  if (typeof json?.outAmount === "string" && typeof json?.inAmount === "string") {
    return {
      ok: true,
      quote: {
        inAmount: BigInt(json.inAmount),
        outAmount: BigInt(json.outAmount),
        priceImpact: Number(json.priceImpactPct ?? 0),
      },
    };
  }

  const message = String(json?.error ?? json?.errorCode ?? `unexpected response (${status})`);
  return {
    ok: false,
    failure: { kind: NO_ROUTE.test(message) ? "no_route" : "api_error", message },
  };
}
