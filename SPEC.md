# Kairn v2 — The Agent Environment Compiler

> Describe what you want done. Kairn generates the optimal agent environment, provisions every tool via MPP, and gets smarter with every session.

---

## The Thesis

Every agent needs an environment before it can work. Today, building that environment is manual, fragile, and generic. The harness repos on GitHub give you 136 skills and hope you figure out which 6 matter for your task. Kairn generates the minimal, optimal environment for any workflow — with every tool pre-paid and pre-configured — in a single command.

The capability exists. The environment doesn't. Kairn compiles the environment.

---

## What Kairn Is

A single subscription that gives any agent, in any runtime, an optimized environment with instant access to every tool it needs.

- **The user never creates vendor accounts.** Kairn pays vendors on their behalf via Stripe MPP.
- **The user never manages API keys.** The MPP payment receipt IS the credential.
- **The user never hand-picks tools.** Kairn matches intent to the optimal tool set from a living registry.
- **The environment works on any machine.** The spec lives in the cloud; `kairn activate` reconstitutes it locally.

Kairn is the only account they create. Kairn is the only bill they pay.

---

## How It Works

### The Onboarding Flow

```
Landing page → "Get Started"
  ↓
Sign up (GitHub OAuth or email — one click)
  ↓
Add payment (Stripe checkout — credit card or crypto via SPT)
  → Creates a Stripe customer with a Shared Payment Token
  → Kairn can now pay any MPP-native service on the user's behalf
  ↓
"What do you want to build?" (or pick a workflow template)
  ↓
Environment generated → install command shown
  ↓
$ npx kairn activate
  → detects runtime (Claude Code? Hermes? OpenClaw?)
  → pulls environment spec from Kairn cloud
  → writes config files locally
  → DONE. Agent works.
```

### The Describe Flow (CLI)

```
$ kairn describe

  What do you want your agent to do?
  > Research recent ML papers on GRPO training,
    summarize key findings, and draft a blog post

  Analyzing workflow...

  Recommended environment:
    LLM:      Anthropic Claude (reasoning + writing)
    Search:   Exa (semantic academic search)
    Archive:  arXiv MCP server
    Output:   Local markdown files

  All tools support MPP — no API keys needed.
  Estimated cost per run: $0.30–$0.80

  Target runtime?
  > Claude Code

  Generating environment...
    ✓ CLAUDE.md — research + writing workflow context
    ✓ settings.json — Exa + arXiv MCP configured
    ✓ docs/grpo-overview.md — pre-fetched context
    ✓ skills/research-synthesis/SKILL.md
    ✓ No TDD hooks (not a code project)
    ✓ No code review agents (not needed)

  Ready. Run: claude
```

### The Dashboard Flow (Web)

For non-CLI users or first-time setup:

1. Log in at app.kairn.cloud
2. Click "New Environment"
3. Describe workflow in a text box (or pick from template gallery)
4. Review recommended tools + estimated costs
5. Click "Create" → environment spec saved to your account
6. Copy the one-liner: `npx kairn activate env_abc123`
7. Or browse templates: "ML Research", "Outreach Agent", "Code Assistant", "Data Pipeline"

---

## Stripe MPP Integration — The Core Enabler

### Why MPP

Stripe's Machine Payments Protocol (launched March 2026) allows AI agents to pay for services programmatically using the HTTP 402 status code. No accounts, no API keys, no human in the loop.

MPP is already supported by 50+ services including:
- **LLMs:** OpenAI, Anthropic, Google Gemini
- **Data/Infrastructure:** Dune, Google Maps, fal.ai, Browserbase, Modal
- **Communication:** AgentMail, PostalForm
- **Search/Research:** (growing daily)

Key advantages over x402:
- Supports fiat (credit cards via Shared Payment Tokens) AND crypto (stablecoins)
- Session-based aggregation with off-chain vouchers (sub-100ms, near-zero fees)
- Built-in fraud protection via Stripe Radar
- IETF standardization track
- Backed by OpenAI, Anthropic, Shopify, Visa

### How Kairn Uses MPP

