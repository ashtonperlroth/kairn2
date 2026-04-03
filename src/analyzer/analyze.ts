/**
 * Core semantic analyzer — analyzes a project's codebase via LLM to produce
 * a structured ProjectAnalysis describing its purpose, architecture, modules,
 * workflows, and data flow.
 *
 * Uses repomix to pack sampled source files and sends them to an LLM for
 * semantic understanding. Results are cached on disk and reused when the
 * sampled files haven't changed.
 */

import type { ProjectAnalysis } from './types.js';
import { AnalysisError } from './types.js';
import { getStrategy, getAlwaysInclude } from './patterns.js';
import { packCodebase } from './repomix-adapter.js';
import {
  readCache,
  writeCache,
  computeContentHash,
  isCacheValid,
} from './cache.js';
import { callLLM } from '../llm.js';
import type { ProjectProfile } from '../scanner/scan.js';
import type { KairnConfig } from '../types.js';

/**
 * System prompt for the analysis LLM call.
 *
 * Instructs the model to produce a structured JSON analysis of the codebase
 * with specific, grounded observations (no hallucination).
 */
const ANALYSIS_SYSTEM_PROMPT = `You are analyzing a codebase to understand its purpose, architecture, and key workflows.

You will receive sampled source files from the project. Produce a JSON analysis.

## Rules
- Be SPECIFIC. Don't say "data processing" — say "Bayesian posterior estimation via SBI".
- Don't list generic modules — list the domain-specific ones that define THIS project.
- Every field must reflect what you actually see in the code. If unsure, say "unknown".
- Do NOT hallucinate files, functions, or modules that aren't in the samples.

## Output Format
Return a single JSON object (no markdown fences, no explanation):
{
  "purpose": "one-line project goal",
  "domain": "category",
  "key_modules": [{ "name": "...", "path": "...", "description": "...", "responsibilities": ["..."] }],
  "workflows": [{ "name": "...", "description": "...", "trigger": "...", "steps": ["..."] }],
  "architecture_style": "monolithic | microservice | serverless | CLI | library | plugin",
  "deployment_model": "local | containerized | serverless | hybrid",
  "dataflow": [{ "from": "module_a", "to": "module_b", "data": "what flows between them" }],
  "config_keys": [{ "name": "ENV_VAR_NAME", "purpose": "what it configures" }]
}`;

/**
 * Analyze a project directory using semantic codebase understanding.
 *
 * Samples source files using a language-specific strategy, packs them with
 * repomix, and sends them to an LLM for structured analysis. The result is
 * cached on disk and reused when the sampled files haven't changed.
 *
 * @param dir - Absolute path to the project directory.
 * @param profile - Pre-scanned project profile from the scanner.
 * @param config - Kairn configuration with provider/model/API key.
 * @param options - Optional flags: `refresh` forces re-analysis even if cache is valid.
 * @returns Structured ProjectAnalysis describing the project.
 * @throws {AnalysisError} With type `no_entry_point` if no sampling strategy exists for the language.
 * @throws {AnalysisError} With type `empty_sample` if no source files are found.
 * @throws {AnalysisError} With type `llm_parse_failure` if the LLM response is not valid JSON or missing required fields.
 */
