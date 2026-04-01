import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { evaluateAll, runWithConcurrency } from '../runner.js';
import type { Task, Score, LoopProgressEvent } from '../types.js';
import type { KairnConfig } from '../../types.js';

vi.mock('../scorers.js', () => ({
  scoreTask: vi.fn(),
}));

vi.mock('../trace.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../trace.js')>();
  return {
    ...original,
    writeScore: vi.fn(),
    writeTrace: vi.fn(),
  };
});

import { scoreTask } from '../scorers.js';
import { writeScore } from '../trace.js';

const mockedScoreTask = vi.mocked(scoreTask);
const mockedWriteScore = vi.mocked(writeScore);

function makeTask(id: string): Task {
  return {
    id,
    template: 'add-feature',
    description: `Task ${id}`,
    setup: '',
    expected_outcome: 'Some outcome',
    scoring: 'pass-fail',
    timeout: 30,
  };
}

function makeConfig(): KairnConfig {
  return {
    provider: 'anthropic',
    api_key: 'test-key',
    model: 'claude-sonnet-4-6',
    default_runtime: 'claude-code',
    created_at: new Date().toISOString(),
  };
}

describe('runWithConcurrency', () => {
  it('runs all tasks and returns results in order', async () => {
    const tasks = [
      () => Promise.resolve('a'),
      () => Promise.resolve('b'),
      () => Promise.resolve('c'),
    ];

    const results = await runWithConcurrency(tasks, 2);
    expect(results).toEqual(['a', 'b', 'c']);
  });

  it('respects concurrency limit', async () => {
    let running = 0;
    let maxRunning = 0;

    const makeTask = (value: string) => async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((r) => setTimeout(r, 10));
      running--;
      return value;
    };

    const tasks = [
      makeTask('a'),
      makeTask('b'),
      makeTask('c'),
      makeTask('d'),
      makeTask('e'),
      makeTask('f'),
    ];

    const results = await runWithConcurrency(tasks, 2);

    expect(results).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    expect(maxRunning).toBeLessThanOrEqual(2);
    expect(maxRunning).toBe(2);
  });

  it('runs all concurrently when limit exceeds task count', async () => {
    let running = 0;
    let maxRunning = 0;

    const makeTask = (value: string) => async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((r) => setTimeout(r, 10));
      running--;
      return value;
    };

    const tasks = [makeTask('a'), makeTask('b'), makeTask('c')];

    const results = await runWithConcurrency(tasks, 10);

    expect(results).toEqual(['a', 'b', 'c']);
    expect(maxRunning).toBe(3);
  });

  it('handles limit of 1 (sequential)', async () => {
    let running = 0;
    let maxRunning = 0;

    const makeTask = (value: string) => async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((r) => setTimeout(r, 5));
      running--;
      return value;
    };

    const tasks = [makeTask('a'), makeTask('b'), makeTask('c')];
    const results = await runWithConcurrency(tasks, 1);

    expect(results).toEqual(['a', 'b', 'c']);
    expect(maxRunning).toBe(1);
  });

  it('handles empty task list', async () => {
    const results = await runWithConcurrency([], 3);
    expect(results).toEqual([]);
  });

  it('propagates errors from tasks', async () => {
    const tasks = [
      () => Promise.resolve('ok'),
      () => Promise.reject(new Error('boom')),
      () => Promise.resolve('ok'),
    ];

    await expect(runWithConcurrency(tasks, 2)).rejects.toThrow('boom');
  });
});

describe('evaluateAll with parallelTasks', () => {
  let tempDir: string;
  let fakeBinDir: string;
  let origPath: string | undefined;

  beforeEach(async () => {
    tempDir = path.join(
      '/tmp',
      `kairn-parallel-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    fakeBinDir = path.join(tempDir, 'bin');
    await fs.mkdir(fakeBinDir, { recursive: true });

    const fakeScript = path.join(fakeBinDir, 'claude');
    await fs.writeFile(fakeScript, '#!/bin/bash\ncat\necho "done"');
    await fs.chmod(fakeScript, 0o755);

    origPath = process.env['PATH'];
    process.env['PATH'] = `${fakeBinDir}:${origPath}`;

    await fs.mkdir(path.join(tempDir, 'harness'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'harness', 'CLAUDE.md'), '# Test');
    await fs.mkdir(path.join(tempDir, 'workspace', 'traces', '0'), { recursive: true });

    vi.clearAllMocks();
    mockedWriteScore.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    process.env['PATH'] = origPath;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('produces identical results with parallelTasks=1 and parallelTasks=3', async () => {
    const tasks = [makeTask('task-a'), makeTask('task-b'), makeTask('task-c')];
    const config = makeConfig();

    // Sequential run
    mockedScoreTask
      .mockResolvedValueOnce({ pass: true, score: 80 })
      .mockResolvedValueOnce({ pass: false, score: 50 })
      .mockResolvedValueOnce({ pass: true, score: 90 });

    const sequential = await evaluateAll(
      tasks,
      path.join(tempDir, 'harness'),
      path.join(tempDir, 'workspace'),
      0,
      config,
      undefined,
      1,
      1,
    );

    vi.clearAllMocks();
    mockedWriteScore.mockResolvedValue(undefined);

    // Parallel run (same scores)
    mockedScoreTask
      .mockResolvedValueOnce({ pass: true, score: 80 })
      .mockResolvedValueOnce({ pass: false, score: 50 })
      .mockResolvedValueOnce({ pass: true, score: 90 });

    const parallel = await evaluateAll(
      tasks,
      path.join(tempDir, 'harness'),
      path.join(tempDir, 'workspace'),
      0,
      config,
      undefined,
      1,
      3,
    );

    expect(sequential.aggregate).toBeCloseTo(parallel.aggregate, 1);
    expect(Object.keys(sequential.results).sort()).toEqual(
      Object.keys(parallel.results).sort(),
    );
  });

  it('fires progress events for parallel tasks', async () => {
    const tasks = [makeTask('task-a'), makeTask('task-b')];
    const config = makeConfig();
    const events: LoopProgressEvent[] = [];

    mockedScoreTask
      .mockResolvedValueOnce({ pass: true, score: 80 })
      .mockResolvedValueOnce({ pass: true, score: 90 });

    await evaluateAll(
      tasks,
      path.join(tempDir, 'harness'),
      path.join(tempDir, 'workspace'),
      0,
      config,
      (event) => events.push(event),
      1,
      2,
    );

    const starts = events.filter((e) => e.type === 'task-start');
    const scored = events.filter((e) => e.type === 'task-scored');
    expect(starts).toHaveLength(2);
    expect(scored).toHaveLength(2);
  });

  it('accepts parallelTasks parameter without breaking default behavior', async () => {
    const tasks = [makeTask('task-1')];
    const config = makeConfig();

    mockedScoreTask.mockResolvedValueOnce({ pass: true, score: 85 });

    const { results, aggregate } = await evaluateAll(
      tasks,
      path.join(tempDir, 'harness'),
      path.join(tempDir, 'workspace'),
      0,
      config,
    );

    expect(results['task-1'].score).toBe(85);
    expect(aggregate).toBe(85);
  });
});
