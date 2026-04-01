import fs from 'fs/promises';
import path from 'path';
import type { Trace, Score } from './types.js';

/**
 * Load a trace from filesystem.
 * Parses tool_calls.jsonl (one JSON object per line) and extracts
 * the iteration number from the parent directory name.
 */
export async function loadTrace(traceDir: string): Promise<Trace> {
  const stdout = await fs.readFile(path.join(traceDir, 'stdout.log'), 'utf-8').catch(() => '');
  const stderr = await fs.readFile(path.join(traceDir, 'stderr.log'), 'utf-8').catch(() => '');
  const filesChangedStr = await fs.readFile(
    path.join(traceDir, 'files_changed.json'),
    'utf-8',
  ).catch(() => '{}');
  const timingStr = await fs.readFile(
    path.join(traceDir, 'timing.json'),
    'utf-8',
  ).catch(() => '{}');
  const scoreStr = await fs.readFile(
    path.join(traceDir, 'score.json'),
    'utf-8',
  ).catch(() => '{"pass": false}');

  // Parse tool_calls.jsonl — one JSON object per line
  const toolCallsStr = await fs.readFile(
    path.join(traceDir, 'tool_calls.jsonl'),
    'utf-8',
  ).catch(() => '');
  const toolCalls = toolCallsStr
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line) as unknown);

  // Extract iteration from parent directory name (traces/{iteration}/{taskId})
  const parentDir = path.basename(path.dirname(traceDir));
  const iteration = parseInt(parentDir, 10) || 0;

  return {
    taskId: path.basename(traceDir),
    iteration,
    stdout,
    stderr,
    toolCalls,
    filesChanged: JSON.parse(filesChangedStr) as Record<string, 'created' | 'modified' | 'deleted'>,
    score: JSON.parse(scoreStr) as Trace['score'],
    timing: JSON.parse(timingStr) as Trace['timing'],
  };
}

/**
 * Load all traces for an iteration.
 */
export async function loadIterationTraces(
  workspacePath: string,
  iteration: number,
): Promise<Trace[]> {
  const tracesDir = path.join(workspacePath, 'traces', iteration.toString());
  const traces: Trace[] = [];

  try {
    const taskDirs = await fs.readdir(tracesDir);
    for (const taskId of taskDirs) {
      const trace = await loadTrace(path.join(tracesDir, taskId));
      traces.push(trace);
    }
  } catch {
    // Directory doesn't exist yet
  }

  return traces;
}

/**
 * Write all trace files to the given directory.
 * Writes stdout.log, stderr.log, tool_calls.jsonl, files_changed.json,
 * timing.json, and score.json.
 */
export async function writeTrace(traceDir: string, trace: Trace): Promise<void> {
  await fs.mkdir(traceDir, { recursive: true });
  await fs.writeFile(path.join(traceDir, 'stdout.log'), trace.stdout, 'utf-8');
  await fs.writeFile(path.join(traceDir, 'stderr.log'), trace.stderr, 'utf-8');

  // Write tool_calls.jsonl — one JSON object per line
  const toolCallsLines = trace.toolCalls
    .map(tc => JSON.stringify(tc))
    .join('\n');
  await fs.writeFile(path.join(traceDir, 'tool_calls.jsonl'), toolCallsLines, 'utf-8');

  await fs.writeFile(
    path.join(traceDir, 'files_changed.json'),
    JSON.stringify(trace.filesChanged, null, 2),
    'utf-8',
  );
  await fs.writeFile(
    path.join(traceDir, 'timing.json'),
    JSON.stringify(trace.timing, null, 2),
    'utf-8',
  );
  await fs.writeFile(
    path.join(traceDir, 'score.json'),
    JSON.stringify(trace.score, null, 2),
    'utf-8',
  );
}

/**
 * Write or overwrite only the score.json file in an existing trace directory.
 * Used to update the score after scoring runs separately from trace capture.
 */
export async function writeScore(traceDir: string, score: Score): Promise<void> {
  await fs.writeFile(
    path.join(traceDir, 'score.json'),
    JSON.stringify(score, null, 2),
    'utf-8',
  );
}

/**
 * Check whether a trace directory has been populated.
 * Returns true if stdout.log exists inside traceDir.
 */
export async function traceExists(traceDir: string): Promise<boolean> {
  try {
    await fs.access(path.join(traceDir, 'stdout.log'));
    return true;
  } catch {
    return false;
  }
}
