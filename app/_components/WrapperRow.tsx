export type Severity = "clear" | "caution" | "stop";

export interface WrapperRowProps {
  symbol: string;
  issuer: string;
  severity: Severity;
  /** What happens when you try to trade it. One sentence. */
  tradability: string;
  /** What the issuer can do to your balance. One sentence. */
  custody: string;
}

const BAR: Record<Severity, string> = {
  clear: "bg-signal",
  caution: "bg-ink/40",
  stop: "bg-ink",
};

export function WrapperRow(props: WrapperRowProps) {
  const { symbol, issuer, severity, tradability, custody } = props;

  return (
    <li className="flex gap-5 py-7 border-t border-rule">
      <span
        aria-hidden
        className={`w-2 shrink-0 rounded-full ${BAR[severity]}`}
      />
      <div className="min-w-0">
        <h3 className="text-2xl font-black tracking-tight">
          {symbol}{" "}
          <span className="font-medium text-ink/55 text-xl">{issuer}</span>
        </h3>
        <p className="mt-2 text-lg leading-snug max-w-[62ch]">{tradability}</p>
        <p className="mt-1 text-lg leading-snug max-w-[62ch] text-ink/70">
          {custody}
        </p>
      </div>
    </li>
  );
}
