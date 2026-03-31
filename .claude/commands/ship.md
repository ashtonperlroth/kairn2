Implement the next unreleased version from ROADMAP.md.

1. READ ROADMAP.md. Find the first version with unchecked items (- [ ]). That is the target version.

2. READ the design doc for that version at docs/design/v1.X-*.md (match the version number). If no design doc exists, use the ROADMAP checklist items as the spec.

3. IMPLEMENT each unchecked item in the design doc, one at a time:
   - Read the relevant section of the design doc
   - Write the code
   - Run `npm run build` to verify compilation
   - Git commit with message: "feat(v1.X): description of what was implemented"

4. After ALL items are implemented, TEST against the checklist at the bottom of the design doc. Fix any failures.

5. UPDATE CHANGELOG.md:
   - Add a new version section at the top
   - List all changes under ### Added, ### Fixed, ### Changed as appropriate
   - Use the same descriptions from git commits

6. UPDATE ROADMAP.md:
   - Check off all completed items (change `- [ ]` to `- [x]`)
   - Change version status to ✅

7. BUMP VERSION:
   - Run `npm version minor --no-git-tag-version`
   - Run `npm run build`
   - Git commit: "v1.X.0 — short description"
   - Git tag: `git tag v1.X.0`

8. REPORT what was built, what tests passed, and remind the user to run:
   ```
   npm publish --access public
   git push --tags
   ```

Follow all coding standards from .claude/rules/. Reference RESEARCH files at ~/Projects/kairn-internal/ if you need ecosystem context.
