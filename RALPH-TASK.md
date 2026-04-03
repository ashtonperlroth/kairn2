# Ralph Loop Task: v2.14.0 — Semantic Codebase Analyzer

## Context

**Version:** v2.14.0  
**Branch:** `feature/v2.14.0-semantic-analyzer`  
**Plan:** `PLAN-v2.14.0.md`  
**ROADMAP:** See `ROADMAP.md` → v2.14.0 section  
**Current state:** main = v2.13.0 (principal-as-architect shipped)

## Goal

The scanner extracts metadata (deps, scripts, file existence) but never reads source code. Generated harnesses are generic because the LLM agents don't know what the project actually does. Fix this by adding a semantic analysis stage that:

1. Samples important source files using language-specific heuristics + Repomix
2. Feeds sampled code to an LLM to produce a structured `ProjectAnalysis`
3. Injects `ProjectAnalysis` into the compilation intent so all agents receive domain context
4. Fails hard if analysis can't be completed — no hallucinated harnesses

## Pre-Steps (before Phase 1)

1. Verify main is at v2.13.0: `git log --oneline -1 main`
2. Create feature branch: `git checkout -b feature/v2.14.0-semantic-analyzer`
3. Bump version: edit `package.json` to `"version": "2.14.0"`
4. Install dependency: `npm install repomix`
5. Commit: `git commit -am "chore: bump to v2.14.0, add repomix dependency"`

## Implementation Plan

Read `PLAN-v2.14.0.md` for full specification. Here are the ordered steps:

### Step 1: Types + Repomix dependency (parallel-safe)
**Files:** `src/analyzer/types.ts` (create)

1. Create `src/analyzer/` directory
2. Define `ProjectAnalysis`, `AnalysisModule`, `AnalysisWorkflow`, `DataflowEdge`, `ConfigKey` interfaces
3. Define `AnalysisError` class with typed error categories: `no_entry_point`, `empty_sample`, `llm_parse_failure`, `repomix_failure`
4. Define `AnalysisCache` interface with content_hash and kairn_version

**Tests:** `src/analyzer/__tests__/types.test.ts`  
**Commit:** `feat(analyzer): add ProjectAnalysis types and AnalysisError class`

### Step 2: Language-specific sampling strategies (parallel-safe)
**Files:** `src/analyzer/patterns.ts` (create)

1. Define `SamplingStrategy` interface: language, extensions, entryPoints, domainPatterns, configPatterns, excludePatterns, maxFilesPerCategory
2. Implement strategies for Python, TypeScript, Go, Rust
3. `getStrategy(language)` — returns matching strategy or null
4. `getAlwaysInclude()` — returns `['README.md', 'README.rst', '*.toml', '*.yaml', '*.yml']`

**Python strategy specifics:**
- Entry: `main.py`, `app.py`, `run.py`, `cli.py`, `server.py`, `__main__.py`
- Domain: `src/`, `lib/`, `models/`, `pipelines/`, `services/`, `api/`, `core/`
- Exclude: `__pycache__`, `*.pyc`, `test_*`, `*_test.py`, `.venv/`, `dist/`

**TypeScript strategy specifics:**
- Entry: `src/index.ts`, `src/main.ts`, `src/app.ts`, `src/cli.ts`
- Domain: `src/lib/`, `src/services/`, `src/modules/`, `src/api/`, `src/routes/`
- Exclude: `__tests__/`, `*.test.ts`, `*.spec.ts`, `node_modules/`, `dist/`

**Tests:** `src/analyzer/__tests__/patterns.test.ts`  
**Commit:** `feat(analyzer): language-specific file sampling strategies`

### Step 3: Repomix adapter (depends on Step 1)
**Files:** `src/analyzer/repomix-adapter.ts` (create)

1. Wrap Repomix for programmatic use
2. Export `packCodebase(dir, options)` → `RepomixResult` (content, fileCount, tokenCount, filePaths)
3. Apply include/exclude patterns from sampling strategy
4. Enforce 5000-token budget — if exceeded, truncate by strategy priority
5. If Repomix library import fails, fall back to CLI: `npx repomix --output /tmp/kairn-pack.md ...`
6. Throw `AnalysisError('repomix_failure')` on total failure

**Tests:** `src/analyzer/__tests__/repomix-adapter.test.ts`  
**Commit:** `feat(analyzer): repomix adapter for intelligent file packing`