```
User → pays Kairn (subscription or prepaid balance)
Kairn → pays vendors via MPP on user's behalf
Vendor → returns resource to agent
```

The user's Stripe SPT (Shared Payment Token) is created at onboarding. When the agent calls a tool, Kairn's MPP client handles the 402 challenge transparently. The user sees itemized usage in their Kairn dashboard.

### Credential Strategy (Priority Order)

For each tool in the registry:

1. **MPP-native** → Kairn pays automatically. Zero friction. Preferred.
2. **Free / no auth** → Just configure the connection. (arXiv, some MCP servers)
3. **API key required, no MPP** → User prompted to bring their own key. Stored encrypted in Kairn vault. (Fallback for non-MPP tools)
4. **OAuth-based** → Browser redirect flow at setup time. (Google Sheets, Slack — only when needed)

v1 ships with MPP-native and free tools only. This keeps the "zero vendor auth" promise clean. Non-MPP tools are added later with the BYOK flow.

---

## The Tool Registry — Core IP

The registry is a living database of everything an agent can use: MCP servers, Claude Code plugins, OpenClaw skills, Hermes tools, APIs, data sources.

### Schema

```typescript
type Tool = {
  id: string;                          // "exa-search"
  name: string;                        // "Exa Semantic Search"
  description: string;                 // What it does
  category: ToolCategory;
  payment: PaymentMethod;
  mpp_endpoint?: string;               // For MPP-native tools
  cost: CostInfo;
  best_for: string[];                  // ["research", "ML papers", "documentation"]
  install: {
    claude_code?: ClaudeCodeInstall;    // plugin name, settings.json config
    hermes?: HermesInstall;             // MCP config, skill reference
    openclaw?: OpenClawInstall;         // skill package, config
  };
  quality_score?: number;              // 0-1, learned from usage data (v2)
  added_at: string;
  last_verified: string;
};

type ToolCategory =
  | "llm"               // Language models
  | "search"            // Web search, semantic search
  | "knowledge"         // arXiv, Semantic Scholar, Wikipedia
  | "communication"     // Email, Slack, messaging
  | "data"              // Google Sheets, databases, file access
  | "code-execution"    // Sandboxes, REPLs
  | "browser"           // Headless browsers, scraping
  | "media"             // Image gen, TTS, transcription
  | "devtools"          // GitHub, CI/CD, package managers
  | "finance"           // Market data, payments
  | "custom";           // User-provided tools

type PaymentMethod =
  | "mpp"               // Stripe MPP — Kairn pays automatically
  | "free"              // No payment needed
  | "api-key"           // User must provide their own key
  | "oauth";            // OAuth flow required

type CostInfo = {
  model: "per-call" | "per-token" | "per-session" | "free";
  estimated_cost_usd?: number;         // Per call/token/session
  unit?: string;                       // "call", "1K tokens", "session"
};

type ClaudeCodeInstall = {
  plugin?: string;                     // Plugin marketplace ID
  mcp_server?: {                       // MCP server config for settings.json
    command: string;
    args?: string[];
    env?: Record<string, string>;
  };
  skills?: string[];                   // Skill file paths to generate
  rules?: string[];                    // Rule files to generate
};

type HermesInstall = {
  mcp_config?: object;                 // For config.yaml mcp_servers section
  skill?: string;                      // Skill name from Hermes skill registry
};

type OpenClawInstall = {
  skill_package?: string;              // npm/pip package
  config?: object;                     // Skill configuration
};
```

### v1 Registry — Launch Catalog

Curated, not learned. Covers the 80% use cases.

**LLMs:**
| Tool | Payment | Cost |
|------|---------|------|
| Anthropic Claude | MPP | per-token |
| OpenAI GPT | MPP | per-token |
| Google Gemini | MPP | per-token |

**Search:**
| Tool | Payment | Cost |
|------|---------|------|
| Exa Semantic Search | MPP | ~$0.001/call |
| Tavily Web Search | MPP (TBD) | ~$0.001/call |
| Perplexity | MPP (TBD) | per-query |

**Knowledge:**
| Tool | Payment | Cost |
|------|---------|------|
| arXiv MCP | Free | free |
| Semantic Scholar | Free | free |
| Context7 (docs) | Free | free |

