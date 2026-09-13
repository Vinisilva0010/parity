/**
 * Shows what reaches your position and what the market takes on entry.
 * The bar grows on load so the loss is something you watch happen, which is
 * the one moment on the page worth animating.
 */
export function CostBar({
  sizeUsd,
  costUsd,
}: {
  sizeUsd: number;
  costUsd: number;
}) {
  const lostPct = Math.min(100, (costUsd / sizeUsd) * 100);
  const keptPct = 100 - lostPct;
  const money = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD" });

  return (
    <div>
      <div className="flex h-9 w-full border-2 border-ink overflow-hidden">
        <div
          className="parity-grow bg-signal"
          style={{ width: `${keptPct}%` }}
        />
        <div
          className="parity-grow bg-ink"
          style={{ width: `${lostPct}%`, animationDelay: "120ms" }}
        />
      </div>
      <p className="mt-3 text-lg leading-snug max-w-[56ch]">
        You spend {money(sizeUsd)}. {money(sizeUsd - costUsd)} becomes your
        position and {money(costUsd)} is lost the moment the trade settles.
      </p>
    </div>
  );
}
