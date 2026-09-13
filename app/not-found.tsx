import { SiteFooter } from "./_components/SiteFooter";
import { SiteHeader } from "./_components/SiteHeader";
import { TickerSearch } from "./_components/TickerSearch";
import { allTickers } from "@/registry/schema";

export default function NotFound() {
  const tickers = allTickers();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6">
        <h1 className="text-4xl sm:text-5xl font-black leading-[0.95] tracking-tight max-w-[22ch]">
          We do not track that stock yet.
        </h1>
        <p className="mt-5 text-xl leading-snug max-w-[58ch]">
          Parity only reports on tokens we have verified against their issuer,
          because pointing you at an unverified mint is the exact problem we
          exist to solve.
        </p>

        <div className="mt-12 max-w-2xl">
          <TickerSearch autoFocus />
        </div>

        <section className="mt-14">
          <h2 className="text-xl font-bold tracking-tight">
            The {tickers.length} stocks we cover
          </h2>
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-lg">
            {tickers.map((t) => (
              <li key={t}>
                <a href={`/t/${t}`} className="font-bold hover:text-signal">
                  {t}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
