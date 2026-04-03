# Kairn — The Agent Environment Compiler

> Agent harnesses are programs. They should be compiled from intent and optimized through evolutionary search — not hand-written.

Every Claude Code project ships with a `.claude/` directory: system prompts, slash commands, rules, agents, hooks, MCP configs, security policies. Today, teams hand-write these files, cargo-culting from templates and fixing problems by trial and error. The harness *is* the program that shapes agent behavior, but nobody treats it like one.

Kairn treats it like one. You describe your workflow in natural language. Kairn compiles an optimized environment through a multi-agent pipeline — an @orchestrator plans the compilation, 6 specialist agents generate typed intermediate representation nodes in parallel, and a @linker validates cross-references before deterministic assembly. Then, optionally, Kairn *evolves* it: running real tasks against the harness, diagnosing failures via causal reasoning, proposing typed IR mutations, and repeating — with population-based training, Thompson sampling for task selection, and KL regularization to prevent bloat.

The result is a harness that's been compiled from intent and stress-tested against real work, not guessed at by a human reading docs.

**No servers. No accounts. No telemetry. Local-first, runs with your own LLM key.**

Kairn's own development environment was compiled and evolved by Kairn.

---

## What's Under the Hood

Most tools in this space either generate prompts or generate code. Kairn generates *full agent environments* — and then optimizes them as a system. Here's what that required building.

### Multi-Agent Compilation Pipeline (v2.11)

The monolithic "ask an LLM to produce a giant JSON blob" approach hits a wall at ~16K tokens: truncation, incoherence, format corruption. Kairn decomposes compilation into a DAG of specialist agents, each producing typed output within its own token budget.

```
Pass 1: Skeleton — LLM selects tools, outlines the project (max_tokens: 2048)
Pass 2: @orchestrator — reads skeleton + intent, emits a CompilationPlan
        (phased tasks, dependency ordering, per-agent token budgets)
Pass 3: Specialist agents — parallel fan-out across phases:
        Phase A: @sections-writer → Section[], @rule-writer → RuleNode[]
        Phase B: @command-writer → CommandNode[], @agent-writer → AgentNode[],
                 @skill-writer → SkillNode[]
        Phase C: @linker — cross-reference validation + auto-patching
Pass 4: Assembly — deterministic generation of settings.json, .mcp.json, hooks
```

Each specialist produces typed HarnessIR nodes, not strings. The @linker detects broken `@agent` references in commands, missing `/project:command` mentions in agents, and injects mandatory help/security/continuity rules if absent. If an agent's output is truncated (`stop_reason === 'max_tokens'`), the batch engine retries with doubled budget — one agent failing doesn't crash the whole compilation.

### Structured Harness IR (v2.7)

Raw Markdown mutation accumulates contradictions, corrupts formatting, and breaks as files grow. Kairn operates on a typed intermediate representation: 14 node types (Section, CommandNode, RuleNode, AgentNode, SkillNode, DocNode, HookNode, SettingsIR, McpServerNode, IntentNode, ...), 17 mutation operations, and a semantic diff engine.

The IR is round-trip tested: `parse → render → parse` preserves all content on real `.claude/` directories. The evolution loop mutates IR nodes directly — no regex replacement, no string surgery. The compilation pipeline produces IR, the evolution loop mutates IR, and the renderer writes files. One representation, end to end.

### Population-Based Training with Thompson Sampling (v2.6)

A single sequential evolution trajectory wastes wall-clock time on dead ends and overfits to its task sample. `kairn evolve pbt` runs N independent trajectories concurrently (default: 3), each with its own workspace, RNG seed, and Thompson Sampling beliefs.

**Thompson Sampling** maintains a Beta distribution per eval task. Tasks with volatile scores (high uncertainty) get sampled more often; stable tasks less. This is uncertainty-driven exploration — the system automatically focuses evaluation budget where signal is weakest, rather than uniform random sampling.

**KL Regularization** prevents harness bloat. Every mutation pays a complexity cost: `effective_score = raw_score - λ * complexityCost * 100`. The cost measures lines, files, sections, and character-level diff from baseline. The proposer must *earn* every addition. Default λ = 0.1.

After all branches complete, a **Meta-Principal** LLM agent reads all branch results — iteration logs, per-task score matrices, Thompson beliefs, complexity metrics — and synthesizes the optimal harness by cherry-picking the best mutations from each trajectory. The synthesis is evaluated against the full task suite and must beat the best individual branch.

### Hybrid Scoring (v2.8)

