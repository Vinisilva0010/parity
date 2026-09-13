import type { Severity } from "../_components/WrapperRow";

export interface TokenView {
  symbol: string;
  issuer: string;
  severity: Severity;
  tradability: string;
  custody: string;
}

export interface TickerView {
  ticker: string;
  company: string;
  headline: string;
  tokens: TokenView[];
  cost?: { symbol: string; sizeUsd: number; costUsd: number };
}

/** Captured from Solana mainnet on 2026-09-13. Replaced by live data next. */
export const FIXTURES: Record<string, TickerView> = {
  NVDA: {
    ticker: "NVDA",
    company: "NVIDIA Corporation",
    headline: "Buy NVDAx. It is the only NVDA token you can actually trade.",
    tokens: [
      {
        symbol: "NVDAx",
        issuer: "Backed Finance",
        severity: "clear",
        tradability: "Deep liquidity. A $1,000 order costs you about $0.37 in slippage.",
        custody: "Backed Finance can freeze your balance and can move these tokens out of your wallet without your signature.",
      },
      {
        symbol: "NVDAon",
        issuer: "Ondo Global Markets",
        severity: "stop",
        tradability: "No route. You cannot buy or sell this token on-chain at any size.",
        custody: "Ondo can freeze your balance.",
      },
    ],
  },
  AMD: {
    ticker: "AMD",
    company: "Advanced Micro Devices",
    headline: "Do not buy AMD on Solana today. Neither token is safe to hold.",
    cost: { symbol: "AMDx", sizeUsd: 1000, costUsd: 132 },
    tokens: [
      {
        symbol: "AMDx",
        issuer: "Backed Finance",
        severity: "stop",
        tradability: "A $1,000 order costs you $132 the moment it settles, and selling costs you again.",
        custody: "Backed Finance can freeze your balance and can move these tokens out of your wallet without your signature.",
      },
      {
        symbol: "AMDon",
        issuer: "Ondo Global Markets",
        severity: "stop",
        tradability: "No route. You cannot buy or sell this token on-chain at any size.",
        custody: "Ondo can freeze your balance.",
      },
    ],
  },
  META: {
    ticker: "META",
    company: "Meta Platforms",
    headline: "Four tokens claim to be META. Two of them are not.",
    tokens: [
      {
        symbol: "METAx",
        issuer: "Backed Finance",
        severity: "clear",
        tradability: "Tradable up to about $10,000. A $100,000 order loses 1.9% on entry.",
        custody: "Backed Finance can freeze your balance and can move these tokens out of your wallet without your signature.",
      },
      {
        symbol: "METAon",
        issuer: "Ondo Global Markets",
        severity: "stop",
        tradability: "No route. You cannot buy or sell this token on-chain at any size.",
        custody: "Ondo can freeze your balance.",
      },
      {
        symbol: "META",
        issuer: "Unknown issuer",
        severity: "stop",
        tradability: "Quotes near $4,890 while the real share trades near $645. This is not Meta Platforms stock.",
        custody: "Built on the legacy token program. No legitimate issuer of tokenized stock on Solana uses it.",
      },
      {
        symbol: "META",
        issuer: "Unknown issuer",
        severity: "stop",
        tradability: "Quotes near $4.88 while the real share trades near $645. This is not Meta Platforms stock.",
        custody: "Built on the legacy token program, with a vanity address made to look official.",
      },
    ],
  },
};