**Browser/Scraping:**
| Tool | Payment | Cost |
|------|---------|------|
| Browserbase | MPP | per-session |
| Firecrawl | MPP (TBD) | per-page |

**Code Execution:**
| Tool | Payment | Cost |
|------|---------|------|
| Modal | MPP | per-compute |
| E2B Sandbox | MPP (TBD) | per-session |

**Communication:**
| Tool | Payment | Cost |
|------|---------|------|
| AgentMail | MPP | per-email |

**Data:**
| Tool | Payment | Cost |
|------|---------|------|
| Google Sheets (via MCP) | OAuth | free |
| Local filesystem | Free | free |

**DevTools:**
| Tool | Payment | Cost |
|------|---------|------|
| GitHub MCP | OAuth/PAT | free |
| npm registry | Free | free |

*Note: "MPP (TBD)" means the vendor supports MPP but Kairn integration is pending verification.*

---

## The Environment Compiler — Intent to Configuration

### Input

Natural language description of the workflow + optional constraints:
- "Research ML papers on GRPO and write a summary"
- "Monitor competitor pricing on 3 websites daily and alert me on Slack"
- "Build a Next.js app with Supabase auth"
- "Draft personalized outreach emails for 50 leads from a CSV"

### Process

1. **Intent parsing** — LLM extracts: task type, required capabilities (search, write, email, code, etc.), data sources, output format, frequency
2. **Tool matching** — For each capability, select the best tool(s) from the registry. Optimize for: MPP availability (prefer zero-friction), quality score, cost, compatibility with target runtime
3. **Context generation** — Generate system prompt / CLAUDE.md / agent instructions tailored to the specific workflow. NOT generic. NOT 200 rules. Just what this workflow needs.
4. **Skill selection** — From a library of workflow-specific skills, select only the relevant ones. A research workflow gets research-synthesis and citation-formatting skills. NOT TDD, NOT code-review, NOT security-audit.
5. **Hook selection** — Only if relevant. Code projects get typecheck hooks. Research projects get none.
6. **Cost estimation** — Based on tool costs and expected call patterns, estimate per-run cost.
7. **Runtime adaptation** — Format the environment for the target runtime (Claude Code .claude/ directory, Hermes config.yaml, OpenClaw skill config).

### Output: EnvironmentSpec

```typescript
type EnvironmentSpec = {
  id: string;                          // "env_abc123"
  name: string;                        // "ML Research Assistant"
  description: string;                 // Original user intent
  created_at: string;
  
  // What tools are active
  tools: ToolSelection[];
  
  // The generated harness
  harness: {
    system_prompt: string;             // Core instructions for the agent
    docs: Record<string, string>;      // Pre-fetched context docs
    skills: Record<string, string>;    // Selected skill definitions
    rules: string[];                   // Only relevant rules
    hooks: HookConfig[];               // Only relevant hooks
  };
  
  // Runtime-specific output
  runtime: "claude-code" | "hermes" | "openclaw";
  runtime_config: object;              // The actual files to write
  
  // Cost info
  estimated_cost: {
    per_run_usd: [number, number];     // [low, high] range
    tools_breakdown: Record<string, number>;
  };
  
  // MPP payment config
  payment: {
    mpp_tools: string[];               // Tools paid via MPP
    free_tools: string[];              // Free tools
    byok_tools: string[];             // Tools requiring user's own key
  };
};

type ToolSelection = {
  tool_id: string;
  reason: string;                      // Why this tool was selected
  estimated_calls: number;             // Expected calls per run
  config: object;                      // Tool-specific configuration
};
```

---

## Target Runtimes

### v1: Claude Code

The primary target. Highest momentum, largest user base for agent harnesses.

Output structure:
```
.claude/
├── CLAUDE.md              # Workflow-specific system prompt (<100 lines)
├── settings.json          # MCP servers, model preferences, permissions
├── docs/                  # Pre-fetched context (only what's relevant)
│   └── {topic}.md
├── skills/                # Only workflow-relevant skills
│   └── {skill}/SKILL.md
└── hooks/                 # Only if relevant (code projects only)
    └── hooks.json
```

