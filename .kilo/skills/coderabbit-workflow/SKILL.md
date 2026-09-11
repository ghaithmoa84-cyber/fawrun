# CodeRabbit Workflow Skill

## Purpose
Enforce the correct PR workflow with CodeRabbit AI review. CodeRabbit only reviews on GitHub PRs — local review is test-engineer's job.

## Workflow Steps

### 1. Before Push (Local Checklist) — MANDATORY
Run ALL of these before `git push`:
```bash
# In apps/api
pnpm lint
pnpm typecheck
pnpm test
pnpm db:generate  # Verify Prisma client compiles

# Security checks (integrated in test-engineer)
# - No hardcoded secrets
# - Authorization on every endpoint
# - Rate limiting configured
# - Zod validation on all inputs
```

Only push if ALL pass.

### 2. Push & Create PR
```bash
git push origin feature/<sprint>-<short-description>
gh pr create --title "<type>: <description>" --body "<PR description>"
```
- Branch naming: `feature/sprint-1-auth`, `feature/sprint-2-orders`, etc.
- PR title follows Conventional Commits: `feat:`, `fix:`, `refactor:`, `chore:`

### 3. Wait for CodeRabbit Review — MANDATORY
- Do NOT merge until CodeRabbit completes review
- CodeRabbit posts comments on the PR
- Typical wait: 1-3 minutes after PR creation/update

### 4. Address CodeRabbit Comments
For EACH CodeRabbit comment:
- [ ] Read and understand the suggestion
- [ ] Apply fix locally
- [ ] Run local checklist again (step 1)
- [ ] Push fix to same branch
- [ ] Resolve comment on GitHub ("Resolve conversation")

### 5. Merge Only After
- [ ] All CodeRabbit comments resolved
- [ ] All CI checks pass (GitHub Actions)
- [ ] At least 1 human approval (if required by branch protection)
- [ ] Squash and merge to main

## Kilo Enforcement
- Kilo will block `git push` to main directly
- Kilo will remind to wait for CodeRabbit before merge
- Kilo will verify local checklist passed before allowing push
- Kilo will read CodeRabbit comments via GitHub API and suggest fixes

## Integration with test-engineer
The test-engineer skill runs the local checklist (step 1) and reports results. Only when test-engineer reports "ALL CHECKS PASS" can the push proceed.

## GitHub Branch Protection (Configure Once)
- Require PR before merge
- Require status checks: lint, typecheck, test
- Require CodeRabbit review (via GitHub App)
- Require 1 approval
- No direct pushes to main
- Auto-delete branch after merge