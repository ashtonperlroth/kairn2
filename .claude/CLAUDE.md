# Kairn — Agent Environment Compiler

You are building Kairn, a local-first CLI that compiles natural language intent into optimized Claude Code environments.

## Project Structure
```
src/cli.ts              → Commander.js entry, registers commands
src/commands/init.ts    → `kairn init` — API key setup
src/commands/describe.ts→ `kairn describe` — intent → compile → write
src/commands/list.ts    → `kairn list` — saved environments
src/compiler/compile.ts → Orchestrates the LLM compilation call
src/compiler/prompt.ts  → System prompt for compilation
src/adapter/claude-code.ts → EnvironmentSpec → .claude/ files
src/registry/tools.json → Bundled tool catalog
src/types.ts            → TypeScript types
src/config.ts           → Read/write ~/.kairn/config.json
```

## Tech Stack
- TypeScript (strict, ESM)
- Commander.js (CLI), @inquirer/prompts (interactive input)
- @anthropic-ai/sdk (compilation LLM call)
- chalk (terminal colors), tsup (bundling)

## Build & Test
```bash
npm run build          # tsup compiles to dist/
npm run dev            # tsup --watch
npx tsx src/cli.ts     # run directly during dev
```

## Coding Standards
- async/await everywhere, no callbacks
- @inquirer/prompts (not old inquirer package)
- chalk for colors: green=success, yellow=warn, red=error, cyan=info
- Errors: catch at command level, friendly message, exit 1
- Config: ~/.kairn/config.json via os.homedir()
- Envs: ~/.kairn/envs/ — create dir if missing
- IDs: crypto.randomUUID() prefixed with "env_"
- All file I/O via fs.promises

## Key Design Decisions
- Local-first: no server, no database, user's own LLM key
- Claude Code only for v1 (no Hermes/OpenClaw adapters)
- Minimal output: fewer tools = better, avoid context bloat
- Every generated environment includes: /project:help, /project:tasks, continuity rule, security rule
- Use .mcp.json (project-scoped) for MCP servers, not settings.json

## Reference Files
- ROADMAP.md — public feature roadmap
- CHANGELOG.md — release history
- ~/Projects/kairn-internal/PLAN.md — implementation plan (private)
- ~/Projects/kairn-internal/SPEC.md — product spec + business model (private)
- ~/Projects/kairn-internal/RESEARCH.md — ecosystem research (private)
