/**
 * Liquidity analysis for tokenized-equity wrappers.
 *
 * Every function here is pure: no network, no clock, no randomness. Quotes are
 * fetched at the edges and passed in as plain data. This is what makes the
 * money-touching logic auditable and property-testable.
 */

/** A single executable quote, as returned by an aggregator, in raw base units. */
export interface RawQuote {
  /** Amount spent, in the input mint's base units. */
  readonly inAmount: bigint;
  /** Amount received, in the output mint's base units. */
  readonly outAmount: bigint;
  /** Price impact as a fraction, e.g. 0.0132 for 1.32%. */
  readonly priceImpact: number;
}

export type LiquidityTier = "deep" | "usable" | "thin" | "trap" | "unroutable";

export interface SizeAnalysis {
  /** Order size in USD that was probed. */
  readonly sizeUsd: number;
  readonly tier: LiquidityTier;
  /** Price impact as a fraction. */
  readonly priceImpact: number;
  /** Dollars lost to price impact on this order size. */
  readonly costUsd: number;
}

export const TIER_THRESHOLDS = {
  deep: 0.001,    // <= 0.1%
  usable: 0.005,  // <= 0.5%
  thin: 0.02,     // <= 2%
} as const;

/** Impact above which we consider the quote a trap rather than a price. */
export const TRAP_THRESHOLD = TIER_THRESHOLDS.thin;

/**
 * Converts a raw on-chain amount to a UI amount without going through an
 * intermediate float, so large balances keep full precision.
 */
export function toUiAmount(raw: bigint, decimals: number): number {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
    throw new RangeError(`invalid decimals: ${decimals}`);
  }
  if (raw < 0n) throw new RangeError("raw amount must be non-negative");
  const divisor = 10n ** BigInt(decimals);
  const whole = raw / divisor;
  const fraction = raw % divisor;
  return Number(whole) + Number(fraction) / Number(divisor);
}

/** Converts a UI amount to raw base units, rounding to the nearest unit. */
export function toRawAmount(ui: number, decimals: number): bigint {
  if (!Number.isFinite(ui) || ui < 0) throw new RangeError("invalid ui amount");
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
    throw new RangeError(`invalid decimals: ${decimals}`);
  }
  return BigInt(Math.round(ui * 10 ** decimals));
}

/**
 * All-in price paid per whole token, derived from an actual executable quote.
 * This includes routing fees and price impact, unlike a mid-market price.
 */
export function effectivePrice(
  quote: RawQuote,
  inputDecimals: number,
  outputDecimals: number,
): number {
  const spent = toUiAmount(quote.inAmount, inputDecimals);
  const received = toUiAmount(quote.outAmount, outputDecimals);
  if (received <= 0) throw new RangeError("quote returned zero output");
  return spent / received;
}

/**
 * Total friction of entering and immediately exiting a position, in basis
 * points. This is what a holder actually pays to round-trip, and it is the
 * number that reveals a thin market.
 */
export function roundTripCostBps(entryPrice: number, exitPrice: number): number {
  if (entryPrice <= 0 || exitPrice <= 0) throw new RangeError("prices must be positive");
  const mid = (entryPrice + exitPrice) / 2;
  return ((entryPrice - exitPrice) / mid) * 10_000;
}

export function classifyTier(priceImpact: number): LiquidityTier {
  if (!Number.isFinite(priceImpact) || priceImpact < 0) return "unroutable";
  if (priceImpact <= TIER_THRESHOLDS.deep) return "deep";
  if (priceImpact <= TIER_THRESHOLDS.usable) return "usable";
  if (priceImpact <= TIER_THRESHOLDS.thin) return "thin";
  return "trap";
}

export function analyzeSize(sizeUsd: number, priceImpact: number): SizeAnalysis {
  if (sizeUsd <= 0) throw new RangeError("size must be positive");
  const tier = classifyTier(priceImpact);
  return {
    sizeUsd,
    tier,
    priceImpact,
    costUsd: tier === "unroutable" ? 0 : sizeUsd * priceImpact,
  };
}

/**
 * Largest probed order size that still executes within the given impact
 * budget. Probes need not be sorted. Returns 0 when no probe qualifies, which
 * means the wrapper is not safely tradable at any size we measured.
 */
export function maxSafeSize(
  probes: readonly SizeAnalysis[],
  maxImpact: number = TIER_THRESHOLDS.usable,
): number {
  let best = 0;
  for (const p of probes) {
    if (p.tier === "unroutable") continue;
    if (p.priceImpact <= maxImpact && p.sizeUsd > best) best = p.sizeUsd;
  }
  return best;
}

/**
 * Plain-language verdict for a wrapper at a specific order size. Text is data,
 * not markup, so it can be asserted in tests.
 */
export function verdict(a: SizeAnalysis): string {
  const size = `$${a.sizeUsd.toLocaleString("en-US")}`;
  const cost = `$${a.costUsd.toFixed(2)}`;
  const pct = `${(a.priceImpact * 100).toFixed(2)}%`;
  switch (a.tier) {
    case "unroutable":
      return `No route. You cannot buy ${size} of this token on-chain.`;
    case "trap":
      return `Buying ${size} costs you ${cost} immediately (${pct} lost on entry). Selling will cost you again.`;
    case "thin":
      return `Thin market. Buying ${size} costs ${cost} in slippage (${pct}).`;
    case "usable":
      return `Tradable. Buying ${size} costs about ${cost} in slippage (${pct}).`;
    case "deep":
      return `Deep liquidity. ${size} executes with negligible slippage (${pct}).`;
  }
}
