/**
 * Minimal in-process TTL cache with request coalescing.
 *
 * Coalescing matters more than the cache itself: a page render asks for the
 * same mint several times, and concurrent visitors ask at the same moment.
 * Without it we multiply external calls and hit free-tier limits during the
 * one window where the site must stay up.
 */
interface Entry<T> {
  expiresAt: number;
  value: Promise<T>;
}

export class TtlCache<T> {
  private readonly entries = new Map<string, Entry<T>>();

  constructor(private readonly ttlMs: number) {}

  async get(key: string, load: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const hit = this.entries.get(key);
    if (hit && hit.expiresAt > now) return hit.value;

    const value = load().catch((err) => {
      // Never cache a failure: the next caller should retry.
      this.entries.delete(key);
      throw err;
    });

    this.entries.set(key, { expiresAt: now + this.ttlMs, value });
    return value;
  }

  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }
}
