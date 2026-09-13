/**
 * Appends one liquidity snapshot per run to data/snapshots/.
 *
 * This is the project's evidence layer: a continuous, git-timestamped record
 * of how tradable each wrapper actually is. Read-only, no wallet, no funds.
 */
import { appendFile, mkdir } from "node:fs/promises";
import { analyzeSize, toRawAmount } from "@/core/liquidity";
import type { LiquidityTier } from "@/core/liquidity";
import { registry } from "@/registry/schema";
import { USDC_DECIMALS, USDC_MINT, fetchQuote } from "@/adapters/jupiter";

const SIZES_USD = [1_000, 10_000, 100_000];
const THROTTLE_MS = 1_500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface RoutableProbe {
  sizeUsd: number;
  routable: true;
  priceImpact: number;
  tier: LiquidityTier;
  costUsd: number;
  outAmount: string;
}

interface FailedProbe {
  sizeUsd: number;
  routable: false;
  kind: "no_route" | "api_error";
  message: string;
}

type Probe = RoutableProbe | FailedProbe;

interface WrapperSnapshot {
  symbol: string;
  ticker: string;
  mint: string;
  issuer: string;
  probes: Probe[];
}

async function main() {
  const capturedAt = new Date().toISOString();
  const wrappers: WrapperSnapshot[] = [];

  for (const w of registry.wrappers) {
    const snap: WrapperSnapshot = {
      symbol: w.symbol,
      ticker: w.ticker,
      mint: w.mint,
      issuer: w.issuer,
      probes: [],
    };

    for (const sizeUsd of SIZES_USD) {
      const result = await fetchQuote(USDC_MINT, w.mint, toRawAmount(sizeUsd, USDC_DECIMALS));
      await sleep(THROTTLE_MS);

      if (!result.ok) {
        snap.probes.push({
          sizeUsd,
          routable: false,
          kind: result.failure.kind,
          message: result.failure.message,
        });
        continue;
      }

      const a = analyzeSize(sizeUsd, result.quote.priceImpact);
      snap.probes.push({
        sizeUsd,
        routable: true,
        priceImpact: a.priceImpact,
        tier: a.tier,
        costUsd: a.costUsd,
        outAmount: result.quote.outAmount.toString(),
      });
    }

    wrappers.push(snap);
    process.stderr.write(`${w.symbol} `);
  }

  const line = JSON.stringify({ capturedAt, registryVersion: registry.version, wrappers });
  const day = capturedAt.slice(0, 10);
  await mkdir("data/snapshots", { recursive: true });
  await appendFile(`data/snapshots/${day}.jsonl`, line + "\n");

  const traps = wrappers.flatMap((w) =>
    w.probes
      .filter((p): p is RoutableProbe => p.routable && p.tier === "trap")
      .map((p) => `${w.symbol}@$${p.sizeUsd}`),
  );
  const unroutable = wrappers.filter((w) =>
    w.probes.every((p) => !p.routable && p.kind === "no_route"),
  ).length;

  console.log(`\nsnapshot ${capturedAt}`);
  console.log(`wrappers: ${wrappers.length} | fully unroutable: ${unroutable} | traps: ${traps.length}`);
  if (traps.length) console.log(`traps: ${traps.join(", ")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
