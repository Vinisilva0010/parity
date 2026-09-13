import { describe, expect, it, vi } from "vitest";
import { analyzeTicker, type PowersFetcher, type QuoteFetcher } from "@/core/analyze";
import type { MintPowers } from "@/core/custody";

const XSTOCK: MintPowers = {
  freezeAuthority: "FreezeAuth",
  permanentDelegate: "Delegate",
  transferHookProgram: null,
  defaultAccountStateFrozen: false,
  mintAuthority: "MintAuth",
  isToken2022: true,
};

const ONDO: MintPowers = { ...XSTOCK, permanentDelegate: null };

/** Quotes keyed by mint suffix, mirroring what we measured on mainnet. */
function quoter(impacts: Record<string, number | null>): QuoteFetcher {
  return vi.fn(async (mint: string) => {
    const key = mint.endsWith("ondo") ? "ondo" : "x";
    const impact = impacts[key];
    if (impact === null || impact === undefined) return { sizeUsd: 0, routable: false };
    return { sizeUsd: 0, routable: true, priceImpact: impact };
  });
}

const powersFor: PowersFetcher = async (mint) =>
  mint.endsWith("ondo") ? ONDO : XSTOCK;

describe("analyzeTicker", () => {
  it("names the single tradable wrapper when the other has no route", async () => {
    const r = await analyzeTicker("NVDA", quoter({ x: 0.00037, ondo: null }), powersFor);

    expect(r.ticker).toBe("NVDA");
    expect(r.verdicts).toHaveLength(2);
    expect(r.headline).toContain("NVDAx");
    expect(r.headline).toContain("only");

    const nvdax = r.verdicts.find((v) => v.symbol === "NVDAx");
    expect(nvdax?.severity).toBe("clear");
    expect(nvdax?.custody).toContain("without your signature");

    const ondo = r.verdicts.find((v) => v.symbol === "NVDAon");
    expect(ondo?.severity).toBe("stop");
    expect(ondo?.tradability).toContain("No route");
  });

  it("warns off the whole ticker when every wrapper is unsafe", async () => {
    const r = await analyzeTicker("AMD", quoter({ x: 0.132, ondo: null }), powersFor);

    expect(r.headline).toContain("Do not buy AMD");
    expect(r.verdicts.every((v) => v.severity === "stop")).toBe(true);
  });

  it("surfaces the trap cost for the cost bar", async () => {
    const r = await analyzeTicker("AMD", quoter({ x: 0.132, ondo: null }), powersFor);

    expect(r.worstCost?.symbol).toBe("AMDx");
    expect(r.worstCost?.sizeUsd).toBe(1_000);
    expect(r.worstCost?.costUsd).toBeCloseTo(132, 6);
  });

  it("omits the cost bar when nothing is a trap", async () => {
    const r = await analyzeTicker("NVDA", quoter({ x: 0.0001, ondo: null }), powersFor);
    expect(r.worstCost).toBeUndefined();
  });

  it("returns an honest headline for a ticker we do not track", async () => {
    const r = await analyzeTicker("XYZ", quoter({}), powersFor);
    expect(r.verdicts).toHaveLength(0);
    expect(r.headline).toContain("do not track");
  });

  it("is case-insensitive", async () => {
    const r = await analyzeTicker("nvda", quoter({ x: 0.0001, ondo: null }), powersFor);
    expect(r.ticker).toBe("NVDA");
    expect(r.verdicts.length).toBeGreaterThan(0);
  });

  it("never calls the quote API for an unknown ticker", async () => {
    const quote = quoter({});
    await analyzeTicker("XYZ", quote, powersFor);
    expect(quote).not.toHaveBeenCalled();
  });

  it("still reports custody when liquidity cannot be measured", async () => {
    const r = await analyzeTicker("NVDA", quoter({ x: null, ondo: null }), powersFor);
    for (const v of r.verdicts) {
      expect(v.custody.length).toBeGreaterThan(20);
      expect(v.severity).toBe("stop");
    }
  });
});
