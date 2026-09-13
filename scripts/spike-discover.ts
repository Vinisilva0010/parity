/**
 * Phase 0 spike: discover tokenized-stock wrappers per ticker and measure
 * cross-wrapper execution spread at several order sizes.
 * Throwaway discovery script. The production pricing engine lives in src/core.
 */
const BASE = process.env.JUPITER_BASE_URL ?? "https://lite-api.jup.ag";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDC_DECIMALS = 6;

const TICKERS = [
  "NVDA", "TSLA", "AAPL", "MSFT", "META", "GOOGL", "AMZN",
  "SPY", "QQQ", "COIN", "MSTR", "AMD", "SPCX", "CRCL", "SECZ",
];
const SIZES = [1_000, 10_000, 100_000];

type SearchItem = {
  id: string; symbol: string; name: string;
  decimals: number; tokenProgram?: string;
};

type Candidate = {
  ticker: string; symbol: string; mint: string;
  decimals: number; issuer: string; tokenProgram: string;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const THROTTLE_MS = 1800;
const MAX_IMPACT = 0.02; // 2% — above this the quote is not a real price

async function getJson(url: string, attempt = 0): Promise<any> {
  const res = await fetch(url, { signal: AbortSignal.timeout(25_000) });
  const text = await res.text();
  if (res.status === 429 || text.startsWith("Rate limit")) {
    if (attempt >= 4) throw new Error("rate limited after retries");
    const backoff = 2_000 * 2 ** attempt;
    console.error(`  rate limited, backing off ${backoff}ms`);
    await sleep(backoff);
    return getJson(url, attempt + 1);
  }
  try { return JSON.parse(text); }
  catch { throw new Error(`non-JSON response (${res.status}): ${text.slice(0, 120)}`); }
}

function classifyIssuer(mint: string, symbol: string, ticker: string): string | null {
  if (mint.endsWith("ondo")) return "ondo_gm";
  if (mint.startsWith("Xs")) return "backed_xstocks";
  if (symbol.toUpperCase() === ticker && mint.startsWith(ticker)) {
    return "backpack_securities";
  }
  return null;
}

async function discover(ticker: string): Promise<Candidate[]> {
  const items = (await getJson(
    `${BASE}/tokens/v2/search?query=${ticker}`,
  )) as SearchItem[];
  if (!Array.isArray(items)) return [];

  const out: Candidate[] = [];
  for (const it of items) {
    if (!it?.id || !it?.symbol) continue;
    if (it.id.endsWith("pump")) continue;
    const issuer = classifyIssuer(it.id, it.symbol, ticker);
    if (!issuer) continue;
    const s = it.symbol.toUpperCase();
    if (s !== ticker && s !== `${ticker}X` && s !== `${ticker}ON`) continue;
    out.push({
      ticker, symbol: it.symbol, mint: it.id,
      decimals: it.decimals, issuer,
      tokenProgram: it.tokenProgram ?? "unknown",
    });
  }
  return out;
}

async function quote(inputMint: string, outputMint: string, amountRaw: bigint) {
  const url = `${BASE}/swap/v1/quote?inputMint=${inputMint}`
    + `&outputMint=${outputMint}&amount=${amountRaw}&slippageBps=100`;
  try {
    const j = await getJson(url);
    if (typeof j?.outAmount === "string") {
      return {
        ok: true as const,
        outAmount: BigInt(j.outAmount),
        impactPct: Number(j.priceImpactPct ?? 0),
      };
    }
    const err = String(j?.error ?? j?.errorCode ?? "unknown");
    const noRoute = /no route|not tradable|could not find any route/i.test(err);
    return { ok: false as const, error: err, kind: noRoute ? "no_route" as const : "api_error" as const };
  } catch (e) {
    return { ok: false as const, error: `request failed: ${(e as Error).message}`, kind: "api_error" as const };
  }
}

function toRaw(amount: number, decimals: number): bigint {
  return BigInt(Math.round(amount * 10 ** decimals));
}

function fromRaw(raw: bigint, decimals: number): number {
  return Number(raw) / 10 ** decimals;
}

async function main() {
  const report: any = { generatedAt: new Date().toISOString(), base: BASE, tickers: {} };

  for (const ticker of TICKERS) {
    const candidates = await discover(ticker);
    await sleep(THROTTLE_MS);

    const rows: any[] = [];
    for (const c of candidates) {
      const row: any = { ...c, sizes: {} };
      for (const size of SIZES) {
        const q = await quote(USDC, c.mint, toRaw(size, USDC_DECIMALS));
        await sleep(THROTTLE_MS);
        if (!q.ok) { row.sizes[size] = { routable: false, error: q.error, kind: q.kind }; continue; }
        const tokens = fromRaw(q.outAmount, c.decimals);
        const entryPrice = size / tokens;

        let exitPrice: number | null = null;
        if (size === SIZES[0]) {
          const back = await quote(c.mint, USDC, q.outAmount);
          await sleep(THROTTLE_MS);
          if (back.ok) exitPrice = fromRaw(back.outAmount, USDC_DECIMALS) / tokens;
        }
        row.sizes[size] = {
          routable: true, entryPrice, exitPrice,
          impactPct: q.impactPct, tokens,
          meaningful: q.impactPct <= MAX_IMPACT,
        };
      }
      rows.push(row);
    }
    report.tickers[ticker] = rows;

    console.log(`\n=== ${ticker} ===`);
    if (rows.length === 0) { console.log("  no wrappers found"); continue; }
    for (const r of rows) {
      const parts = SIZES.map((s) => {
        const d = r.sizes[s];
        if (!d?.routable) return `$${s / 1000}k:${d?.kind === "no_route" ? "NO-ROUTE" : "API-FAIL"}`;
        if (!d.meaningful) return `$${s / 1000}k:ILLIQUID(${(d.impactPct * 100).toFixed(1)}%)`;
        return `$${s / 1000}k:${d.entryPrice.toFixed(4)}(${(d.impactPct * 100).toFixed(3)}%)`;
      });
      console.log(`  ${r.symbol.padEnd(8)} ${r.issuer.padEnd(21)} d=${r.decimals}  ${parts.join("  ")}`);
    }
    for (const size of SIZES) {
      const prices = rows
        .filter((r) => r.sizes[size]?.routable && r.sizes[size]?.meaningful)
        .map((r) => ({ sym: r.symbol, p: r.sizes[size].entryPrice as number }));
      if (prices.length < 2) continue;
      prices.sort((a, b) => a.p - b.p);
      const lo = prices[0]!, hi = prices[prices.length - 1]!;
      const bps = ((hi.p - lo.p) / lo.p) * 10_000;
      const savings = (hi.p - lo.p) * (size / lo.p);
      console.log(
        `  >> $${size / 1000}k spread ${bps.toFixed(1)} bps `
        + `| best ${lo.sym} worst ${hi.sym} | savings $${savings.toFixed(2)}`,
      );
    }
  }

  const withTwo = Object.entries(report.tickers).filter(
    ([, rows]: any) => rows.filter((r: any) => r.sizes[SIZES[0]!]?.routable && r.sizes[SIZES[0]!]?.meaningful).length >= 2,
  );
  console.log(`\n================ GATE ================`);
  console.log(`tickers with >=2 routable wrappers at $1k: ${withTwo.length} / ${TICKERS.length}`);
  console.log(`required by spec: >= 8`);

  const path = `data/spike/discover-${Date.now()}.json`;
  await (await import("node:fs/promises")).writeFile(path, JSON.stringify(report, null, 2));
  console.log(`raw report: ${path}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
