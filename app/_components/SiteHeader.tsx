import Link from "next/link";
import { Wordmark } from "./Mark";

export function SiteHeader() {
  return (
    <header className="mx-auto max-w-4xl px-6 pt-8 pb-10 flex items-center justify-between gap-6">
      <Link href="/" className="shrink-0">
        <Wordmark />
      </Link>
      <nav className="flex gap-6 text-lg font-medium">
        <a href="/#how" className="hover:text-signal">How it works</a>
        <a href="/#faq" className="hover:text-signal">FAQ</a>
      </nav>
    </header>
  );
}