Eval quality is the bottleneck of any optimization loop. Kairn blends deterministic rubric criteria (shell command checks: does the harness include a test command? does security block `rm -rf`?) with LLM-as-judge scoring, in a configurable weighted combination. Anthropic prompt caching on system prompts saves ~85% of tokens on repeated proposer/scorer calls. After mutation, targeted re-evaluation re-runs only tasks whose harness files were touched, saving ~40% eval cost per iteration.

### Persistent Execution Loops (v2.10)

Generated harnesses include `/project:persist` — a loop that reads acceptance criteria from `docs/SPRINT.md`, works criterion-by-criterion with structured progress tracking in `.claude/progress.json`, auto-retries on verification failure (max 3 per criterion), and delegates to a review gate before completion. Progress persists across sessions via `memory.json`.

A `UserPromptSubmit` hook detects complex tasks (multi-step, feature-scope, refactoring, bug-with-repro) via 6 complexity signals and auto-routes them through the persistence loop. Simple tasks pass through normally. Configurable: `auto | manual | off`.

### Anthropic Harness Patterns (v2.9)

Comparative analysis against [Anthropic's harness design guidance](https://www.anthropic.com/engineering/harness-design-long-running-apps), [Everything Claude Code](https://github.com/affaan-m/everything-claude-code) (151 skills, 102 security rules), and [Oh-My-ClaudeCode](https://github.com/yeachan-heo/oh-my-claudecode) (model routing) identified 6 gaps. Kairn now generates:

- **Sprint contracts** — `@architect` outputs numbered acceptance criteria; `/project:develop` validates each one individually
- **Smart model routing** — agents include tiered routing guidance (Haiku for linting, Sonnet for implementation, Opus for architecture) with a `modelRouting` IR field
- **Expanded security** — PreToolUse patterns from 5 to 20+ across credential leaks, injection, destructive ops, and network exfiltration
- **Memory persistence** — SessionStart/End hooks save/load `.claude/memory.json` across sessions
- **Context reset protocol** — full PostCompact alternative for long sessions (>2 hours or >3 compactions)

### Self-Learning Intent Routing (v2.5)

Two-tier routing compiles project-specific intent patterns at generation time. Tier 1: regex patterns (<10ms, $0) match keywords and synonyms. Tier 2: Haiku-powered semantic classification (~$0.001) handles ambiguous prompts. A background learner promotes recurring Tier 2 patterns to Tier 1 regexes after 3+ matches. Over time, the harness learns the user's vocabulary: session 1 is 40% regex, session 10 is 90%.

---

## What Makes Kairn Different

**vs. DSPy** — DSPy optimizes *prompts*. Kairn optimizes *full environments*: system prompts, slash commands, rules, agents, hooks, MCP configs, security policies, intent routing — as a coherent system. DSPy's mutation space is string replacement on prompt templates. Kairn's is 17 typed IR operations on a 14-node-type intermediate representation with cross-reference validation.

**vs. OpenEvolve** — OpenEvolve optimizes *code*. Kairn optimizes the *harness that shapes how agents write code*. Different layer of the stack, different mutation space, different eval methodology (real agent execution traces, not unit tests).

**vs. Oh-My-ClaudeCode / static harness collections** — OMC ships a fixed set of 150 skills and 100+ rules. Kairn generates *project-specific* environments from intent, then evolves them against real tasks. Static harnesses can't adapt; Kairn's improve with use.

**vs. manual `.claude/` directories** — No memorizing command names (intent routing). No trial-and-error (evolution loop). No format corruption (typed IR). No cargo-culting (compiled from your actual workflow).

**The specific technical gaps:**
- Full-environment optimization (not just prompts, not just code)
- Typed IR mutations with pre-condition validation (not string replacement)
- Population-based evolutionary search with uncertainty-driven sampling
- Cross-component validation via the @linker (commands reference real agents, agents reference real commands)
- Self-learning intent routing that promotes patterns from expensive LLM classification to free regex

---

## Quick Start

```bash
npm install -g kairn-cli    # Node.js 18+

kairn init                   # Set up your LLM provider
kairn describe "Build a Next.js app with Supabase auth"
claude                       # Start Claude Code with the compiled harness
```

To evolve the harness:

```bash
kairn evolve init            # Auto-generate eval tasks from your project
kairn evolve baseline        # Snapshot current harness
kairn evolve run             # 5 iterations: evaluate → diagnose → mutate → re-evaluate
kairn evolve apply           # Deploy the best harness
```

Kairn generates the entire `.claude/` directory — CLAUDE.md, settings.json, commands, rules, agents, skills, hooks, docs, intent routing, security policies — plus `.mcp.json` and `.env`.

Supports 8 LLM providers: Anthropic, OpenAI, Google, xAI, DeepSeek, Mistral, Groq, and any OpenAI-compatible endpoint.

---

## The Evolution Engine

The heart of Kairn. Run your agent on real tasks, capture full execution traces, diagnose failures via causal reasoning, and mutate the harness iteratively.

```
Baseline (.claude/ snapshot)
      │
      ▼
  Iteration 1
  ├─ Evaluate: spawn Claude Code on each task, capture traces
  │   (stdout, MCP tool calls, file diffs, execution time, pass/fail)
  ├─ Diagnose: proposer (Sonnet) reads traces worst-first, performs causal reasoning
  │   ("Task A failed because CLAUDE.md doesn't mention the /api path")
  ├─ Mutate: propose 1-3 typed IR mutations
  │   (17 operation types: update/add/remove sections, commands, rules, agents, MCP servers, ...)
  ├─ Re-evaluate: run all tasks against the mutated harness
  └─ Accept improvement / rollback regression
      │
      ▼
  Iteration 2, 3, 4, 5...
      │
      ▼
  Best harness (apply to .claude/)
```

**Safety controls:** max 3 mutations per iteration, per-task regression guard (>20 point drop = rollback), adaptive eval pruning on middle iterations, loss-weighted proposer focus.

**Population-based mode:** `kairn evolve pbt` runs N parallel trajectories with Thompson Sampling + KL regularization, then synthesizes the optimal harness via Meta-Principal.

### Example: Evolution in Action

```bash
kairn evolve init && kairn evolve baseline
kairn evolve run --iterations 5

# Iteration 1/5
#   [task-1] pass  [task-2] fail  [task-3] pass  [task-4] fail  [task-5] pass
#   Score: 60%
#   Diagnosis: "password reset" not in CLAUDE.md, E2E tests need Playwright rule
#   Mutations: +/project:email command, +authentication section, +e2e.md rule
#
# Iteration 2/5
#   [task-1] pass  [task-2] pass  [task-3] pass  [task-4] pass  [task-5] pass
#   Score: 100% — accepting mutations
#
# Iteration 3/5
#   Score: 100% — CLAUDE.md bloated (142 lines), moving detail to rules/
#
# Iterations 4-5: plateau at 100%. No regressions.
#
# Final: baseline 60% → evolved 100%

kairn evolve apply    # Deploy the winning harness
```

See [docs/walkthroughs/](docs/walkthroughs/) for full examples including generation, optimization, and PBT runs.

---

## Vision

The architecture — typed IR, population-based training, multi-agent compilation with linker validation — was designed to extend from N=1 (one project, one harness) to N=500 (a fleet of agents with interdependent harnesses). Today Kairn compiles a single `.claude/` directory. The same pipeline generalizes to **swarm manifest compilation**: describe a fleet of agents with roles, contracts, and communication patterns; compile harnesses for each agent with inter-agent contract validation (agent A's output schema matches agent B's input expectations); evolve the fleet as a system, not individual harnesses in isolation.

The linker already validates cross-references within a single harness (commands ↔ agents ↔ rules). Extending it to validate cross-references *between* harnesses — inter-agent contracts, shared MCP server configurations, compatible security policies — is the path from project-scoped optimization to fleet-scale coordination.

---

## Command Reference

| Command | Description |
|---------|-------------|
| `kairn init` | Interactive LLM provider setup (8 providers, API key stored locally) |
| `kairn describe <intent>` | Compile intent → optimized `.claude/` environment |
| `kairn optimize` | Scan existing project, audit + regenerate harness (`--diff` to preview) |
| `kairn templates` | Browse and activate pre-built environments (Next.js, API, Research, Content) |
| `kairn doctor` | Validate environment against Claude Code best practices |
| `kairn keys` | Manage API keys for MCP servers (`--show` to audit) |
| `kairn list` / `kairn activate <id>` | Save, browse, and re-deploy environments |
| `kairn evolve init` | Scaffold evolution workspace, auto-generate eval tasks |
| `kairn evolve baseline` | Snapshot current `.claude/` as iteration 0 |
| `kairn evolve run` | Full evolution loop (`--iterations N`, `--parallel N`, `--runs N`) |
| `kairn evolve pbt` | Population-based training (N parallel branches + Meta-Principal synthesis) |
| `kairn evolve report` | Markdown/JSON summary with leaderboard and counterfactual diagnosis |
| `kairn evolve diff <i1> <i2>` | Harness changes between two iterations |
| `kairn evolve apply` | Deploy best (or specified) harness to `.claude/` |

**Describe options:** `--quick` (skip clarification), `--autonomy 1-4` (guided → full auto), `--runtime hermes` (Hermes adapter)

**Evolve options:** `--sampling thompson|uniform`, `--kl-lambda 0.1`, `--pbt-branches 3`, `--task <id>` (single task)

---

## What Gets Generated

```
.claude/
├── CLAUDE.md              # Workflow-specific system prompt (7 sections)
├── settings.json          # Permissions, hooks, security rules, intent routing
├── commands/              # Slash commands (/project:help, /project:plan, etc.)
├── rules/                 # Auto-loaded instructions (security, continuity, paths)
├── skills/                # Model-controlled capabilities (code, research, writing)
├── agents/                # Specialized subagents (@architect, @tester, etc.)
├── docs/                  # Pre-initialized project memory
├── hooks/                 # Intent router (Tier 1 regex + Tier 2 Haiku classifier)
│   ├── intent-router.mjs      # Project-specific regex patterns + fallthrough
│   ├── intent-learner.mjs     # Promotes recurring Tier 2 patterns to Tier 1
│   └── intent-log.jsonl       # Log of routed prompts (for learning)
└── QUICKSTART.md          # Interactive startup guide (Level 2-4)
.mcp.json                  # Project-scoped MCP server config
.env                       # API keys (gitignored, masked in output)
```

**Tool registry:** 28 curated MCP servers across reasoning, code, search, browser automation, data/infrastructure, communication, security, and design. Auto-selected based on workflow — fewer tools = less context bloat = better agent performance.

---

## Roadmap

### v1.x (Complete)
Local CLI: intent compilation, project scanning, templates, secrets management, autonomy levels (1-4), interactive clarification, branded CLI, verification patterns, sprint contracts, multi-agent QA, 8 LLM providers.

### v2.x (Current — v2.11.0)
**Kairn Evolve** — automated harness optimization.

- **v2.0** ✅ Task definition, trace infrastructure, eval templates
- **v2.1** ✅ The evolution loop (evaluate → diagnose → mutate → re-evaluate → rollback)
- **v2.2** ✅ Diagnosis, reporting, parallel evaluation, anti-regression guards
- **v2.3** ✅ Eval quality, Claude Code subscription auth, prompt caching
- **v2.5** ✅ Intent-aware harnesses (two-tier routing, self-learning promotion)
- **v2.6** ✅ Population-based training (Thompson sampling, KL regularization, Meta-Principal synthesis)
- **v2.7** ✅ Structured Harness IR (14 node types, 17 mutations, semantic diff, round-trip renderer)
- **v2.8** ✅ Hybrid scoring, prompt caching (~85% savings), targeted re-evaluation (~40% cost reduction)
- **v2.9** ✅ Anthropic patterns (sprint contracts, model routing, 20+ security rules, memory persistence)
- **v2.10** ✅ Persistent execution loops (/project:persist, auto-routing, progress tracking)
- **v2.11** ✅ Multi-agent compilation (orchestrator → specialist agents → linker → HarnessIR)
- **v2.12** ⏳ Polish: live dashboard, describe→evolve integration, CI/CD, template evolution

### v3.x (Aspirational)
Fleet-scale harness optimization. Swarm manifest compilation. Inter-agent contract validation. Runtime-agnostic harness IR (Claude Code, Hermes, OpenClaw). Tool marketplace with proposer-initiated discovery.

---

## Security

- API keys stay local (`~/.kairn/config.json`, never transmitted)
- Every environment includes 20+ PreToolUse deny rules across credential leaks, injection, destructive ops, and network exfiltration
- Curated MCP registry only — every server manually verified
- Environment variables use `${ENV_VAR}` syntax — secrets never written to config files
- Path traversal protection on all evolution mutations
- Hooks block destructive commands; PostCompact restores context

---

## FAQ

**Do I need an account?** No. Local CLI, your API key, no backend.

**Does Kairn send my code anywhere?** No. All LLM calls use your key. Nothing leaves your machine except API requests.

**Team use?** Generate locally, commit `.claude/` to git. Everyone gets the same environment.

**Keep manual customizations?** `kairn optimize --diff` previews changes. Accept or reject selectively.

**Evolution cost?** 5 iterations, 5 tasks on Anthropic: ~1.5M tokens (~$15-50 Opus, ~$2-5 Haiku). PBT multiplies by branch count but runs concurrently.

**What's the intent router doing?** Intercepts natural language prompts, matches to `/project:*` commands via regex (free) or Haiku (~$0.001). Disable Tier 2 with `"enableTier2": false`.

---

## Contributing

Kairn is open-source. Contributions welcome: MCP servers to the registry, eval task templates, proposer prompt improvements, bug reports.

## License

MIT

---

*Kairn — from kairos (the right moment) and cairn (the stack of stones marking the path). Choose the right moment. Mark the path for others.*
