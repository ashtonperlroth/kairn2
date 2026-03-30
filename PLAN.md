# Kairn v1 Implementation Plan — The Skateboard

> Local-first CLI that compiles natural language intent into an optimal Claude Code agent environment.

## Guiding Principles

1. **Ship the simplest thing that delivers Magic #1** ("I described what I wanted and got a perfect environment").
2. **No server, no database, no payments.** Everything runs locally. The only external call is the user's own LLM for compilation.
3. **Claude Code only.** One runtime adapter. Do it well.
4. **Bundled registry.** Tool catalog ships as a JSON file inside the package.
5. **Trust through transparency.** API key stays local. Tell the user where it's stored. Let them inspect everything.
6. **Minimalism.** Avoid context bloat. Generate only high-leverage components and instructions.

---

## Architecture

```
User Intent (natural language)
        │
        ▼
┌─────────────────┐
│   kairn CLI      │
│                  │
│  ┌────────────┐  │     ┌──────────────┐
│  │  Compiler  │──┼────▶│ User's LLM   │
│  │            │◀─┼─────│ (Anthropic)   │
│  └─────┬──────┘  │     └──────────────┘
│        │         │
│        ▼         │
│  ┌────────────┐  │     ┌──────────────┐
│  │  Registry  │  │     │ ~/.kairn/    │
│  │ (bundled)  │  │     │  config.json │
│  └────────────┘  │     │  envs/       │
│        │         │     └──────────────┘
│        ▼         │
│  ┌────────────┐  │     ┌───────────────────┐
│  │  Adapter   │──┼────▶│ .claude/ directory    │
│  │(Claude Code)│ │     │ (CLAUDE.md, settings,   │
│  └────────────┘  │     │  commands, rules, agents) │
└─────────────────┘     └───────────────────┘
```

---

## File Structure

```
kairn/
├── package.json              # name: "kairn", bin: { kairn: "./bin/kairn.js" }
├── tsconfig.json
├── src/
│   ├── cli.ts                # Commander.js entry — registers commands
│   ├── commands/
│   │   ├── init.ts           # `kairn init` — API key setup
│   │   ├── describe.ts       # `kairn describe` — intent → compile → write
│   │   └── list.ts           # `kairn list` — show saved environments
│   ├── compiler/
│   │   ├── compile.ts        # Orchestrates: parse intent → match tools → build spec
│   │   └── prompt.ts         # System prompt for the compilation LLM call
│   ├── adapter/
│   │   └── claude-code.ts    # EnvironmentSpec → .claude/ directory
│   ├── registry/
│   │   └── tools.json        # Bundled tool catalog (curated from RESEARCH.md)
│   ├── types.ts              # EnvironmentSpec, Tool, ToolSelection types
│   └── config.ts             # Read/write ~/.kairn/config.json
├── bin/
│   └── kairn.js              # #!/usr/bin/env node shebang entry
└── README.md
```

---

## Implementation Steps

### Step 1: Scaffold

- `npm init`, install deps: `commander`, `inquirer`, `@anthropic-ai/sdk`, `chalk`
- tsconfig with strict mode, ESM output
- bin/kairn.js entry point
- Basic CLI skeleton with `kairn --help`

### Step 2: Config & Init

- `~/.kairn/config.json` schema: `{ anthropic_api_key, default_runtime, created_at }`
- `kairn init` command:
  - Prompt: "LLM provider?" (Anthropic only for v1)
  - Prompt: "API key?" (masked input)
  - Verify key works (test API call)
  - Save to `~/.kairn/config.json`
  - Detect Claude Code installation
  - Print confirmation

### Step 3: Tool Registry

- `src/registry/tools.json` with ~15-20 highly-leveraged tools curated from `RESEARCH.md`
- Each tool has: id, name, description, category, payment type, `best_for` tags, Claude Code install config (MCP server config for settings.json or `.mcp.json`).
- Focus on tools from Tier 1, 2, 3 in `RESEARCH.md`.
- Include core Claude Code plugins like `security-guidance` and `context7` with their installation details.

### Step 4: Compiler

- `src/compiler/prompt.ts` — System prompt for the LLM:
  - Incorporate best practices from `RESEARCH.md`:
    - "You are the Kairn environment compiler. Generate a minimal, optimal Claude Code environment."
    - "Given user intent and a tool registry, output a JSON EnvironmentSpec."
    - "Prioritize fewest relevant tools to avoid context bloat."
    - "Always include a `/project:help` command guide."
    - "Always include `TODO.md` and `/project:tasks` for continuity."
    - "Always include `docs/DECISIONS.md`, `docs/LEARNINGS.md` (for continuity rule).
    - "Always include essential security rules and recommend `security-guidance` plugin."
    - "Generate a **concise, workflow-specific CLAUDE.md** (<100 lines, no generic text)."
    - "Only include skills, agents, and MCP servers directly relevant to the workflow."
