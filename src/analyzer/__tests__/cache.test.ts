import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import type { ProjectAnalysis } from '../types.js';

const { readCache, writeCache, computeContentHash, isCacheValid, PACKED_SOURCE_FILENAME } =
  await import('../cache.js');

function makeAnalysis(overrides: Partial<ProjectAnalysis> = {}): ProjectAnalysis {
  return {
    purpose: 'Test project',
    domain: 'testing',
    key_modules: [],
    workflows: [],
    architecture_style: 'monolith',
    deployment_model: 'local',
    dataflow: [],
    config_keys: [],
    sampled_files: ['src/index.ts'],
    content_hash: 'abc123',
    analyzed_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('readCache', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kairn-cache-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('returns null for non-existent file', async () => {
    const result = await readCache(tempDir);
    expect(result).toBeNull();
  });

  it('returns null for invalid JSON', async () => {
    await fs.writeFile(path.join(tempDir, '.kairn-analysis.json'), 'not-json{{');
    const result = await readCache(tempDir);
    expect(result).toBeNull();
  });
});

describe('writeCache + readCache roundtrip', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kairn-cache-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('roundtrips correctly', async () => {
    const analysis = makeAnalysis({ content_hash: 'roundtrip-hash' });

    await writeCache(tempDir, analysis);
    const cached = await readCache(tempDir);

    expect(cached).not.toBeNull();
    expect(cached!.analysis.purpose).toBe('Test project');
    expect(cached!.analysis.domain).toBe('testing');
    expect(cached!.content_hash).toBe('roundtrip-hash');
    expect(typeof cached!.kairn_version).toBe('string');
    expect(cached!.kairn_version.length).toBeGreaterThan(0);
  });
});

describe('computeContentHash', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kairn-cache-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('returns consistent hash for same content', async () => {
    await fs.writeFile(path.join(tempDir, 'a.ts'), 'const x = 1;');
    await fs.writeFile(path.join(tempDir, 'b.ts'), 'const y = 2;');

    const hash1 = await computeContentHash(['a.ts', 'b.ts'], tempDir);
    const hash2 = await computeContentHash(['a.ts', 'b.ts'], tempDir);

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 hex is 64 chars
  });

  it('returns different hash for different content', async () => {
    await fs.writeFile(path.join(tempDir, 'a.ts'), 'const x = 1;');
    await fs.writeFile(path.join(tempDir, 'b.ts'), 'const y = 2;');

    const hash1 = await computeContentHash(['a.ts', 'b.ts'], tempDir);

    await fs.writeFile(path.join(tempDir, 'b.ts'), 'const y = 999;');

    const hash2 = await computeContentHash(['a.ts', 'b.ts'], tempDir);

    expect(hash1).not.toBe(hash2);
  });

  it('skips missing files gracefully', async () => {
    await fs.writeFile(path.join(tempDir, 'a.ts'), 'const x = 1;');

    // Should not throw even though missing.ts does not exist
    const hash = await computeContentHash(['a.ts', 'missing.ts'], tempDir);
    expect(typeof hash).toBe('string');
    expect(hash.length).toBe(64);
  });
});

describe('isCacheValid', () => {
  it('returns true when hash and version match', async () => {
    const analysis = makeAnalysis({ content_hash: 'match-hash' });
    // Write and read to get a real cache object with the current kairn_version
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kairn-cache-test-'));
    try {
      await writeCache(tempDir, analysis);
      const cached = await readCache(tempDir);
      expect(cached).not.toBeNull();
      const result = isCacheValid(cached!, 'match-hash');
      expect(result).toBe(true);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it('returns false when hash differs', async () => {
    const analysis = makeAnalysis({ content_hash: 'hash-a' });
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kairn-cache-test-'));
    try {
      await writeCache(tempDir, analysis);
      const cached = await readCache(tempDir);
      expect(cached).not.toBeNull();
      const result = isCacheValid(cached!, 'different-hash');
      expect(result).toBe(false);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it('returns false when version differs', () => {
    const cache = {
      analysis: makeAnalysis({ content_hash: 'hash-a' }),
      content_hash: 'hash-a',
      kairn_version: '0.0.0-fake',
      packedSource: null,
    };
    // Current kairn version is not 0.0.0-fake, so this should be false
    const result = isCacheValid(cache, 'hash-a');
    expect(result).toBe(false);
  });
});

describe('packed source caching', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kairn-cache-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('writes packed source file alongside analysis cache', async () => {
    const analysis = makeAnalysis({ content_hash: 'packed-hash' });
    const packedSource = '// packed source code content\nconst x = 1;\n';

    await writeCache(tempDir, analysis, packedSource);

    const packedPath = path.join(tempDir, PACKED_SOURCE_FILENAME);
    const content = await fs.readFile(packedPath, 'utf-8');
    expect(content).toBe(packedSource);
  });

  it('reads packed source content back from cache', async () => {
    const analysis = makeAnalysis({ content_hash: 'packed-read-hash' });
    const packedSource = '// some packed code\nfunction hello() {}\n';

    await writeCache(tempDir, analysis, packedSource);
    const cached = await readCache(tempDir);

    expect(cached).not.toBeNull();
    expect(cached!.packedSource).toBe(packedSource);
  });

  it('returns null packedSource when packed source file is missing (backward compat)', async () => {
    const analysis = makeAnalysis({ content_hash: 'no-packed-hash' });

    // Write cache WITHOUT packed source (simulates old cache format)
    await writeCache(tempDir, analysis);
    // Manually delete the packed source file to simulate old cache
    const packedPath = path.join(tempDir, PACKED_SOURCE_FILENAME);
    try {
      await fs.unlink(packedPath);
    } catch {
      // File may not exist if writeCache without packedSource doesn't create it
    }

    const cached = await readCache(tempDir);

    expect(cached).not.toBeNull();
    expect(cached!.analysis.purpose).toBe('Test project');
    expect(cached!.packedSource).toBeNull();
  });

  it('writeCache without packedSource does not create packed source file', async () => {
    const analysis = makeAnalysis({ content_hash: 'no-packed-hash-2' });

    await writeCache(tempDir, analysis);

    const packedPath = path.join(tempDir, PACKED_SOURCE_FILENAME);
    await expect(fs.access(packedPath)).rejects.toThrow();
  });

  it('roundtrips analysis correctly even with packed source', async () => {
    const analysis = makeAnalysis({
      content_hash: 'roundtrip-packed',
      purpose: 'Packed roundtrip test',
    });
    const packedSource = 'const y = 42;\n';

    await writeCache(tempDir, analysis, packedSource);
    const cached = await readCache(tempDir);

    expect(cached).not.toBeNull();
    expect(cached!.analysis.purpose).toBe('Packed roundtrip test');
    expect(cached!.content_hash).toBe('roundtrip-packed');
    expect(cached!.packedSource).toBe(packedSource);
  });
});
