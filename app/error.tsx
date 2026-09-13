"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-4xl px-6 py-24">
      <h1 className="text-4xl font-black leading-tight tracking-tight max-w-[22ch]">
        We could not reach Solana just now.
      </h1>
      <p className="mt-5 text-xl leading-snug max-w-[58ch]">
        Parity reads live quotes and on-chain data on every request, so a failing
        node or aggregator means no answer rather than a stale one. We would
        rather show you nothing than show you a number we cannot stand behind.
      </p>
      <button
        onClick={reset}
        className="mt-10 bg-signal text-paper px-7 py-3 text-xl font-bold tracking-tight hover:bg-ink transition-colors"
      >
        Try again
      </button>
    </main>
  );
}
