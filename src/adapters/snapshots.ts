/**
 * Reads the committed snapshot history from disk at build time.
 *
 * The files are part of the repository, so the series a reader sees on the
 * site is the same series they can inspect in git history.
 */
import "server-only";

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { Snapshot } from "@/core/evidence";

const DIR = join(process.cwd(), "data", "snapshots");

/** Returns every snapshot on disk. Malformed lines are skipped, not guessed. */
export async function loadSnapshots(): Promise<Snapshot[]> {
  let files: string[];
  try {
    files = (await readdir(DIR)).filter((f) => f.endsWith(".jsonl")).sort();
  } catch {
    return [];
  }

  const out: Snapshot[] = [];
  for (const file of files) {
    const raw = await readFile(join(DIR, file), "utf8");
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line) as Snapshot;
        if (typeof parsed?.capturedAt === "string" && Array.isArray(parsed?.wrappers)) {
          out.push(parsed);
        }
      } catch {
        // A truncated write is a missing observation, never a fabricated one.
      }
    }
  }
  return out;
}
