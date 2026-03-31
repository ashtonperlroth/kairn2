# Ralph Loop Task — Execute /project:ralph

## Objective

Implement the next feature milestone using the Ralph Loop with specialized subagents.

When you receive a version (e.g., "v2.0.0"), execute this sequence:

### Phase 0: Orient

1. Read `ROADMAP.md` — find the target version, extract checklist items
2. Read the matching design doc at `docs/design/v*.md`
3. Verify git is clean: `git status`
4. Create/checkout feature branch: `git checkout -b feature/$version` (or `git status` to verify on branch)

### Phase 1: Plan

Invoke `@architect`:

> "Read ROADMAP.md for v$version and the design doc. Produce a `PLAN-v$version.md` with numbered steps. Each step: what to build, files to create, dependencies, verification command, commit message. Mark `[parallel-safe]` steps."

After @architect completes, commit:
```bash
git add PLAN-v$version.md
git commit -m "plan: v$version implementation plan"
```

### Phase 2: Build

Read the generated `PLAN-v$version.md`. Execute steps in order.

For each step (or parallel group):

Use `@implementer` for **sequential** steps. For **parallel-safe** steps, consider invoking multiple `@implementer` instances.

> "Execute step N from `PLAN-v$version.md`. Read the plan, read the design doc at `docs/design/v*.md`. Follow TDD: write tests first (RED), implement minimum code (GREEN), refactor cleanly (REFACTOR). Run npm run build. Verify step's verification command. Commit when done."

After each step:
- Verify: `npm run build` passes
- Verify: step's verification command passes  
- Verify: commit exists in git log

If a step fails: invoke `@debugger` with the error output.

Continue until all steps complete.

### Phase 3: Quality Gate

Invoke `@reviewer`:

> "Review the implementation of v$version. Check spec compliance: does every item in ROADMAP.md checklist have matching implementation? Check code quality: TS strict mode, error handling, patterns match src/commands/describe.ts. Output structured PASS/FAIL report with evidence."

Read the review output.

### Phase 4: Fix Loop (if needed)

If reviewer reports BLOCKERS or SHOULD-FIX:

Invoke `@debugger`:

> "Fix these review findings: [paste findings]. Then run npm run build and npm test. Commit when done."

Then re-invoke `@reviewer` to re-check.

Repeat max 3 times. If still failing, stop and report.

### Phase 5: Finalize

1. Verify:
   ```bash
   npm run build
   node dist/cli.js --help
   ```

2. Report:
   ```
   ━━━ RALPH LOOP COMPLETE ━━━━━━━━━━━━━━━━━━━━
   Version:    v$version
   Commits:    [show git log --oneline -N]
   Review:     PASS
   
   Ready for: ROADMAP/CHANGELOG update, version bump, PR/ship
   ```

## Subagent Reference

| Agent | Tools | Role |
|-------|-------|------|
| `@architect` | Read, Glob, Grep | Reads design doc → produces PLAN with deps (Phase 1) |
| `@implementer` | Read, Write, Edit, Bash, Glob, Grep | Executes ONE step using TDD (Phase 2) |
| `@reviewer` | Read, Glob, Grep, Bash | Spec compliance + code quality check (Phase 3) |
| `@debugger` | Read, Write, Edit, Bash, Grep, Glob | Fixes errors/review issues (Phase 2/4) |
| `@planner` | Read, Glob, Grep | Quick backlog (optional) |

## Rules

- Never skip Phase 3 (quality gate)
- Parallel @implementer only for steps marked `[parallel-safe]`
- All commits use conventional format (feat:, fix:, test:, etc.)
- Do NOT bump version or update ROADMAP/CHANGELOG — that's post-ship
- Stop after Phase 5 — report completion to overseer (Hermes)
