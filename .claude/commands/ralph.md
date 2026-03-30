You are building Kairn step by step from PLAN.md.

For each implementation step (Step 1 through Step 8) in PLAN.md:

1. PLAN: Read PLAN.md. Identify the next unfinished step. Check what files exist in src/ already. State what you will build.
2. BUILD: Implement that step fully. Write all files. Follow coding standards from .claude/rules/.
3. TEST: Run `npm run build`. Fix any compilation errors. Run `npx tsx src/cli.ts --help` to verify the CLI loads. If the step added a command, test it.
4. COMMIT: Run `git add -A && git commit -m "step N: description"`.

Then move to the next step. Stop after all 8 steps are complete or if you hit a blocker you cannot resolve.

Reference RESEARCH.md for tool registry data and Claude Code ecosystem details when building Steps 3-5.