export async function analyzeProject(
  dir: string,
  profile: ProjectProfile,
  config: KairnConfig,
  options?: { refresh?: boolean },
): Promise<ProjectAnalysis> {
  // 1. Check cache (unless refresh is forced)
  if (!options?.refresh) {
    const cache = await readCache(dir);
    if (cache) {
      const currentHash = await computeContentHash(
        cache.analysis.sampled_files,
        dir,
      );
      if (isCacheValid(cache, currentHash)) {
        return cache.analysis;
      }
    }
  }

  // 2. Get language-specific sampling strategy
  const strategy = getStrategy(profile.language);
  if (!strategy) {
    throw new AnalysisError(
      'No sampling strategy for language: ' + (profile.language ?? 'unknown'),
      'no_entry_point',
      'Supported: Python, TypeScript, Go, Rust',
    );
  }

  // 3. Build include patterns from strategy
  const include = [
    ...strategy.entryPoints,
    ...strategy.domainPatterns.map((p) => p + '**/*'),
    ...strategy.configPatterns,
    ...getAlwaysInclude(),
  ];

  // 4. Pack codebase with repomix
  const packed = await packCodebase(dir, {
    include,
    exclude: strategy.excludePatterns,
    maxTokens: 5000,
  });

  // 5. Guard: empty sample
  if (packed.fileCount === 0) {
    throw new AnalysisError(
      'No source files found',
      'empty_sample',
      `Repomix returned 0 files for ${strategy.language} patterns`,
    );
  }

  // 6. Call LLM for semantic analysis
  const userMessage = buildUserMessage(strategy.language, profile, packed.content);

  const rawResponse = await callLLM(config, userMessage, {
    systemPrompt: ANALYSIS_SYSTEM_PROMPT,
    jsonMode: true,
    maxTokens: 4096,
    agentName: 'analyzer',
  });

  // 7. Parse the response
  const parsed = parseResponse(rawResponse);

  // 8. Validate required fields
  if (
    typeof parsed.purpose !== 'string' ||
    typeof parsed.domain !== 'string'
  ) {
    throw new AnalysisError(
      'LLM response missing required fields (purpose, domain)',
      'llm_parse_failure',
      JSON.stringify(Object.keys(parsed)),
    );
  }

  // 9. Compute content hash from the sampled files
  const contentHash = await computeContentHash(packed.filePaths, dir);

  // 10. Build the ProjectAnalysis
  const analysis: ProjectAnalysis = {
    purpose: parsed.purpose as string,
    domain: parsed.domain as string,
    key_modules: Array.isArray(parsed.key_modules)
      ? (parsed.key_modules as ProjectAnalysis['key_modules'])
      : [],
    workflows: Array.isArray(parsed.workflows)
      ? (parsed.workflows as ProjectAnalysis['workflows'])
      : [],
    architecture_style:
      (parsed.architecture_style as string) ?? 'unknown',
    deployment_model:
      (parsed.deployment_model as string) ?? 'unknown',
    dataflow: Array.isArray(parsed.dataflow)
      ? (parsed.dataflow as ProjectAnalysis['dataflow'])
      : [],
    config_keys: Array.isArray(parsed.config_keys)
      ? (parsed.config_keys as ProjectAnalysis['config_keys'])
      : [],
    sampled_files: packed.filePaths,
    content_hash: contentHash,
    analyzed_at: new Date().toISOString(),
  };

  // 11. Write cache and return
  await writeCache(dir, analysis);
  return analysis;
}

/**
 * Build the user message sent to the LLM for analysis.
 *
 * Includes project metadata, truncated dependency list, and packed source code.
 */
function buildUserMessage(
  language: string,
  profile: ProjectProfile,
  packedContent: string,
): string {
  return [
    `Analyze this ${language} project:`,
    '',
    `Project: ${profile.name}`,
    `Description: ${profile.description || 'none'}`,
    `Framework: ${profile.framework || 'none'}`,
    `Dependencies: ${profile.dependencies.slice(0, 20).join(', ')}`,
    '',
    '## Sampled Source Code',
    '',
    packedContent,
  ].join('\n');
}

/**
 * Parse raw LLM response into a Record, stripping markdown code fences if present.
 *
 * @throws {AnalysisError} With type `llm_parse_failure` if JSON parsing fails.
 */
function parseResponse(rawResponse: string): Record<string, unknown> {
  try {
    const cleaned = rawResponse
      .replace(/^```(?:json)?\s*\n?/m, '')
      .replace(/\n?```\s*$/m, '');
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    throw new AnalysisError(
      'Failed to parse LLM analysis response',
      'llm_parse_failure',
      rawResponse.slice(0, 200),
    );
  }
}
