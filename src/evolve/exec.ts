import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Execute a shell command in a given directory with a timeout.
 * Returns `{ stdout, stderr }` on success; throws on non-zero exit.
 */
export async function execCommand(
  cmd: string,
  cwd: string,
  timeoutMs: number = 30_000,
): Promise<{ stdout: string; stderr: string }> {
  return execAsync(cmd, { cwd, timeout: timeoutMs });
}
