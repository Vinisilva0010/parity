import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { z } from "zod";

describe("toolchain smoke", () => {
  it("runs vitest", () => {
    expect(1 + 1).toBe(2);
  });

  it("runs fast-check property tests", () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => a + b === b + a),
    );
  });

  it("runs zod validation", () => {
    const schema = z.object({ mint: z.string().min(32) });
    expect(() => schema.parse({ mint: "too-short" })).toThrow();
  });
});
