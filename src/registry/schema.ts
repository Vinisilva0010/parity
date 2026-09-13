import { z } from "zod";
import raw from "./wrappers.json" with { type: "json" };

/** The only SPL token program used by legitimate tokenized-equity issuers on Solana. */
export const TOKEN_2022_PROGRAM_ID =
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

const Base58 = z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "invalid base58 address");

export const IssuerIdSchema = z.enum([
  "backed_xstocks",
  "ondo_gm",
  "backpack_securities",
]);

export const InstrumentClassSchema = z.enum([
  "redeemable_share",
  "spv_note",
  "total_return_tracker",
  "synthetic",
]);

export const IssuerSchema = z.object({
  name: z.string().min(1),
  instrumentClass: InstrumentClassSchema,
  source: z.url(),
});

export const WrapperSchema = z.object({
  ticker: z.string().regex(/^[A-Z]{1,6}$/),
  symbol: z.string().min(1),
  mint: Base58,
  decimals: z.number().int().min(0).max(18),
  issuer: IssuerIdSchema,
});

export const ImpostorSchema = z.object({
  mint: Base58,
  claimedSymbol: z.string().min(1),
  reason: z.string().min(20),
});

export const RegistrySchema = z.object({
  version: z.number().int().positive(),
  note: z.string(),
  issuers: z.record(IssuerIdSchema, IssuerSchema),
  wrappers: z.array(WrapperSchema).min(1),
  impostors: z.array(ImpostorSchema),
});

export type Registry = z.infer<typeof RegistrySchema>;
export type Wrapper = z.infer<typeof WrapperSchema>;
export type IssuerId = z.infer<typeof IssuerIdSchema>;

export const registry: Registry = RegistrySchema.parse(raw);

const byMint = new Map(registry.wrappers.map((w) => [w.mint, w]));
const impostorMints = new Set(registry.impostors.map((i) => i.mint));

/** Returns the wrapper for a mint, or undefined if the mint is not allowlisted. */
export function findByMint(mint: string): Wrapper | undefined {
  return byMint.get(mint);
}

/** True only for mints explicitly allowlisted in the registry. */
export function isAllowlisted(mint: string): boolean {
  return byMint.has(mint);
}

/** True for mints we have positively identified as impersonating a real issuer. */
export function isKnownImpostor(mint: string): boolean {
  return impostorMints.has(mint);
}

/** All wrappers for a ticker, in registry order. Empty if the ticker is unknown. */
export function wrappersFor(ticker: string): Wrapper[] {
  const t = ticker.toUpperCase();
  return registry.wrappers.filter((w) => w.ticker === t);
}

/** Every ticker present in the registry, sorted. */
export function allTickers(): string[] {
  return [...new Set(registry.wrappers.map((w) => w.ticker))].sort();
}
