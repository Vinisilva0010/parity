import { describe, expect, it } from "vitest";
import { analyzeCustody, type MintPowers } from "@/core/custody";
import {
  headlineFor,
  severityFor,
  verdictFor,
  type WrapperMeasurement,
} from "@/core/verdict";

const powers = (over: Partial<MintPowers> = {}): MintPowers => ({
  freezeAuthority: null,
  permanentDelegate: null,
  transferHookProgram: null,
  defaultAccountStateFrozen: false,
  mintAuthority: null,
  isToken2022: true,
  ...over,
});

const m = (over: Partial<WrapperMeasurement> = {}): WrapperMeasurement => ({
  symbol: "NVDAx",
  issuerName: "Backed Finance",
  bestTier: "deep",
  maxSafeSizeUsd: 100_000,
  referenceCostUsd: 0.37,
  routable: true,
  custody: analyzeCustody(powers()),
  ...over,
});

describe("severity", () => {
  it("stops on an unroutable token", () => {
    expect(severityFor(m({ routable: false, bestTier: undefined }))).toBe("stop");
  });

  it("stops on a trap even when custody is clean", () => {
    expect(severityFor(m({ bestTier: "trap" }))).toBe("stop");
  });

  it("stops on a legacy token program even when liquidity looks fine", () => {
    const custody = analyzeCustody(powers({ isToken2022: false }));
    expect(severityFor(m({ bestTier: "deep", custody }))).toBe("stop");
  });

  it("cautions on a thin market", () => {
    expect(severityFor(m({ bestTier: "thin" }))).toBe("caution");
  });

  it("clears a deep market even when the issuer can seize", () => {
    const custody = analyzeCustody(powers({ permanentDelegate: "A", freezeAuthority: "B" }));
    expect(severityFor(m({ custody }))).toBe("clear");
  });
});

describe("sentences", () => {
  it("states the trap cost in dollars", () => {
    const v = verdictFor(m({ bestTier: "trap", referenceCostUsd: 132 }));
    expect(v.tradability).toContain("$132");
    expect(v.tradability).toContain("selling costs you again");
  });

  it("never promises tradability when there is no route", () => {
    const v = verdictFor(m({ routable: false, bestTier: undefined }));
    expect(v.tradability).toContain("No route");
    expect(v.tradability).not.toContain("Tradable");
  });

  it("names the issuer in the custody sentence", () => {
    const custody = analyzeCustody(powers({ permanentDelegate: "A", freezeAuthority: "B" }));
    const v = verdictFor(m({ custody }));
    expect(v.custody).toContain("Backed Finance");
    expect(v.custody).toContain("without your signature");
  });

  it("separates freeze from seizure", () => {
    const frozen = analyzeCustody(powers({ freezeAuthority: "B" }));
    const v = verdictFor(m({ custody: frozen }));
    expect(v.custody).toContain("freeze");
    expect(v.custody).not.toContain("without your signature");
  });

  it("calls out the legacy token program", () => {
    const custody = analyzeCustody(powers({ isToken2022: false }));
    expect(verdictFor(m({ custody })).custody).toContain("legacy token program");
  });

  it("always produces a non-empty sentence for every tier", () => {
    const tiers = ["deep", "usable", "thin", "trap"] as const;
    for (const bestTier of tiers) {
      const v = verdictFor(m({ bestTier }));
      expect(v.tradability.length).toBeGreaterThan(20);
      expect(v.custody.length).toBeGreaterThan(20);
    }
  });
});

describe("headline", () => {
  const ok = verdictFor(m({ symbol: "NVDAx" }));
  const bad = verdictFor(m({ symbol: "NVDAon", routable: false, bestTier: undefined }));

  it("warns off the ticker when nothing is safe", () => {
    expect(headlineFor("AMD", [bad, bad])).toContain("Do not buy AMD");
  });

  it("names the single survivor", () => {
    const h = headlineFor("NVDA", [ok, bad]);
    expect(h).toContain("NVDAx");
    expect(h).toContain("only");
  });

  it("counts when several are safe", () => {
    expect(headlineFor("SPY", [ok, ok, bad])).toContain("2 of the 3");
  });

  it("handles a ticker we do not track", () => {
    expect(headlineFor("XYZ", [])).toContain("do not track");
  });
});
