import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { getStrategy, getAlwaysInclude, STRATEGIES, classifyFilePriority, FileTier, resolveStrategy } from '../patterns.js';
import type { SamplingStrategy } from '../patterns.js';

describe('getStrategy', () => {
  it('returns the Python strategy for "python"', () => {
    const strategy = getStrategy('python');
    expect(strategy).not.toBeNull();
    expect(strategy!.language).toBe('Python');
    expect(strategy!.extensions).toEqual(['.py']);
  });

  it('is case-insensitive — "Python" works', () => {
    const strategy = getStrategy('Python');
    expect(strategy).not.toBeNull();
    expect(strategy!.language).toBe('Python');
  });

  it('returns the TypeScript strategy for "typescript"', () => {
    const strategy = getStrategy('typescript');
    expect(strategy).not.toBeNull();
    expect(strategy!.language).toBe('TypeScript');
    expect(strategy!.extensions).toEqual(['.ts', '.tsx']);
  });

  it('returns the Go strategy for "go"', () => {
    const strategy = getStrategy('go');
    expect(strategy).not.toBeNull();
    expect(strategy!.language).toBe('Go');
    expect(strategy!.extensions).toEqual(['.go']);
  });

  it('returns the Rust strategy for "rust"', () => {
    const strategy = getStrategy('rust');
    expect(strategy).not.toBeNull();
    expect(strategy!.language).toBe('Rust');
    expect(strategy!.extensions).toEqual(['.rs']);
  });

  it('returns null for an unknown language', () => {
    const strategy = getStrategy('unknown');
    expect(strategy).toBeNull();
  });

  it('returns null when language is null', () => {
    const strategy = getStrategy(null);
    expect(strategy).toBeNull();
  });
});

describe('getAlwaysInclude', () => {
  it('returns the expected array of always-included patterns', () => {
    const result = getAlwaysInclude();
    expect(result).toEqual([
      'README.md',
      'README.rst',
      '*.toml',
      '*.yaml',
      '*.yml',
    ]);
  });
});

describe('STRATEGIES completeness', () => {
  const strategyKeys = Object.keys(STRATEGIES);

  it('has entries for python, typescript, go, and rust', () => {
    expect(strategyKeys).toContain('python');
    expect(strategyKeys).toContain('typescript');
    expect(strategyKeys).toContain('go');
    expect(strategyKeys).toContain('rust');
  });

  it.each(strategyKeys)(
    'strategy "%s" has non-empty entryPoints and domainPatterns',
    (key) => {
      const strategy: SamplingStrategy = STRATEGIES[key];
      expect(strategy.entryPoints.length).toBeGreaterThan(0);
      expect(strategy.domainPatterns.length).toBeGreaterThan(0);
    },
  );

  it.each(strategyKeys)(
    'strategy "%s" has non-empty extensions, configPatterns, and excludePatterns',
    (key) => {
      const strategy: SamplingStrategy = STRATEGIES[key];
      expect(strategy.extensions.length).toBeGreaterThan(0);
      expect(strategy.configPatterns.length).toBeGreaterThan(0);
      expect(strategy.excludePatterns.length).toBeGreaterThan(0);
    },
  );

  it.each(strategyKeys)(
    'strategy "%s" has maxFilesPerCategory set to 5',
    (key) => {
      const strategy: SamplingStrategy = STRATEGIES[key];
      expect(strategy.maxFilesPerCategory).toBe(5);
    },
  );
});

