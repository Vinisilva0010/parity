/**
 * Custody risk analysis for tokenized-equity mints.
 *
 * Token-2022 lets an issuer keep powers over tokens already sitting in a
 * holder's wallet. These powers are public on-chain state that no consumer
 * surface currently shows. Pure functions: the raw mint is fetched at the edge
 * and passed in as plain data.
 */

/** The powers an issuer may retain over a mint, as read from chain. */
export interface MintPowers {
  /** Authority able to freeze any token account holding this mint. */
  readonly freezeAuthority: string | null;
  /** Authority able to transfer tokens out of any account without the owner. */
  readonly permanentDelegate: string | null;
  /** Program invoked on every transfer; can block transfers. */
  readonly transferHookProgram: string | null;
  /** New accounts start frozen and require issuer approval. */
  readonly defaultAccountStateFrozen: boolean;
  /** Authority able to mint more supply. */
  readonly mintAuthority: string | null;
  /** True when the mint is owned by the Token-2022 program. */
  readonly isToken2022: boolean;
}

export type CustodyLevel = "self_custody" | "issuer_controlled" | "issuer_seizable";

export interface CustodyFinding {
  readonly severity: "critical" | "warning" | "info";
  /** Short label, e.g. "Clawback enabled". */
  readonly label: string;
  /** One plain-language sentence a non-expert can act on. */
  readonly detail: string;
  /** The on-chain authority responsible, when there is one. */
  readonly authority?: string;
}

export interface CustodyReport {
  readonly level: CustodyLevel;
  readonly findings: readonly CustodyFinding[];
  /** One-sentence answer to "who controls this token?". */
  readonly summary: string;
}

export function analyzeCustody(powers: MintPowers): CustodyReport {
  const findings: CustodyFinding[] = [];

  if (powers.permanentDelegate) {
    findings.push({
      severity: "critical",
      label: "Clawback enabled",
      detail:
        "The issuer can move these tokens out of your wallet at any time without your signature.",
      authority: powers.permanentDelegate,
    });
  }

  if (powers.freezeAuthority) {
    findings.push({
      severity: "critical",
      label: "Freezable",
      detail:
        "The issuer can freeze your balance, blocking you from selling or transferring it.",
      authority: powers.freezeAuthority,
    });
  }

  if (powers.transferHookProgram) {
    findings.push({
      severity: "warning",
      label: "Transfer hook",
      detail:
        "Every transfer runs issuer-controlled code that can reject it, including a sale.",
      authority: powers.transferHookProgram,
    });
  }

  if (powers.defaultAccountStateFrozen) {
    findings.push({
      severity: "warning",
      label: "Approval required",
      detail:
        "New holders start frozen and must be approved by the issuer before they can transfer.",
    });
  }

  if (powers.mintAuthority) {
    findings.push({
      severity: "info",
      label: "Supply can grow",
      detail: "The issuer can mint additional supply, which is expected for a backed token.",
      authority: powers.mintAuthority,
    });
  }

  if (!powers.isToken2022) {
    findings.push({
      severity: "critical",
      label: "Legacy token program",
      detail:
        "This mint uses the legacy SPL Token program. No legitimate tokenized-equity issuer on Solana does, which is a strong sign the token is not what it claims to be.",
    });
  }

  const level: CustodyLevel = powers.permanentDelegate
    ? "issuer_seizable"
    : powers.freezeAuthority || powers.transferHookProgram || powers.defaultAccountStateFrozen
      ? "issuer_controlled"
      : "self_custody";

  return { level, findings, summary: summarize(level) };
}

function summarize(level: CustodyLevel): string {
  switch (level) {
    case "issuer_seizable":
      return "The issuer can take these tokens back from your wallet without your permission.";
    case "issuer_controlled":
      return "The issuer cannot take these tokens, but can stop you from moving or selling them.";
    case "self_custody":
      return "No issuer powers detected. Once these tokens are in your wallet, they are yours.";
  }
}

/** Highest-severity finding, for surfacing a single headline warning. */
export function headline(report: CustodyReport): CustodyFinding | undefined {
  return (
    report.findings.find((f) => f.severity === "critical") ??
    report.findings.find((f) => f.severity === "warning") ??
    report.findings[0]
  );
}
