import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  analyzeSize,
  classifyTier,
  effectivePrice,
  maxSafeSize,
  roundTripCostBps,
  toRawAmount,
  toUiAmount,
  verdict,
} from "@/core/liquidity";

describe("decimal conversion", () => {
  it("converts across the decimal sets used by real issuers", () => {
    expect(toUiAmount(462_715_049n, 8)).toBeCloseTo(4.62715049, 10);   // xStocks
    expect(toUiAmount(1_000_000_000n, 9)).toBe(1);                      // Ondo
    expect(toUiAmount(6_696_395n, 6)).toBeCloseTo(6.696395, 10);        // Backpack
  });

  it("round-trips ui -> raw -> ui", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.000001, max: 1e6, noNaN: true }),
        fc.integer({ min: 6, max: 9 }),
        (ui, decimals) => {
          const back = toUiAmount(toRawAmount(ui, decimals), decimals);
          expect(back).toBeCloseTo(ui, decimals - 6);
        },
      ),
    );
  });

  it("keeps precision on large balances", () => {
    // 10 million tokens at 9 decimals overflows a naive float conversion
    expect(toUiAmount(10_000_000_000_000_000n, 9)).toBe(10_000_000);
  });

  it("rejects invalid inputs", () => {
    expect(() => toUiAmount(1n, 99)).toThrow(RangeError);
    expect(() => toUiAmount(-1n, 6)).toThrow(RangeError);
    expect(() => toRawAmount(-1, 6)).toThrow(RangeError);
    expect(() => toRawAmount(Number.NaN, 6)).toThrow(RangeError);
  });
});

describe("effectivePrice", () => {
  it("reproduces a measured NVDAx quote", () => {
    // 1000 USDC (6dp) -> 4.62715049 NVDAx (8dp), captured on mainnet.
    // Tolerance is loose because the underlying equity price moves between
    // captures; this asserts the arithmetic, not a specific market instant.
    const price = effectivePrice(
      { inAmount: 1_000_000_000n, outAmount: 462_715_049n, priceImpact: 0.00037 },
      6,
      8,
    );
    expect(price).toBeCloseTo(216.12, 1);
  });

  it("is independent of the decimals used to express the same trade", () => {
    const a = effectivePrice({ inAmount: 1_000_000_000n, outAmount: 100_000_000n, priceImpact: 0 }, 6, 8);
    const b = effectivePrice({ inAmount: 1_000_000_000n, outAmount: 1_000_000_000n, priceImpact: 0 }, 6, 9);
    expect(a).toBeCloseTo(b, 10);
  });

  it("throws on a zero-output quote rather than returning Infinity", () => {
    expect(() => effectivePrice({ inAmount: 1n, outAmount: 0n, priceImpact: 0 }, 6, 8)).toThrow();
  });
});

describe("roundTripCostBps", () => {
  it("is zero for a frictionless round trip", () => {
    expect(roundTripCostBps(100, 100)).toBe(0);
  });

  it("is positive whenever exit is worse than entry", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 10_000, noNaN: true }),
        fc.double({ min: 0.0001, max: 0.5, noNaN: true }),
        (entry, spread) => {
          const exit = entry * (1 - spread);
          expect(roundTripCostBps(entry, exit)).toBeGreaterThan(0);
        },
      ),
    );
  });

  it("rejects non-positive prices", () => {
    expect(() => roundTripCostBps(0, 100)).toThrow(RangeError);
  });
});

describe("classifyTier", () => {
  it("maps measured mainnet impacts to the right tier", () => {
    expect(classifyTier(0.0000)).toBe("deep");     // SPYx $1k
    expect(classifyTier(0.00037)).toBe("deep");    // NVDAx $1k
    expect(classifyTier(0.0046)).toBe("usable");   // GOOGLx $1k
    expect(classifyTier(0.0191)).toBe("thin");     // METAx $100k
    expect(classifyTier(0.132)).toBe("trap");      // AMDx $1k
    expect(classifyTier(0.785)).toBe("trap");      // QQQon $1k
  });

  it("is monotonic: worse impact never yields a better tier", () => {
    const rank = { deep: 0, usable: 1, thin: 2, trap: 3, unroutable: 4 } as const;
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (a, b) => {
          const [lo, hi] = a <= b ? [a, b] : [b, a];
          expect(rank[classifyTier(lo)]).toBeLessThanOrEqual(rank[classifyTier(hi)]);
        },
      ),
    );
  });

  it("treats malformed impact as unroutable", () => {
    expect(classifyTier(Number.NaN)).toBe("unroutable");
    expect(classifyTier(-1)).toBe("unroutable");
  });
});

describe("analyzeSize and maxSafeSize", () => {
  it("computes the dollar cost of slippage", () => {
    const a = analyzeSize(1_000, 0.132); // AMDx at $1k
    expect(a.tier).toBe("trap");
    expect(a.costUsd).toBeCloseTo(132, 6);
  });

  it("never reports a negative cost", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 1e6, noNaN: true }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (size, impact) => {
          expect(analyzeSize(size, impact).costUsd).toBeGreaterThanOrEqual(0);
        },
      ),
    );
  });

  it("finds the largest size within the impact budget", () => {
    const probes = [
      analyzeSize(1_000, 0.0001),
      analyzeSize(10_000, 0.0004),
      analyzeSize(100_000, 0.0349),
    ];
    expect(maxSafeSize(probes)).toBe(10_000);
  });

  it("returns zero when nothing is safe", () => {
    expect(maxSafeSize([analyzeSize(1_000, 0.132)])).toBe(0);
    expect(maxSafeSize([])).toBe(0);
  });

  it("ignores probe ordering", () => {
    const probes = [analyzeSize(100_000, 0.9), analyzeSize(1_000, 0.001)];
    expect(maxSafeSize(probes)).toBe(1_000);
  });
});

describe("verdict", () => {
  it("warns in dollars, not percentages, for a trap", () => {
    const text = verdict(analyzeSize(1_000, 0.132));
    expect(text).toContain("$132.00");
    expect(text).toContain("13.20%");
  });

  it("reassures on deep liquidity", () => {
    expect(verdict(analyzeSize(1_000, 0.00005))).toContain("Deep liquidity");
  });
});