- `src/compiler/compile.ts` — Orchestration:
  1. Load config (get API key)
  2. Load registry (bundled `tools.json`)
  3. Build prompt (system + user intent + registry as context)
  4. Call Anthropic API (Claude Sonnet — fast, cheap, good enough)
  5. Parse structured JSON response for `EnvironmentSpec`
  6. Return `EnvironmentSpec`
  7. Save `EnvironmentSpec` to `~/.kairn/envs/{id}.json`

### Step 5: Claude Code Adapter

- Takes an `EnvironmentSpec` and writes files into the project's `.claude/` directory:
  ```
  .claude/
  ├── CLAUDE.md              # Workflow-specific system prompt (from spec.harness.claude_md)
  ├── settings.json          # Permissions, model prefs, hooks (from spec.harness.settings)
  ├── .mcp.json              # Specific MCP server configurations (from spec.harness.mcp_config)
  ├── commands/              # Workflow-specific slash commands
  │   ├── help.md            # The user's guide to this environment
  │   └── tasks.md           # Lists/manages TODOs
  │   └── {other_commands}.md
  ├── rules/                 # Auto-loaded rules
  │   └── continuity.md      # Encourages updating DECISIONS.md/LEARNINGS.md
  │   └── security.md        # Essential security instructions
  │   └── {other_rules}.md
  ├── agents/                # Specialized subagent definitions
  │   └── {agent_name}.md
  ├── skills/                # Workflow-relevant skills
  │   └── {skill_name}/
  │       └── SKILL.md
  └── docs/                  # Pre-fetched context documents & memory
      ├── TODO.md            # Tasks for the agent
      ├── DECISIONS.md       # For architectural decisions
      └── LEARNINGS.md       # For non-obvious discoveries
  ```
- The CLAUDE.md generated must be:
  - Highly concise (<100 lines)
  - Workflow-specific (no generic "be helpful")
  - Reference the `docs/`, `skills/`, `commands/` it generated
- `settings.json` should include: default permissions, minimal hooks (e.g., security-guidance plugin config), and sandbox settings as deemed appropriate by the compiler logic.
- `.mcp.json` should contain only the project-scoped MCP server configurations for the *selected* tools.

### Step 6: Describe Command

- `kairn describe` flow:
  1. Check config exists (prompt to run `kairn init` if not)
  2. Ask: "What do you want your agent to do?"
  3. Show spinner: "Analyzing workflow..."
  4. Call compiler (`src/compiler/compile.ts`)
  5. Show results: recommended tools, estimated cost, generated file categories
  6. Ask: "Generate environment in current directory?" (y/n)
  7. Call adapter (`src/adapter/claude-code.ts`) to write `.claude/` directory
  8. Print: "Ready. Run: claude"

### Step 7: List Command

- `kairn list` — show all saved environments from `~/.kairn/envs/`
- Show: name, description, date created, tool count
- `kairn activate <env_id>` — re-generate `.claude/` from saved `EnvironmentSpec` (stretch goal)

### Step 8: Test End-to-End

- Test with real workflow descriptions:
  - "Research ML papers on GRPO and write a summary"
  - "Build a Next.js app with Supabase auth"  
  - "Draft outreach emails from a CSV of leads"
- Verify generated `.claude/` directory structure and contents are correct.
- Verify generated `CLAUDE.md` quality (concise, workflow-specific).
- Verify `settings.json` and `.mcp.json` are valid.
- Test generated slash commands in Claude Code terminal.

---

## Dependencies (Minimal)

```json
{
  "dependencies": {
    "commander": "^13.0.0",
    "@inquirer/prompts": "^7.0.0",
    "@anthropic-ai/sdk": "^0.39.0",
    "chalk": "^5.0.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "tsup": "^8.0.0",
    "@types/node": "^22.0.0"
  }
}
```

---

## What Success Looks Like

A user runs three commands and has a working, optimized Claude Code environment:

```
$ npm install -g kairn
$ kairn init
$ kairn describe
```

The generated `.claude/` directory is BETTER and more tailored than what they would have built manually — more focused, fewer irrelevant tools, workflow-specific instructions, and a clear `/project:help` command.

---

## What Comes After v1

Once this works:
1. More tools in the registry
2. Template gallery (pre-built environments for common workflows)  
3. Hermes adapter
4. `kairn activate` for saved environments
5. Hosted compilation endpoint (free tier)
6. Stripe MPP integration (the payment layer)
7. Learning system (usage data → better recommendations)
8. Enhanced MCP management (detect and adapt to user's existing MCPs)