Also installs Claude Code plugins via marketplace if the tool has a plugin.

### v1: Hermes / OpenClaw

Secondary targets. Both are config-file-driven.

**Hermes output:**
```
~/.hermes/
├── config.yaml            # MCP servers added
└── skills/
    └── {skill}/SKILL.md   # Workflow-specific skills
```

**OpenClaw output:**
```
~/.openclaw/
├── skills/
│   └── {skill}/           # Skill packages
└── config.json            # Tool configuration
```

### Runtime Detection

`kairn activate` auto-detects which runtimes are installed:

```bash
# Check for Claude Code
which claude >/dev/null 2>&1 && echo "claude-code"

# Check for Hermes
which hermes >/dev/null 2>&1 && echo "hermes"

# Check for OpenClaw
which openclaw >/dev/null 2>&1 && echo "openclaw"
```

If multiple runtimes detected, ask which to configure (or configure all).

---

## The Learning System

### v1: Curated + LLM Heuristic

The tool registry is manually curated. The intent-to-tools matching uses an LLM with the full registry as context. The system prompt instructs the LLM to select the minimal effective tool set.

Discovery pipeline (automated, daily):
1. **GitHub trending scraper** — scan for new MCP servers, Claude Code plugins, agent tools
2. **npm release watcher** — track @modelcontextprotocol packages, new plugins
3. **X/Twitter monitor** — track mentions of new agent tools
4. **Flagged for human review** — new discoveries are queued, not auto-added

### v2: Learned Optimization (Requires Users)

With usage data, the system learns:
- Which tool combinations work best for which workflow types
- Realistic cost estimates per workflow type
- Which skills actually improve outcomes vs. add context bloat
- Optimal system prompt patterns per task category

The optimization surface: a harness is a high-dimensional configuration vector (tools × skills × rules × hooks × model × prompt). Each configuration produces some outcome quality for a given workflow. The learning system searches this space for the optimal configuration given a workflow description.

Cold start: LLM heuristic (v1). Warm: collaborative filtering on workflow similarity. Hot: trained recommendation model.

---

## Business Model

### Option A: Subscription + Passthrough (Recommended for Launch)

| Tier | Price | Included | Tool Costs |
|------|-------|----------|------------|
| Free | $0 | 3 environments, basic templates | Passthrough at cost + 5% |
| Pro | $20/mo | Unlimited environments, all templates, priority tools | Passthrough at cost |
| Team | $50/mo | Shared environments, team billing, usage analytics | Passthrough at cost |

Tool costs are itemized in the dashboard. The user sees exactly what each vendor charged. Kairn makes money on the subscription, not on hiding margins.

### Why Not Pure Usage Margin

- Transparency builds trust (critical for a product that controls your spending)
- Subscription revenue is predictable
- Users who pay $20/mo and use $200/mo of tools are great customers
- The 5% free-tier markup funds free users without feeling exploitative

---

## Spending Controls

Even without the full governance system, basic spending controls are essential:

- **Per-environment spending limit** — "This research workflow should never cost more than $5 per run"
- **Monthly spending cap** — "Never let my total Kairn spend exceed $100/mo"
- **Pre-run cost estimate** — "This workflow will cost approximately $0.30–$0.80"
- **Real-time spend tracking** — Dashboard shows current spend by tool, by environment, by day
- **Alerts** — Email/notification at 50%, 80%, 100% of limits

Implementation: simple balance checks before MPP payments. No Redis Lua scripts, no atomic enforcement. Just: "is the user's remaining budget >= estimated cost? If not, block."

---

## Database Schema

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  stripe_customer_id TEXT,           -- Stripe customer for billing
  stripe_spt_id TEXT,                -- Shared Payment Token for MPP
  spending_limit_cents INTEGER,       -- Monthly cap (null = unlimited)
  plan TEXT DEFAULT 'free',           -- 'free' | 'pro' | 'team'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Environment Specs (the core entity)
