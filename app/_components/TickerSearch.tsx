"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function TickerSearch({ autoFocus = false }: { autoFocus?: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const ticker = value.trim().toUpperCase();
    if (ticker) router.push(`/t/${ticker}`);
  }

  return (
    <form onSubmit={submit}>
      <label htmlFor="ticker" className="block text-lg font-medium mb-3">
        Which stock are you looking at?
      </label>
      <div className="flex gap-3">
        <input
          id="ticker"
          name="ticker"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="NVDA"
          autoComplete="off"
          spellCheck={false}
          autoFocus={autoFocus}
          className="flex-1 min-w-0 bg-transparent border-2 border-ink px-4 py-3
                     text-2xl font-bold tracking-tight placeholder:text-ink/25"
        />
        <button
          type="submit"
          className="bg-signal text-paper px-7 py-3 text-xl font-bold tracking-tight
                     hover:bg-ink transition-colors"
        >
          Check
        </button>
      </div>
      <p className="mt-3 text-ink/60">
        Try NVDA, AMD, SPY or SPCX. No wallet needed.
      </p>
    </form>
  );
}
