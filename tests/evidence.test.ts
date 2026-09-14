import { describe, expect, it } from "vitest";
import { daysCovered, summarize, type Snapshot } from "@/core/evidence";

const snap = (capturedAt: string, wrappers: Snapshot["wrappers"]): Snapshot => ({
  capturedAt,
  wrappers,
});

const trap = (symbol: string, costUsd: number) => ({
  symbol,
  ticker: symbol.replace(/x$|on$/, ""),
  issuer: "backed_xstocks",
  probes: [{ sizeUsd: 1_000, routable: true, tier: "trap", costUsd }],
});

const deep = (symbol: string) => ({
  symbol,
  ticker: symbol.replace(/x$|on$/, ""),
  issuer: "backed_xstocks",
  probes: [{ sizeUsd: 1_000, routable: true, tier: "deep", costUsd: 0.4 }],
});

const dead = (symbol: string) => ({
  symbol,
  ticker: symbol.replace(/x$|on$/, ""),
  issuer: "ondo_gm",
  probes: [{ sizeUsd: 1_000, routable: false, kind: "no_route" }],
});

describe("summarize", () => {
  it("reports nothing rather than guessing on an empty series", () => {
    const s = summarize([]);
    expect(s.snapshots).toBe(0);
    expect(s.worst).toBeNull();
    expect(s.traps).toEqual([]);
    expect(daysCovered(s)).toBe(0);
  });

  it("counts snapshots and bounds the window", () => {
    const s = summarize([
      snap("2026-09-13T20:00:00Z", [deep("NVDAx")]),
      snap("2026-09-13T23:00:00Z", [deep("NVDAx")]),
    ]);
    expect(s.snapshots).toBe(2);
    expect(s.firstCapture).toBe("2026-09-13T20:00:00Z");
    expect(s.lastCapture).toBe("2026-09-13T23:00:00Z");
  });

  it("orders an out-of-order series before bounding it", () => {
    const s = summarize([
      snap("2026-09-14T06:00:00Z", [deep("NVDAx")]),
      snap("2026-09-13T20:00:00Z", [deep("NVDAx")]),
    ]);
    expect(s.firstCapture).toBe("2026-09-13T20:00:00Z");
    expect(s.lastCapture).toBe("2026-09-14T06:00:00Z");
  });

  it("lists only wrappers that were never routable once", () => {
    const s = summarize([
      snap("2026-09-13T20:00:00Z", [dead("NVDAon"), dead("QQQon")]),
      snap("2026-09-13T23:00:00Z", [dead("NVDAon"), deep("QQQon")]),
    ]);
    expect(s.alwaysUnroutable).toEqual(["NVDAon"]);
  });

  it("computes how often a wrapper was a trap", () => {
    const s = summarize([
      snap("2026-09-13T20:00:00Z", [trap("AMDx", 132)]),
      snap("2026-09-13T23:00:00Z", [deep("AMDx")]),
    ]);
    const amd = s.traps.find((t) => t.symbol === "AMDx");
    expect(amd?.observations).toBe(2);
    expect(amd?.trapRate).toBeCloseTo(0.5, 6);
    expect(amd?.worstCostUsd).toBeCloseTo(132, 6);
  });

  it("keeps the worst single observation with its timestamp", () => {
    const s = summarize([
      snap("2026-09-13T20:00:00Z", [trap("AMDx", 132)]),
      snap("2026-09-13T23:00:00Z", [trap("AMDx", 187)]),
    ]);
    expect(s.worst?.symbol).toBe("AMDx");
    expect(s.worst?.costUsd).toBeCloseTo(187, 6);
    expect(s.worst?.capturedAt).toBe("2026-09-13T23:00:00Z");
  });

  it("ranks traps by worst cost", () => {
    const s = summarize([
      snap("2026-09-13T20:00:00Z", [trap("AMDx", 132), trap("QQQon", 785)]),
    ]);
    expect(s.traps.map((t) => t.symbol)).toEqual(["QQQon", "AMDx"]);
  });

  it("never reports a trap for a wrapper that always routed cleanly", () => {
    const s = summarize([snap("2026-09-13T20:00:00Z", [deep("NVDAx")])]);
    expect(s.traps).toEqual([]);
    expect(s.worst).toBeNull();
  });

  it("counts days across a multi-day window", () => {
    const s = summarize([
      snap("2026-09-13T20:00:00Z", [deep("NVDAx")]),
      snap("2026-09-16T20:00:00Z", [deep("NVDAx")]),
    ]);
    expect(daysCovered(s)).toBe(3);
  });

  it("reports one day for a window shorter than a day", () => {
    const s = summarize([
      snap("2026-09-13T20:00:00Z", [deep("NVDAx")]),
      snap("2026-09-13T23:00:00Z", [deep("NVDAx")]),
    ]);
    expect(daysCovered(s)).toBe(1);
  });
});