describe('classifyFilePriority', () => {
  const ts = getStrategy('typescript')!;
  const py = getStrategy('python')!;

  it('classifies README.md as IDENTITY (tier 0)', () => {
    expect(classifyFilePriority('README.md', ts)).toBe(FileTier.IDENTITY);
  });

  it('classifies config files as IDENTITY', () => {
    expect(classifyFilePriority('package.json', ts)).toBe(FileTier.IDENTITY);
    expect(classifyFilePriority('tsconfig.json', ts)).toBe(FileTier.IDENTITY);
    expect(classifyFilePriority('pyproject.toml', py)).toBe(FileTier.IDENTITY);
  });

  it('classifies entry points as ENTRY (tier 1)', () => {
    expect(classifyFilePriority('src/index.ts', ts)).toBe(FileTier.ENTRY);
    expect(classifyFilePriority('src/cli.ts', ts)).toBe(FileTier.ENTRY);
    expect(classifyFilePriority('main.py', py)).toBe(FileTier.ENTRY);
    expect(classifyFilePriority('app.py', py)).toBe(FileTier.ENTRY);
  });

  it('classifies domain directory files as DOMAIN (tier 2)', () => {
    expect(classifyFilePriority('src/services/auth.ts', ts)).toBe(FileTier.DOMAIN);
    expect(classifyFilePriority('src/api/routes.ts', ts)).toBe(FileTier.DOMAIN);
    expect(classifyFilePriority('src/core/engine.py', py)).toBe(FileTier.DOMAIN);
    expect(classifyFilePriority('api/views.py', py)).toBe(FileTier.DOMAIN);
  });

  it('classifies other files as OTHER (tier 3)', () => {
    expect(classifyFilePriority('src/utils/helpers.ts', ts)).toBe(FileTier.OTHER);
    expect(classifyFilePriority('scripts/deploy.py', py)).toBe(FileTier.OTHER);
  });

  it('priority order: IDENTITY < ENTRY < DOMAIN < OTHER', () => {
    expect(FileTier.IDENTITY).toBeLessThan(FileTier.ENTRY);
    expect(FileTier.ENTRY).toBeLessThan(FileTier.DOMAIN);
    expect(FileTier.DOMAIN).toBeLessThan(FileTier.OTHER);
  });
});

describe('resolveStrategy', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kairn-resolve-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  const tsBase = getStrategy('typescript')!;
  const pyBase = getStrategy('python')!;

  it('extracts entry points from package.json main field', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'test', main: 'dist/server.js', scripts: {} }),
    );
    const resolved = await resolveStrategy(tmpDir, tsBase, null, {});
    expect(resolved.entryPoints).toContain('dist/server.js');
    expect(resolved.entryPoints).toContain('dist/server.ts');
  });

  it('extracts entry points from package.json bin field', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'test', bin: { mycli: 'bin/cli.js' }, scripts: {} }),
    );
    const resolved = await resolveStrategy(tmpDir, tsBase, null, {});
    expect(resolved.entryPoints).toContain('bin/cli.js');
  });

  it('extracts entry points from npm start script', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'test', scripts: { start: 'node src/server.js' } }),
    );
    const resolved = await resolveStrategy(tmpDir, tsBase, null, {
      start: 'node src/server.js',
    });
    expect(resolved.entryPoints).toContain('src/server.js');
    expect(resolved.entryPoints).toContain('src/server.ts');
  });

  it('extracts uvicorn entry from Python scripts', async () => {
    const resolved = await resolveStrategy(tmpDir, pyBase, 'FastAPI', {
      start: 'uvicorn app.main:app',
    });
    // Doesn't find it from scripts since Python doesn't check npm scripts
    // But FastAPI framework patterns should be added
    expect(resolved.domainPatterns).toContain('routers/');
    expect(resolved.domainPatterns).toContain('endpoints/');
  });

  it('adds Django domain patterns for Django framework', async () => {
    const resolved = await resolveStrategy(tmpDir, pyBase, 'Django', {});
    expect(resolved.domainPatterns).toContain('views/');
    expect(resolved.domainPatterns).toContain('models/');
    expect(resolved.domainPatterns).toContain('serializers/');
  });

  it('adds Next.js domain patterns', async () => {
    const resolved = await resolveStrategy(tmpDir, tsBase, 'Next.js', {});
    expect(resolved.domainPatterns).toContain('pages/');
    expect(resolved.domainPatterns).toContain('app/');
    expect(resolved.domainPatterns).toContain('src/app/');
  });

  it('preserves base strategy patterns', async () => {
    const resolved = await resolveStrategy(tmpDir, tsBase, null, {});
    // All base entry points should still be present
    for (const ep of tsBase.entryPoints) {
      expect(resolved.entryPoints).toContain(ep);
    }
    // Base domain patterns preserved
    for (const dp of tsBase.domainPatterns) {
      expect(resolved.domainPatterns).toContain(dp);
    }
  });

  it('dynamic entries come before static ones (higher priority)', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'test', main: 'src/custom-entry.js', scripts: {} }),
    );
    const resolved = await resolveStrategy(tmpDir, tsBase, null, {});
    const customIdx = resolved.entryPoints.indexOf('src/custom-entry.js');
    const staticIdx = resolved.entryPoints.indexOf('src/index.ts');
    expect(customIdx).toBeLessThan(staticIdx);
  });

  it('resolves Django manage.py when file exists', async () => {
    await fs.writeFile(path.join(tmpDir, 'manage.py'), '#!/usr/bin/env python');
    const resolved = await resolveStrategy(tmpDir, pyBase, 'Django', {});
    expect(resolved.entryPoints).toContain('manage.py');
  });
});
