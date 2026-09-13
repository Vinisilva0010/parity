import { describe, expect, it } from "vitest";
import { analyzeCustody, headline, type MintPowers } from "@/core/custody";

const base: MintPowers = {
  freezeAuthority: null,
  permanentDelegate: null,
  transferHookProgram: null,
  defaultAccountStateFrozen: false,
  mintAuthority: null,
  isToken2022: true,
};

describe("analyzeCustody", () => {
  it("reports self-custody when the issuer kept no powers", () => {
    const r = analyzeCustody(base);
    expect(r.level).toBe("self_custody");
    expect(r.findings).toHaveLength(0);
    expect(r.summary).toContain("they are yours");
  });

  it("treats clawback as the most severe outcome", () => {
    const r = analyzeCustody({ ...base, permanentDelegate: "Auth111" });
    expect(r.level).toBe("issuer_seizable");
    expect(headline(r)?.label).toBe("Clawback enabled");
    expect(headline(r)?.authority).toBe("Auth111");
  });

  it("treats freeze authority as control, not seizure", () => {
    const r = analyzeCustody({ ...base, freezeAuthority: "Auth222" });
    expect(r.level).toBe("issuer_controlled");
  });

  it("ranks clawback above freeze when both are present", () => {
    const r = analyzeCustody({
      ...base,
      permanentDelegate: "Auth111",
      freezeAuthority: "Auth222",
    });
    expect(r.level).toBe("issuer_seizable");
    expect(r.findings[0]?.label).toBe("Clawback enabled");
  });

  it("flags a legacy token program as critical", () => {
    const r = analyzeCustody({ ...base, isToken2022: false });
    expect(r.findings.some((f) => f.label === "Legacy token program")).toBe(true);
    expect(headline(r)?.severity).toBe("critical");
  });

  it("does not treat mint authority as a threat on its own", () => {
    const r = analyzeCustody({ ...base, mintAuthority: "Auth333" });
    expect(r.level).toBe("self_custody");
    expect(r.findings[0]?.severity).toBe("info");
  });

  it("never returns an empty summary", () => {
    for (const powers of [
      base,
      { ...base, freezeAuthority: "A" },
      { ...base, permanentDelegate: "A" },
      { ...base, isToken2022: false },
    ]) {
      expect(analyzeCustody(powers).summary.length).toBeGreaterThan(20);
    }
  });
});
