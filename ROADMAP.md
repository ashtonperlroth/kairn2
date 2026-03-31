# Kairn Roadmap

> From local CLI to the coordination layer for agent environments.

---

## v1.x — Local CLI (Current)

The skateboard. Prove the environment compiler works.

### v1.0.0 ✅ (shipped)
- [x] `kairn init` — multi-provider setup (Anthropic, OpenAI, Google)
- [x] `kairn describe` — intent → LLM compilation → .claude/ directory
- [x] `kairn list` — show saved environments
- [x] `kairn activate` — re-deploy saved environments
- [x] `kairn update-registry` — fetch latest tool catalog
- [x] Bundled tool registry (18 curated tools)
- [x] Claude Code adapter (commands, rules, skills, agents, docs)
- [x] Security rules and deny lists by default
- [x] Hermes-inspired patterns (help, tasks, continuity, decisions, learnings)

### v1.1.0 🔜 (ready to publish)
- [x] `kairn optimize` — scan existing codebases, audit/optimize harnesses
- [x] Project scanner (language, framework, deps, scripts, env keys, CI/CD)
- [x] Harness auditor (CLAUDE.md length, missing commands, missing rules)
- [x] Correct Anthropic model IDs (Sonnet 4.6, Opus 4.6, Haiku 4.5)
- [x] Backward-compatible config migration (old → new format)

### v1.2.0
- [ ] Template gallery — pre-built environments for common workflows
  - "ML Research", "Next.js App", "API Server", "Data Pipeline", "Content Writer"
- [ ] `kairn templates` — browse and activate pre-built environments
- [ ] `kairn optimize --diff` — show what would change before writing
- [ ] Better scanner: detect monorepo structure, detect existing MCP servers

### v1.3.0
- [ ] `kairn doctor` — validate generated environments against Claude Code spec
- [ ] Plugin installation instructions per-platform (VS Code, CLI, etc.)
- [ ] Registry categories and filtering (`kairn registry list --category search`)
- [ ] User-contributed tools (`kairn registry add --url`)

### v1.4.0
- [ ] Hermes adapter — generate config.yaml + skills for Hermes runtime
- [ ] OpenClaw adapter — generate skill packages + config
- [ ] Cross-runtime support (`kairn describe --runtime hermes`)

---

## v2.x — Hosted Compilation + Free Tier

Stand up infrastructure. Give away the compiler, build the user base.

### v2.0.0
- [ ] Hosted compilation endpoint (`POST /api/compile`)
  - Free, no account required
  - Rate limited: 5/day anonymous, 20/day with GitHub login
  - Cheaper model (Haiku) for free tier, Sonnet for authenticated
- [ ] `kairn describe` uses hosted endpoint by default (no local LLM key needed)
  - `--local` flag to force local compilation with own key
- [ ] Web dashboard shell (Next.js + Supabase)
  - Sign up (GitHub OAuth)
  - Environment list
  - Usage tracking

### v2.1.0
- [ ] Template marketplace — users share environment specs
  - Upvote/downvote, install count, verified badge
- [ ] `kairn publish <env_id>` — share an environment to the marketplace
- [ ] `kairn search "next.js auth"` — find community environments

### v2.2.0
- [ ] Detect and adapt to existing user MCP servers
  - Run `claude mcp list`, diff against recommended tools
  - "You already have Exa installed globally — skipping"
- [ ] Smart registry updates (delta sync, not full replace)
- [ ] Environment versioning — track changes to .claude/ over time

---

## v3.x — Payment Layer (Stripe MPP)

Monetize. Users pay Kairn, Kairn pays vendors.

### v3.0.0
- [ ] Stripe integration (customer creation, payment methods)
- [ ] MPP client (handle 402 challenges from vendors)
- [ ] Shared Payment Token (SPT) creation at onboarding
- [ ] `kairn connect` — link Stripe payment method
- [ ] MPP-native tools "just work" — no API keys needed
  - Anthropic, OpenAI, Exa, Browserbase, Modal, AgentMail

### v3.1.0
- [ ] Usage tracking and billing dashboard
  - Per-tool, per-environment, per-day breakdown
  - Spending limits (per-environment, monthly cap)
  - Alerts at 50%, 80%, 100% of limits
- [ ] Subscription tiers
  - Free: 3 environments, 5% markup on tool costs
  - Pro ($20/mo): Unlimited, passthrough at cost
  - Team ($50/mo): Shared environments, team billing

### v3.2.0
- [ ] BYOK flow for non-MPP tools
  - User provides own API keys, stored encrypted in Kairn vault
  - OAuth browser redirect for Google, Slack, Notion
- [ ] Pre-run cost estimates in `kairn describe` output
- [ ] `kairn spend` — show current month's usage

---

## v4.x — Learning System

Get smarter with every environment generated.

### v4.0.0
- [ ] Discovery pipeline (automated, daily)
  - GitHub trending scraper — new MCP servers, plugins, agent tools
  - npm release watcher — @modelcontextprotocol packages
  - Flagged for human review before adding to registry
- [ ] Usage analytics — which tools are used most, for which workflows
- [ ] Quality scoring v1 — user feedback (thumbs up/down on tool recommendations)

### v4.1.0
- [ ] Workflow embeddings — vectorize workflow descriptions
- [ ] Collaborative filtering — "users with similar workflows used these tools"
- [ ] Realistic cost estimates based on actual usage data

### v4.2.0
- [ ] Trained recommendation model
  - Input: workflow description
  - Output: optimal configuration (tools × skills × rules × hooks × prompt)
- [ ] A/B testing framework — test different tool combinations
- [ ] Optimal system prompt patterns per task category

---

## Long-Term Vision

- **Kairn becomes the default first step** for any agent workflow
- **The tool registry is the largest curated catalog** of agent-usable tools
- **The learning system means environments get better** without manual curation
- **MPP means zero-friction access** to any tool in the ecosystem
- **Any runtime, any agent** — Claude Code, Hermes, OpenClaw, Cursor, Codex, custom

---

## Principles (Unchanged Across All Versions)

1. **Minimal over complete.** Fewer, well-chosen tools beat many generic ones.
2. **Workflow-specific over generic.** Every generated instruction relates to the actual task.
3. **Local-first.** Even with hosted features, everything should work offline.
4. **Transparent.** Users can inspect every generated file. No hidden behavior.
5. **Security by default.** Every environment includes deny rules and security guidance.
