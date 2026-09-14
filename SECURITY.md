# Security

Parity tells people what to do with their money. That makes being wrong a form
of harm, not just a bug, and it shapes every decision below.

## What Parity never does

It never holds funds. It never asks for a private key, a seed phrase or a
signature. It never needs a wallet connection: every answer on the site is
produced from public on-chain state and public quote APIs, so a visitor can use
the whole product without exposing an address.

There is no account, no upload, and no user data to leak.

## Threat model

**Routing a user to the wrong mint.** The highest-severity failure. A ticker
search on any aggregator returns real assets beside impersonators using the same
symbol, and we found two such mints for META during development. Mitigation: the
registry is an allowlist. A mint that is not in it is never priced, never
displayed as tradable and never routed to. Unknown tickers are rejected before
any external call is made.

**Publishing a wrong number confidently.** A sign error or a decimal error
produces a recommendation that reads as authoritative. Mitigation: all financial
math lives in pure functions with no I/O, covered by property-based invariants
(cost is never negative, a worse price impact never yields a better verdict,
economically identical trades priced in different decimals agree). Raw on-chain
amounts are handled as BigInt, never as floating-point numbers.

**Stale data presented as current.** A quote shown now may not hold in a minute.
Mitigation: quotes carry a 30-second cache lifetime, mint powers six hours, and
every page states the moment it was measured. On an upstream failure the site
shows an error rather than a cached number, because a stale price on this
product is worse than no answer.

**Infrastructure failure mistaken for a finding.** Saying a token cannot be
traded is a serious claim. During development a rate-limited request was being
recorded as "no route", which would have made that claim on the strength of our
own failed request. Mitigation: the quote adapter distinguishes a routing
failure from an infrastructure failure, and only the former is ever reported to
a user or written to the evidence series.

**Credential exposure.** The RPC endpoint carries an API key. Mitigation: the
live data module imports `server-only`, so importing it from a client component
fails the build rather than shipping the key in the browser bundle. Secrets live
in environment variables and never in the repository.

**Quota exhaustion as denial of service.** Free-tier limits are a real
availability risk. Mitigation: pages for every tracked ticker are generated ahead
of time, unknown tickers 404 without an external call, and the cache coalesces
concurrent requests for the same data into a single upstream call.

## Token-2022 custody risk

Most tokenized equities on Solana are built with Token-2022 extensions that let
the issuer retain powers over tokens already held in a user's wallet. We read
these directly from the mint and report them:

| Extension | What it means for a holder |
|---|---|
| Freeze authority | The issuer can freeze the balance, blocking any sale |
| Permanent delegate | The issuer can move the tokens out of the wallet without a signature |
| Transfer hook | Issuer-controlled code runs on every transfer and can reject it |
| Default account state | New holders start frozen and need issuer approval |

This is disclosure, not a recommendation. These powers exist for compliance
reasons and their presence does not make a token illegitimate. Their absence
does not make one safe either: both impersonating META mints we identified show
no issuer powers at all.

## Limits

Instrument classifications are our reading of public issuer documentation, with
sources recorded in the registry. Liquidity figures describe the moment of
capture. We report what we measured and we do not extrapolate beyond it.

## Reporting

Open an issue at
[github.com/Vinisilva0010/parity/issues](https://github.com/Vinisilva0010/parity/issues).
