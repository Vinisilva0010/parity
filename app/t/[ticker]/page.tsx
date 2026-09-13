import { notFound } from "next/navigation";
import { CostBar } from "../../_components/CostBar";
import { SiteFooter } from "../../_components/SiteFooter";
import { SiteHeader } from "../../_components/SiteHeader";
import { TickerSearch } from "../../_components/TickerSearch";
import { WrapperRow } from "../../_components/WrapperRow";
import { getTickerAnalysis } from "@/adapters/live";

export const revalidate = 30;

function formatCaptured(iso: string): string {
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

export default async function TickerPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const analysis = await getTickerAnalysis(ticker);
  if (analysis.verdicts.length === 0) notFound();

  return (
    <>
      <SiteHeader />

      <main className="mx-auto max-w-4xl px-6">
        <section className="pb-12">
          <p className="text-lg font-medium text-ink/60">{analysis.ticker}</p>
          <h1 className="mt-1 text-4xl sm:text-6xl font-black leading-[0.95] tracking-tight max-w-[20ch]">
            {analysis.headline}
          </h1>
        </section>

        {analysis.worstCost ? (
          <section className="py-12 border-t-2 border-ink">
            <h2 className="mb-8 text-2xl font-bold tracking-tight max-w-[40ch]">
              What a $1,000 order in {analysis.worstCost.symbol} actually does
            </h2>
            <CostBar
              sizeUsd={analysis.worstCost.sizeUsd}
              costUsd={analysis.worstCost.costUsd}
            />
          </section>
        ) : null}

        <section className="py-12 border-t-2 border-ink">
          <h2 className="text-2xl font-bold tracking-tight">
            {analysis.verdicts.length} tokens claim to be {analysis.ticker}
          </h2>
          <ul className="mt-6">
            {analysis.verdicts.map((v, i) => (
              <WrapperRow
                key={`${v.symbol}-${i}`}
                symbol={v.symbol}
                issuer={v.issuerName}
                severity={v.severity}
                tradability={v.tradability}
                custody={v.custody}
              />
            ))}
          </ul>
          <p className="mt-8 text-ink/55">
            Measured on Solana mainnet at {formatCaptured(analysis.capturedAt)}.
          </p>
        </section>

        <section className="py-12 border-t-2 border-ink max-w-2xl">
          <TickerSearch />
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
