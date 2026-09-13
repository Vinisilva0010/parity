import { Mark } from "./Mark";

const REPO = "https://github.com/Vinisilva0010/parity";

export function SiteFooter() {
  return (
    <footer className="mx-auto max-w-4xl px-6 mt-24 pt-10 pb-16 border-t-2 border-ink">
      <div className="flex flex-wrap gap-10 justify-between">
        <div className="max-w-[42ch]">
          <Mark className="h-7 w-7 text-signal" />
          <p className="mt-4 text-lg leading-snug">
            Parity reads public Solana data and live quotes so you can see what a
            tokenized stock really is before you spend anything on it.
          </p>
        </div>
        <div className="text-lg">
          <p className="font-bold mb-3">Open source</p>
          <a href={REPO} className="block hover:text-signal">Code and data on GitHub</a>
          <p className="mt-3 text-ink/60 max-w-[34ch]">
            Every measurement is committed to the repository, so you can check
            our numbers yourself.
          </p>
        </div>
      </div>
      <p className="mt-12 text-ink/55 max-w-[70ch]">
        Parity is an information tool, not investment advice, and not a broker.
        It does not hold your funds and never asks for your private key.
      </p>
    </footer>
  );
}
