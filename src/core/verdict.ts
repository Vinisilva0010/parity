/**
 * Turns measurements into sentences.
 *
 * Rule of the product: no number reaches the user without a sentence saying
 * what it means. This module is the only place that phrasing is decided.
 */
import type { LiquidityTier } from "./liquidity";
import type { CustodyReport } from "./custody";

export type Severity = "clear" | "caution" | "stop";

export interface WrapperMeasurement {
  symbol: string;
  issuerName: string;
  /** Undefined when no size could be routed. */
  bestTier?: LiquidityTier | undefined;
  /** Largest probed size that stayed within the usable impact budget. */
  maxSafeSizeUsd: number;
  /** Cost in USD of a reference $1,000 order, when routable. */
  referenceCostUsd?: number | undefined;
  routable: boolean;
  custody: CustodyReport;
}

export interface WrapperVerdict {
  symbol: string;
  issuerName: string;
  severity: Severity;
  tradability: string;
  custody: string;
}

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: n < 10 ? 2 : 0 });

export function tradabilitySentence(m: WrapperMeasurement): string {
  if (!m.routable) {
    return "No route. You cannot buy or sell this token on-chain at any size.";
  }
  const cost = m.referenceCostUsd ?? 0;
  switch (m.bestTier) {
    case "trap":
      return `A $1,000 order costs you ${money(cost)} the moment it settles, and selling costs you again.`;
    case "thin":
      return `Thin market. A $1,000 order costs you ${money(cost)} in slippage.`;
    case "usable":
      return m.maxSafeSizeUsd > 0
        ? `Tradable up to about ${money(m.maxSafeSizeUsd)}. A $1,000 order costs you ${money(cost)}.`
        : `Tradable, but a $1,000 order already costs you ${money(cost)}.`;
    case "deep":
      return `Deep liquidity. A $1,000 order costs you about ${money(cost)} in slippage.`;
    default:
      return "We could not measure this token right now.";
  }
}

export function custodySentence(m: WrapperMeasurement): string {
  const issuer = m.issuerName;
  switch (m.custody.level) {
    case "issuer_seizable":
      return `${issuer} can freeze your balance and can move these tokens out of your wallet without your signature.`;
    case "issuer_controlled":
      return `${issuer} can freeze your balance, blocking you from selling.`;
    case "self_custody":
      return m.custody.findings.some((f) => f.label === "Legacy token program")
        ? "Built on the legacy token program. No legitimate issuer of tokenized stock on Solana uses it."
        : "No issuer powers detected on this mint.";
  }
}

export function severityFor(m: WrapperMeasurement): Severity {
  if (!m.routable) return "stop";
  if (m.bestTier === "trap") return "stop";
  if (m.custody.findings.some((f) => f.label === "Legacy token program")) return "stop";
  if (m.bestTier === "thin") return "caution";
  return "clear";
}

export function verdictFor(m: WrapperMeasurement): WrapperVerdict {
  return {
    symbol: m.symbol,
    issuerName: m.issuerName,
    severity: severityFor(m),
    tradability: tradabilitySentence(m),
    custody: custodySentence(m),
  };
}

/** The one sentence at the top of a ticker page. */
export function headlineFor(ticker: string, verdicts: readonly WrapperVerdict[]): string {
  const usable = verdicts.filter((v) => v.severity !== "stop");
  if (verdicts.length === 0) return `We do not track any ${ticker} token yet.`;
  if (usable.length === 0) {
    return `Do not buy ${ticker} on Solana today. None of these tokens are safe to hold.`;
  }
  if (usable.length === 1 && verdicts.length > 1) {
    return `Buy ${usable[0]!.symbol}. It is the only ${ticker} token you can actually trade.`;
  }
  if (usable.length === 1) return `${usable[0]!.symbol} is the ${ticker} token to use.`;
  return `${usable.length} of the ${verdicts.length} ${ticker} tokens are safe to trade.`;
}
