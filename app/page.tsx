import { CostBar } from "./_components/CostBar";
import { Mark } from "./_components/Mark";
import { Faq } from "./_components/Faq";
import { SiteFooter } from "./_components/SiteFooter";
import { SiteHeader } from "./_components/SiteHeader";
import { TickerSearch } from "./_components/TickerSearch";

/** Figures captured from Solana mainnet. Wired to live data in the next step. */
const MEASURED = {
  trackedMints: 32,
  freezable: 30,
  seizable: 16,
  unroutable: 13,
  worstSymbol: "AMDx",
  worstSizeUsd: 1000,
  worstCostUsd: 132,
};

export default function Home() {
  return (
    <>
      <SiteHeader />

      <main className="mx-auto max-w-4xl px-6">
        <section className="pb-16 grid gap-12 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
          <div>
            <h1 className="text-5xl sm:text-7xl lg:text-6xl font-black leading-[0.92] tracking-tight max-w-[15ch]">
              That stock token might cost you 13% to buy.
            </h1>
            <p className="mt-6 text-xl leading-snug max-w-[58ch]">
              Apple, Nvidia and Tesla all trade on Solana now. Several companies
              issue a token for each one, and they are not equally safe to touch.
              Parity checks the one you are about to buy.
            </p>

            <div className="mt-12 max-w-2xl">
              <TickerSearch />
            </div>
          </div>

          <Mark aria-hidden className="hidden lg:block w-full h-auto text-signal/25" />
        </section>

        <section className="py-14 border-t-2 border-ink">
          <h2 className="text-3xl font-black tracking-tight max-w-[22ch]">
            {MEASURED.worstSymbol} is listed everywhere and looks normal.
          </h2>
          <p className="mt-4 mb-8 text-lg leading-snug max-w-[60ch]">
            Here is what a {MEASURED.worstSizeUsd.toLocaleString("en-US")} dollar
            order in it actually does, measured against live liquidity.
          </p>
          <CostBar
            sizeUsd={MEASURED.worstSizeUsd}
            costUsd={MEASURED.worstCostUsd}
          />
        </section>

        <section id="how" className="py-14 border-t-2 border-ink scroll-mt-8">
          <h2 className="text-3xl font-black tracking-tight">
            What Parity checks
          </h2>

          <div className="mt-10 grid gap-10 sm:grid-cols-3">
            <div>
              <p className="text-5xl font-black tracking-tight text-signal">
                {MEASURED.trackedMints}
              </p>
              <p className="mt-2 text-xl font-bold">Is it the real token?</p>
              <p className="mt-1 text-lg leading-snug text-ink/75">
                Searching a ticker returns real tokens next to impostors using
                the same name. We keep a verified list and say which is which.
              </p>
            </div>
            <div>
              <p className="text-5xl font-black tracking-tight text-signal">
                {MEASURED.unroutable}
              </p>
              <p className="mt-2 text-xl font-bold">Can you get out?</p>
              <p className="mt-1 text-lg leading-snug text-ink/75">
                Of the tokens we track, this many cannot be traded on-chain at
                all right now. We quote real order sizes and show the cost in
                dollars.
              </p>
            </div>
            <div>
              <p className="text-5xl font-black tracking-tight text-signal">
                {MEASURED.seizable}
              </p>
              <p className="mt-2 text-xl font-bold">Who controls it?</p>
              <p className="mt-1 text-lg leading-snug text-ink/75">
                This many can be moved out of your wallet by the issuer without
                your signature. {MEASURED.freezable} can be frozen.
              </p>
            </div>
          </div>
        </section>

        <section id="about" className="py-14 border-t-2 border-ink scroll-mt-8">
          <h2 className="text-3xl font-black tracking-tight">Why we built it</h2>
          <div className="mt-6 space-y-4 text-lg leading-snug max-w-[68ch]">
            <p>
              Tokenized stocks exist so that someone without a US brokerage
              account can still own a share of Nvidia. That is a real and useful
              thing, and most of the volume for it now settles on Solana.
            </p>
            <p>
              The problem is that every screen shows you a price and a buy
              button, and nothing else. It will not tell you that a token cannot
              be sold, that a pool is too thin to exit, or that the issuer kept
              the right to take the tokens back. All of that is public on-chain
              information that nobody puts in front of you.
            </p>
            <p>
              Parity puts it in front of you, in one sentence, before you spend
              anything.
            </p>
          </div>
        </section>

        <Faq />
      </main>

      <SiteFooter />
    </>
  );
}
