# Parity

**Which token is really that stock, can you get out of it, and who controls it?**

Live at [parity.zanvexis.com](https://parity.zanvexis.com)

Tokenized US equities now settle mostly on Solana. Several companies each issue
their own token for the same underlying share, and those tokens are not
interchangeable. They trade in separate pools, carry different issuer powers,
and some of them cannot be sold at all. Every interface shows you a price and a
buy button, and none of them shows you any of that.

Parity does. Type a ticker and it answers in one sentence, before you spend
anything.

## What we measured

Everything below was measured against Solana mainnet during development. The
scripts that produced it are in this repository and the raw output is committed
under `data/`.

**30 of the 32 tokenized equities we track can be frozen by their issuer.**
**16 of them carry a permanent delegate**, which means the issuer can move the
tokens out of a holder's wallet without that holder's signature. This is public
on-chain state that no consumer surface displays.

**13 of the 32 returned no route at all.** They are listed, they show a price,
and they cannot be bought or sold on-chain. Every Ondo Global Markets mint we
probed answered `NO_ROUTES_FOUND` or `TOKEN_NOT_TRADABLE`.

**A $1,000 order in AMDx cost $132 on entry.** The token looks normal on every
screen. The price is correct. The liquidity is not there, and nothing warns you.

**Two mints impersonating META use the legacy SPL Token program.** No legitimate
tokenized-equity issuer on Solana does. Their addresses are vanity-generated to
end in `meta`, they quote near $4,890 and $4.88 while the real share trades near
$645, and they appear in aggregator search results beside the real token.

## How it works

Three checks, in plain language, for every token that claims a ticker.

**Identity.** Parity routes only to mints on a verified allowlist, each entry
carrying its issuer and source. Mints we have positively identified as
impersonating an issuer are recorded with the reason. A ticker search that
returns a memecoin next to the real asset is the problem this closes.

**Exit.** Live executable quotes at $1,000, $10,000 and $100,000, priced through
the aggregator rather than read off a chart. The cost of entering is reported in
dollars, not basis points.

**Custody.** Token-2022 mint extensions read directly from an RPC node: freeze
authority, permanent delegate, transfer hook, default account state. Translated
into what it means for the person holding the token.

## Evidence

A scheduled job quotes every tracked token and commits the result to
`data/snapshots/` as JSONL. The series is timestamped by git history, so any
figure published on the site can be checked against the commit that produced it
rather than taken on trust. See [/evidence](https://parity.zanvexis.com/evidence).

## Architecture

All financial logic lives in `src/core` as pure functions with no I/O. Network
calls happen only in `src/adapters` and pass plain data inward. This is what
makes the money-touching paths property-testable and auditable.

Ticker pages are generated ahead of time for every entry in the registry, and
unknown tickers are rejected without reaching an external API. A normal visit
therefore costs no RPC or aggregator call.

## Running it

```bash
pnpm install
cp .env.example .env     # add a Solana RPC URL
pnpm test                # 77 tests, no network required
pnpm dev
```

Read-only tools, useful on their own:

```bash
pnpm scan:custody        # read issuer powers for every registry mint
pnpm collect             # take one liquidity snapshot
```

## Stack

Next.js 15, React 19, TypeScript, Tailwind CSS 4, Vitest with fast-check for
property tests, `@solana/web3.js` and `@solana/spl-token` for on-chain reads,
Jupiter for quotes.

## What this is not

Parity does not hold funds, does not ask for a private key, and does not need a
wallet connection to answer anything. It is an information tool, not a broker
and not investment advice.

Instrument classifications are our reading of public issuer documentation, with
sources linked in the registry. Liquidity figures describe the moment they were
captured and will have moved since.

## License

MIT