### Step 4: Analysis cache (parallel-safe after Step 1)
**Files:** `src/analyzer/cache.ts` (create)

1. `readCache(dir)` — reads `.kairn-analysis.json`, returns null if missing/invalid
2. `writeCache(dir, analysis)` — writes cache with content hash and kairn version
3. `computeContentHash(filePaths, dir)` — SHA-256 of concatenated sampled file contents
4. `isCacheValid(dir)` — checks hash match + kairn version match

**Tests:** `src/analyzer/__tests__/cache.test.ts`  
**Commit:** `feat(analyzer): analysis caching with content-hash invalidation`

### Step 5: Core analyzer (depends on Steps 2, 3, 4)
**Files:** `src/analyzer/analyze.ts` (create)

1. `analyzeProject(dir, profile, config, options?)` — main entry point
2. Flow: check cache → get strategy → pack with Repomix → LLM analysis → parse → cache → return
3. LLM system prompt: specific, anti-hallucination instructions (see PLAN for full prompt)
4. Parse response as JSON, validate required fields
5. Throw `AnalysisError` on any failure — **never return partial/generic results**

**Tests:** `src/analyzer/__tests__/analyze.test.ts`  
**Commit:** `feat(analyzer): core semantic analysis with LLM and fail-hard policy`

### Step 6: Pipeline integration (depends on Step 5)
**Files:** `src/commands/optimize.ts` (modify)

1. Import `analyzeProject` and `AnalysisError`
2. After `scanProject()` and profile display, add "Codebase Analysis" section:
   - Show spinner during analysis
   - Display: purpose, domain, modules, workflows
   - On `AnalysisError`: show error box and exit
3. Update `buildOptimizeIntent()` to accept and include `ProjectAnalysis`:
   - Add `## Semantic Analysis` section with purpose, domain, architecture, deployment
   - Add `### Key Modules` with name, path, description, responsibilities
   - Add `### Core Workflows` with name, trigger, steps
   - Add `### Dataflow` edges
   - Add `### Configuration` keys

**Tests:** `src/compiler/__tests__/integration.test.ts` (modify)  
**Commit:** `feat(optimize): integrate semantic analyzer into compilation pipeline`

### Step 7: `kairn analyze` CLI command (depends on Step 5)
**Files:** `src/commands/analyze.ts` (create), `src/cli.ts` (modify)

1. Create `analyzeCommand` with options: `--refresh`, `--json`
2. Show formatted analysis: purpose, domain, modules, workflows, dataflow, config keys
3. Show cache status: "Using cached analysis (2h old)" vs "Analyzing from scratch..."
4. `--json` outputs raw JSON for piping
5. Register in `cli.ts`

**Tests:** CLI help output  
**Commit:** `feat(cli): add kairn analyze command`

### Step 8: Integration tests (depends on Step 6)
**Files:** Various test files

1. Verify enriched intent includes analysis fields (purpose, domain, modules)
2. Verify optimize pipeline calls analyzer before compile
3. Verify `kairn describe` in empty dir still works (no analyzer involved)
4. Verify fail-hard: mock analysis failure → optimize exits with error

**Commit:** `test(analyzer): integration tests for optimize pipeline`

### Step 9: Finalize
1. `npm run build` — must succeed
2. `npx vitest run` — all tests pass
3. Update CHANGELOG.md with v2.14.0 entry
4. Update ROADMAP.md checkboxes
5. `node dist/cli.js --help` — verify commands
6. `git log --oneline -15` — verify commit history

**Commit:** `chore: v2.14.0 finalization`

## Key Constraints

- **TDD mandatory:** RED → GREEN → REFACTOR for every step
- **Strict TypeScript:** no `any`, no `ts-ignore`, `.js` extensions on imports
- **Max 3 fix rounds** in review phase
- **Fail hard:** AnalysisError on any failure — do NOT fallback to metadata-only
- **Preserve all existing tests** — none may break
- **Backward compatible:** `kairn describe` works exactly as before

## Success Criteria

1. `kairn analyze` in a real Python project → returns domain-specific analysis (not generic)
2. `kairn optimize` in a real project → generated CLAUDE.md references actual modules and workflows
3. `kairn analyze` in empty dir → throws AnalysisError with actionable message
4. `kairn analyze --refresh` bypasses cache
5. `.kairn-analysis.json` caching works (second run is instant)
6. `kairn describe` in empty dir → unchanged behavior
7. All existing tests pass + new tests pass
8. `npm run build` clean
