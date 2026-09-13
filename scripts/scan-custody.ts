/**
 * Reads every mint in the registry from Solana mainnet and reports the issuer
 * powers attached to it. Read-only: no wallet, no transaction, no funds.
 */
import { analyzeCustody, headline } from "@/core/custody";
import { registry } from "@/registry/schema";
import { createConnection, fetchMintPowers } from "@/adapters/rpc";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const connection = createConnection();
  const rows: any[] = [];

  const targets = [
    ...registry.wrappers.map((w) => ({ label: w.symbol, mint: w.mint, kind: "wrapper" })),
    ...registry.impostors.map((i) => ({ label: `${i.claimedSymbol} (impostor)`, mint: i.mint, kind: "impostor" })),
  ];

  for (const t of targets) {
    try {
      const powers = await fetchMintPowers(connection, t.mint);
      const report = analyzeCustody(powers);
      rows.push({ ...t, powers, level: report.level, findings: report.findings });
      const flags = [
        powers.permanentDelegate ? "CLAWBACK" : null,
        powers.freezeAuthority ? "FREEZE" : null,
        powers.transferHookProgram ? "HOOK" : null,
        powers.defaultAccountStateFrozen ? "APPROVAL" : null,
        powers.isToken2022 ? null : "LEGACY-PROGRAM",
      ].filter(Boolean);
      console.log(
        `${t.label.padEnd(20)} ${report.level.padEnd(19)} ${flags.join(" ") || "-"}`,
      );
    } catch (e) {
      console.log(`${t.label.padEnd(20)} ERROR: ${(e as Error).message}`);
      rows.push({ ...t, error: (e as Error).message });
    }
    await sleep(120);
  }

  console.log("\n================ SUMMARY ================");
  const ok = rows.filter((r) => !r.error);
  const count = (pred: (r: any) => boolean) => ok.filter(pred).length;
  console.log(`mints read:          ${ok.length} / ${targets.length}`);
  console.log(`clawback enabled:    ${count((r) => r.powers?.permanentDelegate)}`);
  console.log(`freezable:           ${count((r) => r.powers?.freezeAuthority)}`);
  console.log(`transfer hook:       ${count((r) => r.powers?.transferHookProgram)}`);
  console.log(`approval required:   ${count((r) => r.powers?.defaultAccountStateFrozen)}`);
  console.log(`legacy program:      ${count((r) => r.powers && !r.powers.isToken2022)}`);

  const path = `data/spike/custody-${Date.now()}.json`;
  await (await import("node:fs/promises")).writeFile(path, JSON.stringify(rows, null, 2));
  console.log(`\nraw report: ${path}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
