/**
 * Reduces the snapshot history into the few figures worth publishing.
 *
 * The point of this series is verifiability: every row was committed to a
 * public repository at the time it was taken, so the claims below can be
 * checked against git history rather than trusted.
 */

export interface SnapshotProbe {
  sizeUsd: number;
  routable: boolean;
  tier?: string;
  costUsd?: number;
  kind?: string;
}

export interface SnapshotWrapper {
  symbol: string;
  ticker: string;
  issuer: string;
  probes: SnapshotProbe[];
}

export interface Snapshot {
  capturedAt: string;
  wrappers: SnapshotWrapper[];
}

export interface TrapSpell {
  symbol: string;
  /** Share of observations where a $1,000 order was a trap, 0..1. */
  trapRate: number;
  /** Worst dollar cost seen on a $1,000 order. */
  worstCostUsd: number;
  observations: number;
}

export interface EvidenceSummary {
  snapshots: number;
  firstCapture: string | null;
  lastCapture: string | null;
  /** Wrappers that were unroutable in every single snapshot. */
  alwaysUnroutable: string[];
  /** Wrappers that were a trap at $1,000 in at least one snapshot. */
  traps: TrapSpell[];
  /** Worst single observation across the whole series. */
  worst: { symbol: string; costUsd: number; capturedAt: string } | null;
}

const REFERENCE_SIZE = 1_000;

function referenceProbe(w: SnapshotWrapper): SnapshotProbe | undefined {
  return w.probes.find((p) => p.sizeUsd === REFERENCE_SIZE);
}

export function summarize(snapshots: readonly Snapshot[]): EvidenceSummary {
  if (snapshots.length === 0) {
    return {
      snapshots: 0,
      firstCapture: null,
      lastCapture: null,
      alwaysUnroutable: [],
      traps: [],
      worst: null,
    };
  }

  const sorted = [...snapshots].sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));

  const seen = new Map<string, { routableEver: boolean; trapCount: number; obs: number; worstCost: number }>();
  let worst: EvidenceSummary["worst"] = null;

  for (const snap of sorted) {
    for (const w of snap.wrappers) {
      const acc = seen.get(w.symbol) ?? { routableEver: false, trapCount: 0, obs: 0, worstCost: 0 };
      const probe = referenceProbe(w);
      acc.obs += 1;

      if (w.probes.some((p) => p.routable)) acc.routableEver = true;

      if (probe?.routable && probe.tier === "trap") {
        acc.trapCount += 1;
        const cost = probe.costUsd ?? 0;
        if (cost > acc.worstCost) acc.worstCost = cost;
        if (!worst || cost > worst.costUsd) {
          worst = { symbol: w.symbol, costUsd: cost, capturedAt: snap.capturedAt };
        }
      }

      seen.set(w.symbol, acc);
    }
  }

  const alwaysUnroutable = [...seen.entries()]
    .filter(([, a]) => !a.routableEver)
    .map(([symbol]) => symbol)
    .sort();

  const traps = [...seen.entries()]
    .filter(([, a]) => a.trapCount > 0)
    .map(([symbol, a]) => ({
      symbol,
      trapRate: a.trapCount / a.obs,
      worstCostUsd: a.worstCost,
      observations: a.obs,
    }))
    .sort((a, b) => b.worstCostUsd - a.worstCostUsd);

  return {
    snapshots: sorted.length,
    firstCapture: sorted[0]!.capturedAt,
    lastCapture: sorted[sorted.length - 1]!.capturedAt,
    alwaysUnroutable,
    traps,
    worst,
  };
}

/** Whole days spanned by the series, minimum 1. */
export function daysCovered(s: EvidenceSummary): number {
  if (!s.firstCapture || !s.lastCapture) return 0;
  const ms = Date.parse(s.lastCapture) - Date.parse(s.firstCapture);
  return Math.max(1, Math.ceil(ms / 86_400_000));
}
