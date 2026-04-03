import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';
import { createRequire } from 'module';
import type { ProjectAnalysis } from './types.js';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json') as { version: string };

const CACHE_FILENAME = '.kairn-analysis.json';

/** Shape of the analysis cache file written to disk. */
export interface AnalysisCache {
  analysis: ProjectAnalysis;
  content_hash: string;
  kairn_version: string;
}

/**
 * Read a cached analysis from disk.
 *
 * Returns `null` if the cache file is missing or contains invalid JSON.
 */
export async function readCache(dir: string): Promise<AnalysisCache | null> {
  const filePath = path.join(dir, CACHE_FILENAME);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    return parsed as AnalysisCache;
  } catch {
    return null;
  }
}

/**
 * Write an analysis cache to disk.
 *
 * Persists the analysis along with its content_hash and the current kairn
 * CLI version for future invalidation checks.
 */
export async function writeCache(dir: string, analysis: ProjectAnalysis): Promise<void> {
  const filePath = path.join(dir, CACHE_FILENAME);
  const cache: AnalysisCache = {
    analysis,
    content_hash: analysis.content_hash,
    kairn_version: pkg.version,
  };
  await fs.writeFile(filePath, JSON.stringify(cache, null, 2), 'utf-8');
}

/**
 * Compute a SHA-256 content hash over a list of file paths.
 *
 * Reads each file relative to `dir`, concatenates their contents, and returns
 * the hex-encoded SHA-256 digest. Files that cannot be read (missing,
 * permission errors, etc.) are silently skipped.
 */
export async function computeContentHash(filePaths: string[], dir: string): Promise<string> {
  const hash = createHash('sha256');
  for (const filePath of filePaths) {
    try {
      const fullPath = path.join(dir, filePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      hash.update(content);
    } catch {
      // Skip files that can't be read
    }
  }
  return hash.digest('hex');
}

/**
 * Check whether a cached analysis is still valid.
 *
 * A cache is valid when both:
 * - The content hash matches the current hash (files haven't changed)
 * - The kairn CLI version matches (no schema changes across upgrades)
 */
export function isCacheValid(cache: AnalysisCache, currentHash: string): boolean {
  return cache.content_hash === currentHash && cache.kairn_version === pkg.version;
}
