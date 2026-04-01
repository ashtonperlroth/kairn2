import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import {
  loadProposerMemory,
  saveRunSummary,
  buildRunSummary,
  formatMemoryForProposer,
  type RunSummary,
} from '../memory.js';
import type { IterationLog } from '../types.js';

let tempDir: string;

beforeEach(async () => {
  tempDir = path.join('/tmp', `kairn-memory-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fs.mkdir(tempDir, { recursive: true });
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe('loadProposerMemory', () => {
  it('returns empty array when no memory file exists', async () => {
    const result = await loadProposerMemory(tempDir);
    expect(result).toEqual([]);
  });

  it('loads existing memory entries', async () => {
    const entries: RunSummary[] = [{
      timestamp: '2026-01-01T00:00:00Z',
      baselineScore: 50,
      bestScore: 70,
      improvement: 20,
      effectiveMutations: ['added verification'],
      regressiveMutations: [],
      insights: 'Improved 20 points.',
    }];
    await fs.writeFile(path.join(tempDir, 'proposer-memory.json'), JSON.stringify(entries));

    const result = await loadProposerMemory(tempDir);
    expect(result).toHaveLength(1);
    expect(result[0].bestScore).toBe(70);
  });
});

describe('saveRunSummary', () => {
  it('creates memory file with one entry', async () => {
    const summary: RunSummary = {
      timestamp: '2026-01-01T00:00:00Z',
      baselineScore: 60,
      bestScore: 75,
      improvement: 15,
      effectiveMutations: [],
      regressiveMutations: [],
      insights: 'test',
    };

    await saveRunSummary(tempDir, summary);
    const loaded = await loadProposerMemory(tempDir);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].bestScore).toBe(75);
  });

  it('caps at 10 entries (FIFO)', async () => {
    for (let i = 0; i < 12; i++) {
      await saveRunSummary(tempDir, {
        timestamp: `2026-01-${i + 1}`,
        baselineScore: i,
        bestScore: i + 10,
        improvement: 10,
        effectiveMutations: [],
        regressiveMutations: [],
        insights: `run ${i}`,
      });
    }

    const loaded = await loadProposerMemory(tempDir);
    expect(loaded).toHaveLength(10);
    // First entry should be run 2 (oldest 2 dropped)
    expect(loaded[0].baselineScore).toBe(2);
  });
});

describe('buildRunSummary', () => {
  it('identifies effective mutations (score improved)', () => {
    const history: IterationLog[] = [
      { iteration: 0, score: 50, taskResults: {}, proposal: null, diffPatch: null, timestamp: '' },
      {
        iteration: 1, score: 70, taskResults: {},
        proposal: {
          reasoning: 'test',
          mutations: [{ file: 'CLAUDE.md', action: 'add_section', newText: 'verify', rationale: 'Add verification' }],
          expectedImpact: {},
        },
        diffPatch: 'diff', timestamp: '',
      },
    ];

    const summary = buildRunSummary(history, 50, 70);
    expect(summary.effectiveMutations).toHaveLength(1);
    expect(summary.effectiveMutations[0]).toContain('Add verification');
    expect(summary.improvement).toBe(20);
  });

  it('identifies regressive mutations (score dropped >5)', () => {
    const history: IterationLog[] = [
      { iteration: 0, score: 70, taskResults: {}, proposal: null, diffPatch: null, timestamp: '' },
      {
        iteration: 1, score: 50, taskResults: {},
        proposal: {
          reasoning: 'bad',
          mutations: [{ file: 'CLAUDE.md', action: 'add_section', newText: 'bad', rationale: 'Bad change' }],
          expectedImpact: {},
        },
        diffPatch: 'diff', timestamp: '',
      },
    ];

    const summary = buildRunSummary(history, 70, 70);
    expect(summary.regressiveMutations).toHaveLength(1);
    expect(summary.regressiveMutations[0]).toContain('Bad change');
  });
});

describe('formatMemoryForProposer', () => {
  it('returns empty string for no memory', () => {
    expect(formatMemoryForProposer([])).toBe('');
  });

  it('formats memory entries for proposer context', () => {
    const memory: RunSummary[] = [{
      timestamp: '2026-01-01',
      baselineScore: 50,
      bestScore: 70,
      improvement: 20,
      effectiveMutations: ['added verification section'],
      regressiveMutations: ['removed git rules'],
      insights: 'test',
    }];

    const result = formatMemoryForProposer(memory);
    expect(result).toContain('Prior Run History');
    expect(result).toContain('Effective mutations');
    expect(result).toContain('added verification section');
    expect(result).toContain('Regressive mutations (AVOID these)');
    expect(result).toContain('removed git rules');
  });
});
