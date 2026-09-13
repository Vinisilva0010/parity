/**
 * Solana RPC edge. The only place in the codebase that talks to a node.
 * Returns plain data for the pure analyzers in src/core.
 */
import { Connection, PublicKey } from "@solana/web3.js";
import {
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  getDefaultAccountState,
  getMint,
  getPermanentDelegate,
  getTransferHook,
  AccountState,
} from "@solana/spl-token";
import type { MintPowers } from "@/core/custody";

const NULL_ADDRESS = "11111111111111111111111111111111";

function normalize(key: PublicKey | null | undefined): string | null {
  if (!key) return null;
  const s = key.toBase58();
  return s === NULL_ADDRESS ? null : s;
}

export function createConnection(rpcUrl?: string): Connection {
  const url = rpcUrl ?? process.env.SOLANA_RPC_URL;
  if (!url) {
    throw new Error("SOLANA_RPC_URL is not set. Copy .env.example to .env and fill it in.");
  }
  return new Connection(url, "confirmed");
}

/**
 * Reads a mint and extracts every issuer power it carries.
 * Throws if the mint does not exist or is owned by an unexpected program.
 */
export async function fetchMintPowers(
  connection: Connection,
  mintAddress: string,
): Promise<MintPowers> {
  const mintKey = new PublicKey(mintAddress);
  const info = await connection.getAccountInfo(mintKey);
  if (!info) throw new Error(`mint account not found: ${mintAddress}`);

  const owner = info.owner;
  const isToken2022 = owner.equals(TOKEN_2022_PROGRAM_ID);
  const mint = await getMint(connection, mintKey, "confirmed", owner);

  let permanentDelegate: string | null = null;
  let transferHookProgram: string | null = null;
  let defaultAccountStateFrozen = false;

  if (isToken2022) {
    permanentDelegate = normalize(getPermanentDelegate(mint)?.delegate);
    transferHookProgram = normalize(getTransferHook(mint)?.programId);
    const das = getDefaultAccountState(mint);
    defaultAccountStateFrozen = das?.state === AccountState.Frozen;
  }

  return {
    freezeAuthority: normalize(mint.freezeAuthority),
    permanentDelegate,
    transferHookProgram,
    defaultAccountStateFrozen,
    mintAuthority: normalize(mint.mintAuthority),
    isToken2022,
  };
}

/** Extension types present on a mint, for diagnostics. */
export { ExtensionType };
