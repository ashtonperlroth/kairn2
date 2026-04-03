/**
 * Tests for persistHarnessIR — writes HarnessIR to .kairn/harness-ir.json.
 *
 * Verifies:
 * - .kairn/ directory is created if missing
 * - harness-ir.json contains valid JSON matching the IR structure
 * - Existing .kairn/ directory is reused without error
 * - File is human-readable (pretty-printed with 2-space indent)
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { createEmptyIR } from '../../ir/types.js';
import type { HarnessIR } from '../../ir/types.js';
import { persistHarnessIR } from '../persist.js';

describe('persistHarnessIR', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join('/tmp', `kairn-persist-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('creates .kairn directory if it does not exist', async () => {
    const ir = createEmptyIR();

    await persistHarnessIR(tempDir, ir);

    const stat = await fs.stat(path.join(tempDir, '.kairn'));
    expect(stat.isDirectory()).toBe(true);
  });

  it('writes harness-ir.json to the .kairn directory', async () => {
    const ir = createEmptyIR();

    await persistHarnessIR(tempDir, ir);

    const filePath = path.join(tempDir, '.kairn', 'harness-ir.json');
    const stat = await fs.stat(filePath);
    expect(stat.isFile()).toBe(true);
  });

  it('writes valid JSON that can be parsed back', async () => {
    const ir = createEmptyIR();

    await persistHarnessIR(tempDir, ir);

    const filePath = path.join(tempDir, '.kairn', 'harness-ir.json');
    const content = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(content) as HarnessIR;

    expect(parsed).toBeDefined();
    expect(parsed.meta).toBeDefined();
    expect(parsed.sections).toBeDefined();
    expect(parsed.commands).toBeDefined();
    expect(parsed.rules).toBeDefined();
    expect(parsed.agents).toBeDefined();
    expect(parsed.skills).toBeDefined();
    expect(parsed.docs).toBeDefined();
    expect(parsed.hooks).toBeDefined();
    expect(parsed.settings).toBeDefined();
    expect(parsed.mcpServers).toBeDefined();
    expect(parsed.intents).toBeDefined();
  });

  it('preserves IR structure with populated fields', async () => {
    const ir = createEmptyIR();
    ir.meta = {
      name: 'test-project',
      purpose: 'Testing IR persistence',
      techStack: { language: 'TypeScript', framework: 'Express' },
      autonomyLevel: 2,
    };
    ir.sections = [
      { id: 'purpose', heading: '## Purpose', content: 'A test project', order: 1 },
    ];
    ir.commands = [
      { name: 'build', description: 'Build the project', content: 'npm run build' },
    ];
    ir.rules = [
      { name: 'security', content: '# Security rules', paths: ['**/*'] },
    ];

    await persistHarnessIR(tempDir, ir);

    const filePath = path.join(tempDir, '.kairn', 'harness-ir.json');
    const content = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(content) as HarnessIR;

    expect(parsed.meta.name).toBe('test-project');
    expect(parsed.meta.purpose).toBe('Testing IR persistence');
    expect(parsed.meta.techStack.language).toBe('TypeScript');
    expect(parsed.meta.techStack.framework).toBe('Express');
    expect(parsed.meta.autonomyLevel).toBe(2);
    expect(parsed.sections).toHaveLength(1);
    expect(parsed.sections[0].id).toBe('purpose');
    expect(parsed.commands).toHaveLength(1);
    expect(parsed.commands[0].name).toBe('build');
    expect(parsed.rules).toHaveLength(1);
    expect(parsed.rules[0].name).toBe('security');
    expect(parsed.rules[0].paths).toEqual(['**/*']);
  });

  it('writes human-readable JSON with 2-space indentation', async () => {
    const ir = createEmptyIR();

    await persistHarnessIR(tempDir, ir);

    const filePath = path.join(tempDir, '.kairn', 'harness-ir.json');
    const content = await fs.readFile(filePath, 'utf-8');

    // Should contain newlines (pretty-printed, not single-line)
    expect(content).toContain('\n');
    // Should use 2-space indentation
    expect(content).toContain('  "meta"');
  });

  it('succeeds when .kairn directory already exists', async () => {
    // Pre-create the directory
    await fs.mkdir(path.join(tempDir, '.kairn'), { recursive: true });

    const ir = createEmptyIR();

    // Should not throw
    await persistHarnessIR(tempDir, ir);

    const filePath = path.join(tempDir, '.kairn', 'harness-ir.json');
    const content = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(content) as HarnessIR;
    expect(parsed.meta).toBeDefined();
  });

  it('overwrites existing harness-ir.json on subsequent calls', async () => {
    const ir1 = createEmptyIR();
    ir1.meta.name = 'first-project';

    await persistHarnessIR(tempDir, ir1);

    const ir2 = createEmptyIR();
    ir2.meta.name = 'second-project';

    await persistHarnessIR(tempDir, ir2);

    const filePath = path.join(tempDir, '.kairn', 'harness-ir.json');
    const content = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(content) as HarnessIR;

    expect(parsed.meta.name).toBe('second-project');
  });

  it('returns the file path that was written', async () => {
    const ir = createEmptyIR();

    const result = await persistHarnessIR(tempDir, ir);

    expect(result).toBe(path.join(tempDir, '.kairn', 'harness-ir.json'));
  });
});
