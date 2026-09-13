import { describe, expect, it, vi } from "vitest";
import { TtlCache } from "@/adapters/cache";

describe("TtlCache", () => {
  it("loads once and serves the cached value", async () => {
    const cache = new TtlCache<number>(60_000);
    const load = vi.fn(async () => 42);

    expect(await cache.get("k", load)).toBe(42);
    expect(await cache.get("k", load)).toBe(42);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("coalesces concurrent callers into one load", async () => {
    const cache = new TtlCache<number>(60_000);
    const load = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return 7;
    });

    const results = await Promise.all([
      cache.get("k", load),
      cache.get("k", load),
      cache.get("k", load),
    ]);

    expect(results).toEqual([7, 7, 7]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("reloads after the ttl expires", async () => {
    vi.useFakeTimers();
    const cache = new TtlCache<number>(1_000);
    const load = vi.fn(async () => 1);

    await cache.get("k", load);
    vi.advanceTimersByTime(1_001);
    await cache.get("k", load);

    expect(load).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("does not cache a failure", async () => {
    const cache = new TtlCache<number>(60_000);
    const load = vi
      .fn<() => Promise<number>>()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(5);

    await expect(cache.get("k", load)).rejects.toThrow("boom");
    expect(await cache.get("k", load)).toBe(5);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("keys entries independently", async () => {
    const cache = new TtlCache<string>(60_000);
    expect(await cache.get("a", async () => "A")).toBe("A");
    expect(await cache.get("b", async () => "B")).toBe("B");
    expect(cache.size).toBe(2);
  });
});
