# Kairn Roadmap

> From local CLI to the coordination layer for agent environments.

---

## v1.x — Local CLI (Current)

### v1.0.0 ✅
- [x] `kairn init` — multi-provider setup (Anthropic, OpenAI, Google)
- [x] `kairn describe` — intent → environment compilation → .claude/ directory
- [x] `kairn list` — show saved environments
- [x] `kairn activate` — re-deploy saved environments
- [x] `kairn update-registry` — fetch latest tool catalog
- [x] 18 curated tools across search, code, data, communication, design
- [x] Security rules and deny lists by default
- [x] Session continuity patterns (help, tasks, decisions, learnings)

### v1.1.0 ✅
- [x] `kairn optimize` — scan existing codebases, audit and optimize harnesses
- [x] Project scanner (language, framework, deps, scripts, env keys, CI/CD)
- [x] Harness auditor (CLAUDE.md quality, missing commands/rules, MCP bloat)
- [x] Correct model IDs + backward-compatible config migration

### v1.2.0
- [ ] Template gallery — pre-built environments for common workflows
- [ ] `kairn templates` — browse and activate templates
- [ ] `kairn optimize --diff` — preview changes before writing
- [ ] Monorepo and multi-project scanner improvements

### v1.3.0
- [ ] `kairn doctor` — validate environments against Claude Code spec
- [ ] Registry management (`kairn registry list`, `kairn registry add`)
- [ ] Community tool submissions

### v1.4.0
- [ ] Hermes runtime adapter
- [ ] Cross-runtime support (`kairn describe --runtime hermes`)

---

## v2.x — Hosted Compilation

- [ ] Free hosted compilation endpoint — no local LLM key needed
- [ ] Web dashboard for environment management
- [ ] Template marketplace — share and discover environments
- [ ] Detect and adapt to existing user MCP servers

---

## v3.x — Integrated Payments

- [ ] Zero-friction tool provisioning via Stripe MPP
- [ ] Usage tracking and spending controls
- [ ] BYOK (bring your own key) flow for non-MPP tools

---

## v4.x — Learning System

- [ ] Automated tool discovery (GitHub, npm, community)
- [ ] Usage-based quality scoring
- [ ] Workflow-to-environment recommendation model

---

## Principles

1. **Minimal over complete.** Fewer, well-chosen tools beat many generic ones.
2. **Workflow-specific over generic.** Every generated file relates to the actual task.
3. **Local-first.** Everything works offline. Hosted features are optional.
4. **Transparent.** Users can inspect every generated file.
5. **Security by default.** Every environment includes deny rules and security guidance.
