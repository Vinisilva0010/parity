import { notFound } from "next/navigation";
import { CostBar } from "../../_components/CostBar";
import { SiteFooter } from "../../_components/SiteFooter";
import { SiteHeader } from "../../_components/SiteHeader";
import { TickerSearch } from "../../_components/TickerSearch";
import { WrapperRow } from "../../_components/WrapperRow";
import { FIXTURES } from "../fixtures";

export default async function TickerPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const view = FIXTURES[ticker.toUpperCase()];
  if (!view) notFound();

  return (
    <>
      <SiteHeader />

      <main className="mx-auto max-w-4xl px-6">
        <section className="pb-12">
          <p className="text-lg font-medium text-ink/60">{view.company}</p>
          <h1 className="mt-1 text-4xl sm:text-6xl font-black leading-[0.95] tracking-tight max-w-[20ch]">
            {view.headline}
          </h1>
        </section>

        {view.cost ? (
          <section className="py-12 border-t-2 border-ink">
            <h2 className="mb-8 text-2xl font-bold tracking-tight max-w-[40ch]">
              What a $1,000 order in {view.cost.symbol} actually does
            </h2>
            <CostBar sizeUsd={view.cost.sizeUsd} costUsd={view.cost.costUsd} />
          </section>
        ) : null}

        <section className="py-12 border-t-2 border-ink">
          <h2 className="text-2xl font-bold tracking-tight">
            {view.tokens.length} tokens claim to be {view.ticker}
          </h2>
          <ul className="mt-6">
            {view.tokens.map((t, i) => (
              <WrapperRow key={`${t.symbol}-${i}`} {...t} />
            ))}
          </ul>
        </section>

        <section className="py-12 border-t-2 border-ink max-w-2xl">
          <TickerSearch />
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
