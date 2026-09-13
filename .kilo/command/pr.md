---
name: pr
description: Run local checklist, push, create PR, and wait for CodeRabbit
agent: test-engineer
---
Load the coderabbit-workflow skill and execute the FAWRUN PR workflow:

1. **Pre-flight (Local Checklist)** — MANDATORY
   ```bash
   # Run in apps/api
   pnpm lint
   pnpm typecheck
   pnpm test
   pnpm db:generate
   ```
   Only proceed if ALL pass. test-engineer must approve.

2. **Stage, Commit, Push**
   ```bash
   git add .
   git commit -m "<type>: <description>"  # feat:, fix:, refactor:, chore:
   git push origin feature/sprint-N-<short-description>
   ```

3. **Open Pull Request**
   ```bash
   gh pr create --title "<type>: <description>" --body "<Sprint Brief + Done Criteria>"
   ```

4. **Wait for CodeRabbit Review — MANDATORY**
   - CodeRabbit reviews automatically via `.coderabbit.yaml` path_instructions
   - Wait 1-3 minutes after PR creation/update for comments

5. **Address CodeRabbit Comments**
   - For EACH comment: apply fix → re-run local checklist → push → resolve
   - Use `@coderabbitai summary` / `@coderabbitai explain <id>` in PR comments
   - Use `@coderabbitai fix` for auto-fixable suggestions (review before applying)

6. **Merge Only After**
   - ✅ All CodeRabbit comments resolved
   - ✅ All CI checks pass
   - ✅ test-engineer approval recorded
   - ✅ At least 1 human approval (if required)
   - ✅ Squash and merge to main

**Blocked states:** If any check fails, Kilo blocks push and requires fix before retry.