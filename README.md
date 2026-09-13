# Parity

Wrapper-aware execution layer for tokenized stocks on Solana.

The same stock exists as several different tokens on Solana, issued by different
issuers under materially different legal structures. They look identical on a
price chart. Parity answers three questions before you buy: what you will
actually pay across every wrapper, what you are legally holding, and who can
freeze or seize the position.

Status: work in progress. Built for the Stocklana hackathon (Solana Foundation).

## Requirements

- Node.js >= 22
- pnpm
- surfpool (local mainnet fork, used for execution tests)

## Setup

```bash
pnpm install
cp .env.example .env
pnpm test
```

## Disclaimer

Not investment advice. Instrument classifications are derived from public issuer
documentation and are linked to their sources in the registry.
