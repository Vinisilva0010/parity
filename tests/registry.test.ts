import { describe, expect, it } from "vitest";
import {
  allTickers,
  findByMint,
  isAllowlisted,
  isKnownImpostor,
  registry,
  wrappersFor,
} from "@/registry/schema";

describe("registry", () => {
  it("parses and is non-empty", () => {
    expect(registry.wrappers.length).toBeGreaterThan(20);
    expect(registry.impostors.length).toBeGreaterThan(0);
  });

  it("has no duplicate mints", () => {
    const mints = registry.wrappers.map((w) => w.mint);
    expect(new Set(mints).size).toBe(mints.length);
  });

  it("never lists a mint as both legitimate and impostor", () => {
    for (const imp of registry.impostors) {
      expect(isAllowlisted(imp.mint)).toBe(false);
    }
  });

  it("references only declared issuers", () => {
    for (const w of registry.wrappers) {
      expect(registry.issuers[w.issuer]).toBeDefined();
    }
  });

  it("resolves a known mint", () => {
    const w = findByMint("Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh");
    expect(w?.symbol).toBe("NVDAx");
    expect(w?.decimals).toBe(8);
  });

  it("rejects an unknown mint", () => {
    expect(isAllowlisted("So11111111111111111111111111111111111111112")).toBe(false);
    expect(findByMint("nope")).toBeUndefined();
  });

  it("flags the fake META mints", () => {
    expect(isKnownImpostor("METADDFL6wWMWEoKTFJwcThTbUmtarRJZjRpzUvkxhr")).toBe(true);
    expect(isKnownImpostor("METAwkXcqyXKy1AtsSgJ8JiUHwGCafnZL38n3vYmeta")).toBe(true);
  });

  it("groups wrappers by ticker, case-insensitively", () => {
    expect(wrappersFor("nvda").map((w) => w.symbol).sort()).toEqual(["NVDAon", "NVDAx"]);
    expect(wrappersFor("NOPE")).toHaveLength(0);
  });

  it("exposes every ticker", () => {
    expect(allTickers()).toContain("NVDA");
    expect(allTickers()).toContain("SPCX");
  });
});
