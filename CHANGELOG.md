# Changelog

All notable changes to Kairn will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] — 2026-03-31

### Added
- **`kairn optimize`** — Scan existing codebases and generate or optimize Claude Code environments
  - Project scanner detects: language, framework, dependencies, test/build/lint commands, Docker, CI/CD, env keys
  - Harness auditor checks: CLAUDE.md length, missing commands, missing rules, MCP server count
  - `--audit-only` flag to inspect without generating changes
  - `--yes` flag to skip confirmation prompts
- Backward-compatible config migration — old configs (v1.0.0 format with `anthropic_api_key`) auto-migrate to new format without requiring `kairn init`

### Fixed
- Anthropic model IDs updated to current API names:
  - `claude-sonnet-4-6` (was `claude-sonnet-4-20250514`)
  - `claude-opus-4-6` (was `claude-opus-4-20250514`)
  - `claude-haiku-4-5-20251001` (was `claude-3-5-haiku-20241022`)

## [1.0.0] — 2026-03-30

### Added
- **`kairn init`** — Interactive API key setup with multi-provider support (Anthropic, OpenAI, Google) and model selection
- **`kairn describe`** — Compile natural language intent into optimized Claude Code environments
  - LLM-powered environment compilation
  - Generates: CLAUDE.md, settings.json, .mcp.json, commands/, rules/, skills/, agents/, docs/
  - `--yes` flag to skip confirmation
  - Progress indicator during compilation
- **`kairn list`** — Show all saved environments from `~/.kairn/envs/`
- **`kairn activate`** — Re-deploy a saved environment to any directory (accepts partial ID matching)
- **`kairn update-registry`** — Fetch latest tool catalog from GitHub with backup and validation
- Bundled tool registry with 18 curated tools across 6 tiers:
  - Universal: Context7, Sequential Thinking, security-guidance
  - Code: GitHub MCP, Playwright, Semgrep
  - Search: Exa, Brave Search, Firecrawl, Perplexity
  - Data: PostgreSQL (Bytebase), Supabase
  - Communication: Slack, Notion, Linear, AgentMail
  - Design: Figma, Frontend Design
- Claude Code adapter generating full .claude/ directory structure
- Hermes-inspired patterns in every environment:
  - `/project:help` command (environment guide)
  - `/project:tasks` command (TODO management)
  - `rules/continuity.md` (session memory via DECISIONS.md, LEARNINGS.md)
  - `rules/security.md` (essential security instructions)
- Security deny rules by default (rm -rf, curl|sh, .env, secrets/)
- Robust LLM error classification (auth, rate limit, billing, network, model not found)
- JSON parsing resilience (extracts JSON from wrapped responses)