CREATE TABLE environments (
  id TEXT PRIMARY KEY,                -- "env_abc123"
  user_id UUID REFERENCES users(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,                   -- Original user intent
  spec JSONB NOT NULL,                -- Full EnvironmentSpec
  runtime TEXT NOT NULL,              -- "claude-code" | "hermes" | "openclaw"
  tools JSONB NOT NULL,               -- Tool selections array
  estimated_cost_low INTEGER,         -- Cents
  estimated_cost_high INTEGER,        -- Cents
  spending_limit_cents INTEGER,       -- Per-run cap
  is_template BOOLEAN DEFAULT false,  -- Public template?
  created_at TIMESTAMPTZ DEFAULT now(),
  last_activated_at TIMESTAMPTZ
);
CREATE INDEX idx_environments_user ON environments(user_id);

-- Tool Registry
CREATE TABLE tools (
  id TEXT PRIMARY KEY,                -- "exa-search"
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  payment TEXT NOT NULL,              -- "mpp" | "free" | "api-key" | "oauth"
  mpp_endpoint TEXT,
  cost_model TEXT,                    -- "per-call" | "per-token" | "per-session" | "free"
  estimated_cost_usd NUMERIC(10,6),
  install_config JSONB NOT NULL,      -- Per-runtime install instructions
  best_for TEXT[],
  quality_score NUMERIC(3,2),
  is_active BOOLEAN DEFAULT true,
  added_at TIMESTAMPTZ DEFAULT now(),
  last_verified TIMESTAMPTZ
);
CREATE INDEX idx_tools_category ON tools(category);
CREATE INDEX idx_tools_payment ON tools(payment);

-- Usage Tracking
CREATE TABLE usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  environment_id TEXT REFERENCES environments(id),
  tool_id TEXT REFERENCES tools(id) NOT NULL,
  cost_cents INTEGER NOT NULL,
  metadata JSONB,                     -- vendor response metadata
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_usage_user_created ON usage_events(user_id, created_at DESC);
CREATE INDEX idx_usage_environment ON usage_events(environment_id);

-- User's stored credentials (for non-MPP tools)
CREATE TABLE user_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  tool_id TEXT REFERENCES tools(id) NOT NULL,
  encrypted_key TEXT NOT NULL,        -- AES-256-GCM
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, tool_id)
);

-- Discovery queue (new tools found by scrapers)
CREATE TABLE tool_discoveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,               -- "github-trending" | "npm-releases" | "twitter"
  source_url TEXT,
  name TEXT NOT NULL,
  description TEXT,
  category_guess TEXT,
  payment_guess TEXT,
  status TEXT DEFAULT 'pending',      -- "pending" | "approved" | "rejected"
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Tech Stack

- **Web app:** Next.js 15 (App Router), TypeScript, Tailwind, shadcn/ui
- **Database:** Supabase (Postgres + Auth)
- **Payments:** Stripe (subscriptions + MPP via SPT)
- **CLI:** TypeScript, distributed via npm (`npx kairn`)
- **LLM (for intent parsing):** Anthropic Claude via MPP (dogfooding!)
- **Deployment:** Vercel (web), npm (CLI)

No Cloudflare Worker proxy needed. No Redis needed. No JWT sessions needed. MPP handles auth at the vendor level.

---

## Implementation Phases

### Phase 0 — Foundation

- [ ] Initialize Next.js project, Supabase, Stripe integration
- [ ] User auth (GitHub OAuth via Supabase)
- [ ] Stripe checkout for payment method collection (SPT creation)
- [ ] Basic dashboard shell (environments list, usage, billing)

### Phase 1 — The Tool Registry

- [ ] Seed database with v1 tool catalog (15-20 tools)
- [ ] Tool detail page (what it does, cost, supported runtimes)
- [ ] Admin interface for adding/editing tools
- [ ] MPP payment verification for each tool (test the 402 flow)

### Phase 2 — The Environment Compiler

- [ ] `POST /api/environments/compile` — intent → EnvironmentSpec
- [ ] LLM pipeline: intent parsing → tool matching → context generation → skill selection
- [ ] Claude Code adapter: EnvironmentSpec → .claude/ directory contents
- [ ] Cost estimation from tool registry
- [ ] Template gallery (pre-built environments for common workflows)

### Phase 3 — The CLI

