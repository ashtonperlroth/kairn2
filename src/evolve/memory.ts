import fs from 'fs/promises';
import path from 'path';
import type { IterationLog } from './types.js';

const MEMORY_FILE = 'proposer-memory.json';
const MAX_ENTRIES = 10;

export interface RunSummary {
  timestamp: string;
  baselineScore: number;
  bestScore: number;
  improvement: number;
  effectiveMutations: string[];
  regressiveMutations: string[];
  insights: string;
}

/**
 * Load proposer memory from the workspace.
 * Returns empty array if no memory file exists.
 */
export async function loadProposerMemory(workspacePath: string): Promise<RunSummary[]> {
  const memoryPath = path.join(workspacePath, MEMORY_FILE);
  try {
    const raw = await fs.readFile(memoryPath, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return parsed as RunSummary[];
    return [];
  } catch {
    return [];
  }
}

/**
 * Build a run summary from iteration history.
 */
export function buildRunSummary(history: IterationLog[], baselineScore: number, bestScore: number): RunSummary {
  const effectiveMutations: string[] = [];
  const regressiveMutations: string[] = [];

  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1];
    const curr = history[i];
    if (!curr.proposal?.mutations.length) continue;

    const delta = curr.score - prev.score;
    const summary = curr.proposal.mutations
      .map(m => `${m.action} ${m.file}: ${m.rationale}`)
      .join('; ');

    if (delta > 0) {
      effectiveMutations.push(`+${delta.toFixed(1)}: ${summary}`);
    } else if (delta < -5) {
      regressiveMutations.push(`${delta.toFixed(1)}: ${summary}`);
    }
  }

  const improvement = bestScore - baselineScore;
  const insights = improvement > 0
    ? `Improved ${improvement.toFixed(1)} points. ${effectiveMutations.length} helpful mutations, ${regressiveMutations.length} regressions.`
    : `No improvement. ${regressiveMutations.length} regressions observed.`;

  return {
    timestamp: new Date().toISOString(),
    baselineScore,
    bestScore,
    improvement,
    effectiveMutations,
    regressiveMutations,
    insights,
  };
}

/**
 * Save a run summary to the workspace. Keeps last MAX_ENTRIES entries.
 */
export async function saveRunSummary(workspacePath: string, summary: RunSummary): Promise<void> {
  const existing = await loadProposerMemory(workspacePath);
  existing.push(summary);
  const trimmed = existing.slice(-MAX_ENTRIES);
  const memoryPath = path.join(workspacePath, MEMORY_FILE);
  await fs.writeFile(memoryPath, JSON.stringify(trimmed, null, 2), 'utf-8');
}

/**
 * Format proposer memory for inclusion in the proposer context.
 */
export function formatMemoryForProposer(memory: RunSummary[]): string {
  if (memory.length === 0) return '';

  const lines: string[] = ['## Prior Run History\n'];
  for (const entry of memory) {
    lines.push(`### Run at ${entry.timestamp}`);
    lines.push(`- Baseline: ${entry.baselineScore.toFixed(1)}%, Best: ${entry.bestScore.toFixed(1)}%, Improvement: ${entry.improvement >= 0 ? '+' : ''}${entry.improvement.toFixed(1)}`);
    if (entry.effectiveMutations.length > 0) {
      lines.push('- Effective mutations:');
      for (const m of entry.effectiveMutations.slice(0, 3)) {
        lines.push(`  - ${m}`);
      }
    }
    if (entry.regressiveMutations.length > 0) {
      lines.push('- Regressive mutations (AVOID these):');
      for (const m of entry.regressiveMutations.slice(0, 3)) {
        lines.push(`  - ${m}`);
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}
