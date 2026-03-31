Implement the next unreleased version from ROADMAP.md using specialized subagents, isolated worktrees, and PR workflow.

## Phase 1: PLAN
Delegate to the @planner agent:
"@planner Read ROADMAP.md, find the next unreleased version, read its design doc, and output a structured sprint backlog."

Review the backlog. This is the implementation order.

## Phase 2: BRANCH
Create a release branch in an isolated worktree:
```
git worktree add ../kairn-release-vX.Y -b release/vX.Y
cd ../kairn-release-vX.Y
```
All remaining work happens in the worktree directory.

## Phase 3: IMPLEMENT
For each backlog item, delegate to the @implementer agent:

"@implementer Implement item N from the v1.X design doc (docs/design/v1.X-*.md):
[paste the specific section from the design doc here].
Working directory: ../kairn-release-vX.Y"

Wait for the implementer to finish and commit before moving to the next item.
If the implementer hits a blocker, try to resolve it, then re-delegate.

## Phase 4: VERIFY
Delegate to the @qa-orchestrator agent:

"@qa-orchestrator Run the full QA suite for release vX.Y.
Testing checklist is in docs/design/v1.X-*.md under 'Testing This Release'.
Working directory: ../kairn-release-vX.Y"

The QA orchestrator will:
- Delegate static analysis to @linter
- Run build and type checks directly
- Run functional test checklist items
- Delegate E2E tests to @e2e-tester (if Playwright available)
- Return a consolidated QA report

Review the report:
- If verdict is READY TO SHIP: proceed to Phase 5
- If verdict is NEEDS FIXES: delegate each failure to @implementer, then re-run @qa-orchestrator

## Phase 5: FINALIZE
After QA passes, in the worktree directory:

1. Update CHANGELOG.md — add new version section with all changes
2. Update ROADMAP.md — check off completed items (- [ ] → - [x]), mark version ✅
3. Run: `npm version minor --no-git-tag-version`
4. Run: `npm run build`
5. Commit: "vX.Y.0 — short description of this release"

## Phase 6: PR
Create a pull request from the release branch:
```
gh pr create --title "release: vX.Y.0 — short description" --body "## Changes

$(git log main..HEAD --oneline)

## QA Report
[paste verdict from Phase 4]" --base main
```

Print a status summary:

```
RELEASE vX.Y.0 READY
=====================
Branch:    release/vX.Y
PR:        #N (link)
Changes:   X commits
QA:        all passing
Agents:    @planner → @implementer (×N) → @qa-orchestrator (@linter + @e2e-tester)

Next steps:
  1. Review the PR at the link above
  2. Merge to main
  3. git checkout main && git pull
  4. git tag vX.Y.0 && git push --tags
  5. npm publish --access public
  6. git worktree remove ../kairn-release-vX.Y
```