- [ ] `npx kairn auth` — login via browser
- [ ] `npx kairn describe` — interactive workflow description → compile → activate
- [ ] `npx kairn activate <env_id>` — pull spec from cloud, write local files
- [ ] `npx kairn templates` — browse and activate pre-built environments
- [ ] Runtime detection (Claude Code, Hermes, OpenClaw)
- [ ] Plugin/MCP server installation for Claude Code

### Phase 4 — MPP Payment Flow

- [ ] Stripe MPP client integration (handle 402 challenges)
- [ ] SPT-based payment on behalf of users
- [ ] Usage event logging (per-tool, per-environment)
- [ ] Spending limits and budget checks
- [ ] Dashboard: real-time usage, cost breakdown, spending alerts

### Phase 5 — Hermes + OpenClaw Adapters

- [ ] Hermes adapter: EnvironmentSpec → config.yaml + skills
- [ ] OpenClaw adapter: EnvironmentSpec → skill packages + config
- [ ] Cross-runtime environment sync (same spec, multiple runtimes)

### Phase 6 — Discovery + Learning

- [ ] GitHub trending scraper (daily, flagged for review)
- [ ] npm release watcher (@modelcontextprotocol, claude plugins)
- [ ] Usage analytics: which tools are used most, for which workflows
- [ ] Quality scoring v1: user feedback (thumbs up/down on tool recommendations)

### Phase 7 — Optimization Surface (Requires User Data)

- [ ] Workflow embeddings: vectorize workflow descriptions
- [ ] Collaborative filtering: "users with similar workflows used these tools"
- [ ] A/B testing framework: test different tool combinations for same workflow type
- [ ] Trained recommendation model: workflow → optimal configuration

---

## What We Carry Forward from Kairn v1

| Component | Keep? | Notes |
|-----------|-------|-------|
| Vendor registry concept | ✅ Evolve | Becomes the Tool Registry — much broader |
| Configurator templates | ✅ Adapt | Skills, agents, hooks, docs — same pattern |
| CLI structure | ✅ Adapt | New commands but same architecture |
| Dashboard shell | ✅ Adapt | New pages but same tech stack |
| Supabase auth | ✅ Keep | Same auth system |
| shadcn/ui components | ✅ Keep | Same design system |
| Proxy (Cloudflare Worker) | ❌ Drop | MPP replaces the proxy for payment/auth |
| Redis session enforcement | ❌ Drop | Simple budget checks replace atomic enforcement |
| JWT session tokens | ❌ Drop | MPP receipts replace sessions |
| Lua scripts | ❌ Drop | No atomic enforcement needed |
| Hierarchical delegation | ❌ Drop | Isara-specific, not needed for v2 |

---

## Open Questions

1. **MPP adoption verification** — Which tools on the v1 list actually accept MPP today vs. "announced support"? Need to test each 402 flow before claiming support.

2. **Kairn-as-payer legal/financial** — If Kairn pays vendors on behalf of users, what are the regulatory implications? Need to consult with a fintech lawyer. Stripe's infrastructure handles most compliance, but the reseller relationship needs clarity.

3. **Pricing** — Subscription tiers need market testing. $20/mo is a guess. Could be $10, could be $30. Depends on what the tool costs are — if most workflows cost $0.50/run, the subscription needs to feel worth it.

4. **Plugin installation** — Can `kairn activate` install Claude Code plugins automatically, or does it require user confirmation? Security implications of auto-installing plugins.

5. **Offline / local-only mode** — Some users may want to use Kairn's environment generation without MPP (i.e., bring all their own keys). Should this be supported in v1?

6. **Template marketplace** — Should users be able to share their environment specs? This creates a network effect but also a curation burden.

---

## The North Star

A developer — or a baker, or a PE analyst, or a student — describes what they want an agent to do. In under a minute, they have a fully configured, fully credentialed, minimal and optimal agent environment. They never visited a vendor's website. They never generated an API key. They never wrote a system prompt. They never installed an MCP server manually.

They described intent. Kairn compiled the environment. The agent works.

---

*Kairn v2 — from kairos (the right moment) and cairn (the stack of stones marking the path).*
