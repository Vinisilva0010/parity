import { SiteFooter } from "../_components/SiteFooter";
import { SiteHeader } from "../_components/SiteHeader";
import { daysCovered, summarize } from "@/core/evidence";
import { loadSnapshots } from "@/adapters/snapshots";

export const revalidate = 3600;

export const metadata = {
  title: "Evidence — Parity",
  description:
    "Every liquidity measurement Parity has taken, committed to a public repository as it was captured.",
};

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default async function EvidencePage() {
  const summary = summarize(await loadSnapshots());
  const days = daysCovered(summary);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6">
        <h1 className="text-4xl sm:text-6xl font-black leading-[0.95] tracking-tight max-w-[20ch]">
          We measure this every day and commit the result.
        </h1>
        <p className="mt-6 text-xl leading-snug max-w-[62ch]">
          Parity quotes every token it tracks at three order sizes on a schedule
          and writes the answer straight into its public repository. Nothing on
          this page is a claim you have to take on trust. Each figure came from a
          file that was committed at the moment it was measured.
        </p>

        {summary.snapshots === 0 ? (
          <p className="mt-14 text-xl">
            No measurements have been recorded yet.
          </p>
        ) : (
          <>
            <section className="mt-14 pt-10 border-t-2 border-ink grid gap-10 sm:grid-cols-3">
              <div>
                <p className="text-5xl font-black tracking-tight text-signal">
                  {summary.snapshots}
                </p>
                <p className="mt-2 text-lg">
                  measurements taken over {days} {days === 1 ? "day" : "days"}
                </p>
              </div>
              <div>
                <p className="text-5xl font-black tracking-tight text-signal">
                  {summary.alwaysUnroutable.length}
                </p>
                <p className="mt-2 text-lg">
                  tokens that could not be traded in a single measurement
                </p>
              </div>
              <div>
                <p className="text-5xl font-black tracking-tight text-signal">
                  {summary.traps.length}
                </p>
                <p className="mt-2 text-lg">
                  tokens that cost more than 2% to enter at $1,000
                </p>
              </div>
            </section>

            {summary.worst ? (
              <section className="mt-14 bg-ink text-paper p-8">
                <p className="text-2xl font-bold leading-snug max-w-[50ch]">
                  The worst moment we recorded: a $1,000 order in{" "}
                  {summary.worst.symbol} would have lost{" "}
                  {money(summary.worst.costUsd)} on entry.
                </p>
                <p className="mt-3 text-lg text-paper/70">
                  Captured {summary.worst.capturedAt.slice(0, 16).replace("T", " ")} UTC.
                </p>
              </section>
            ) : null}

            {summary.traps.length > 0 ? (
              <section className="mt-16">
                <h2 className="text-2xl font-bold tracking-tight">
                  How often each token was too expensive to enter
                </h2>
                <ul className="mt-6">
                  {summary.traps.map((t) => (
                    <li key={t.symbol} className="border-t border-rule py-6">
                      <p className="text-xl font-black tracking-tight">{t.symbol}</p>
                      <p className="mt-1 text-lg leading-snug max-w-[62ch]">
                        Too expensive to enter in {Math.round(t.trapRate * 100)}% of
                        the {t.observations} times we measured it. Worst case, a
                        $1,000 order lost {money(t.worstCostUsd)}.
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {summary.alwaysUnroutable.length > 0 ? (
              <section className="mt-16 pt-10 border-t-2 border-ink">
                <h2 className="text-2xl font-bold tracking-tight">
                  Never tradable, not once
                </h2>
                <p className="mt-3 text-lg leading-snug max-w-[62ch]">
                  These tokens returned no route in every measurement we have
                  taken. They are listed, they have a price, and you cannot buy
                  or sell them on-chain.
                </p>
                <p className="mt-5 text-lg font-bold">
                  {summary.alwaysUnroutable.join("  ·  ")}
                </p>
              </section>
            ) : null}
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
