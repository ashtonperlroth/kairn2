/**
 * Persistence utilities for compilation artifacts.
 *
 * Writes the HarnessIR to `.kairn/harness-ir.json` so that downstream
 * consumers (evolve loop, proposer, architect) can read the structured
 * intermediate representation without re-parsing the harness files.
 */
import fs from "fs/promises";
import path from "path";
import type { HarnessIR } from "../ir/types.js";

/** Directory name for Kairn project-level cache/artifacts. */
const KAIRN_DIR = ".kairn";

/** Filename for the persisted HarnessIR. */
const HARNESS_IR_FILENAME = "harness-ir.json";

/**
 * Persist a HarnessIR to `.kairn/harness-ir.json` in the given project directory.
 *
 * Creates the `.kairn/` directory if it does not exist. Overwrites any existing
 * `harness-ir.json`. The output is human-readable JSON with 2-space indentation.
 *
 * @param targetDir - The project root directory (where `.kairn/` will be created).
 * @param ir - The HarnessIR to persist.
 * @returns The absolute path to the written file.
 */
export async function persistHarnessIR(targetDir: string, ir: HarnessIR): Promise<string> {
  const kairnDir = path.join(targetDir, KAIRN_DIR);
  await fs.mkdir(kairnDir, { recursive: true });

  const filePath = path.join(kairnDir, HARNESS_IR_FILENAME);
  await fs.writeFile(filePath, JSON.stringify(ir, null, 2), "utf-8");

  return filePath;
}
