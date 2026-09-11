# CodeRabbit Workflow Skill — FAWRUN Edition

## Purpose
Enforce the correct PR workflow with CodeRabbit AI review for the FAWRUN monorepo.
CodeRabbit only reviews on GitHub PRs — local review is `@test-engineer`'s job.

**FAWRUN-specific concerns reviewed:**
- State Machine enforcement (no direct status mutations)
- Ledger append-only (no updates, no deletes)
- Idempotency on critical operations (e.g., DELIVERED)
- Soft delete only (isDeleted flag)
- Zod validation on every input via shared-types
- Role-based authorization on every endpoint

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
# - Authorization on every endpoint (@Roles guard)
# - Rate limiting configured per Spec Section 14
# - Zod validation on all inputs (ZodValidationPipe)
# - CORS restricted to allowed origins
# - Helmet.js security headers present
# - Password hashing uses bcrypt 12 rounds
# - JWT uses RS256 with proper key management
```

Only push if ALL pass. Kilo enforces this — push is blocked otherwise.

### 2. Push & Create PR
```bash
git push origin feature/sprint-N-<short-description>
gh pr create --title "<type>: <description>" --body "<PR description>"
```
- Branch naming: `feature/sprint-1-auth`, `feature/sprint-2-orders`, etc.
- PR title follows Conventional Commits: `feat:`, `fix:`, `refactor:`, `chore:`
- Reference the Sprint Brief in the PR body

### 3. Wait for CodeRabbit Review — MANDATORY
- Do NOT merge until CodeRabbit completes review
- CodeRabbit posts comments on the PR (leveraging `.coderabbit.yaml` path_instructions)
- Typical wait: 1-3 minutes after PR creation/update

**CodeRabbit leverages `.coderabbit.yaml` which includes:**
- `path: "apps/api/src/**/modules/**/*.ts"` → Security, Transactions, State Machine
- `path: "apps/api/src/**/state-machine/**/*.ts"` → Transition validity, Idempotency
- `path: "apps/api/src/**/modules/**/*service.ts"` → Ledger append-only, Debit=Credit
- `path: "packages/shared-types/src/**/*.ts"` → Zod schemas match Prisma exactly
- `path: "packages/shared-constants/src/**/*.ts"` → Pricing logic accuracy
- `path: "apps/api/prisma/schema.prisma"` → Decimal for financial fields, relations

### 4. Address CodeRabbit Comments
For EACH CodeRabbit comment:
- [ ] Read and understand the suggestion
- [ ] Apply fix locally
- [ ] Run local checklist again (step 1): `pnpm lint && pnpm typecheck && pnpm test`
- [ ] Push fix to same branch
- [ ] Resolve comment on GitHub ("Resolve conversation")

Use these commands in PR comments or VS Code:
- `@coderabbitai summary` — Get high-level PR summary
- `@coderabbitai review` — Re-trigger full review
- `@coderabbitai fix` — Auto-fix suggestions (review before applying)
- `@coderabbitai explain <id>` — Explain specific comment
- `@coderabbitai resolve` — Close all resolved comments

### 5. Merge Only After
- [ ] All CodeRabbit comments resolved
- [ ] All CI checks pass (GitHub Actions)
- [ ] At least 1 human approval (if required by branch protection)
- [ ] test-engineer approval recorded
- [ ] Squash and merge to main

## VS Code Integration
Install the **CodeRabbit** extension in VS Code and link it to the FAWRUN GitHub repo.
This catches issues **inline during coding** — reducing GitHub PR review cycles by up to 80%.

Focus areas while coding in VS Code:
- [ ] No `any` types without explicit `unknown` cast
- [ ] Zod validation present on new DTOs
- [ ] `@Roles` decorator on every controller method
- [ ] Financial operations wrapped in `$transaction`
- [ ] State changes go through State Machine only

## Integration with @test-engineer
The `@test-engineer` agent runs the local checklist (step 1) and reports results.
Only when test-engineer reports "ALL CHECKS PASS" can the push proceed.

## Integration with @code-architect
The `@code-architect` agent runs `/pre-sprint` before development begins, ensuring:
- Prisma schema is compatible with the Sprint
- Shared types are up to date
- No State Machine conflicts
- Rollback plans exist for financial operations

## GitHub Branch Protection (Configure Once)
- Require PR before merge
- Require status checks: lint, typecheck, test
- Require CodeRabbit review (via GitHub App)
- Require 1 approval
- No direct pushes to main
- Auto-delete branch after merge

## Kilo Enforcement
- Kilo will block `git push` to main directly
- Kilo will remind to wait for CodeRabbit before merge
- Kilo will verify local checklist passed before allowing push
- Kilo will read CodeRabbit comments via GitHub API and suggest fixes
- `/pre-sprint` enforces pre-sprint-checklist before any work begins
- `/rollback-plan` enforces financial rollback documentation before execution