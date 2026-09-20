---
name: coderabbit-workflow
description: "Enforces PR creation, local checklist verification (lint, typecheck, tests, Prisma), and CodeRabbit AI review resolution workflow for FAWRUN."
---

# CodeRabbit Workflow Skill — FAWRUN Edition

## Purpose
Enforce the correct PR workflow with CodeRabbit AI review for the FAWRUN monorepo.
CodeRabbit only reviews on GitHub PRs — local review is handled before push.

**FAWRUN-specific concerns reviewed:**
- State Machine enforcement (no direct status mutations)
- Ledger append-only (no updates, no deletes)
- Idempotency on critical operations (e.g., DELIVERED)
- Soft delete only (`isDeleted` flag)
- Zod validation on every input via `shared-types`
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
```

**Security & Quality Checks:**
- No hardcoded secrets
- Authorization on every endpoint (`@Roles` guard)
- Rate limiting configured per Spec Section 14
- Zod validation on all inputs (`ZodValidationPipe`)
- CORS restricted to allowed origins
- Helmet.js security headers present
- Password hashing uses bcrypt 12 rounds
- JWT uses RS256 with proper key management

Only push if ALL pass.

### 2. Push & Create PR
```bash
git push origin feature/sprint-N-<short-description>
gh pr create --title "<type>: <description>" --body "<PR description>"
```
- Branch naming: `feature/sprint-1-auth`, `feature/sprint-2-orders`, etc.
- PR title follows Conventional Commits: `feat:`, `fix:`, `refactor:`, `chore:`
- Reference the Sprint Brief in the PR body

### 3. Wait for CodeRabbit Review — MANDATORY
- Do NOT merge until CodeRabbit completes review.
- CodeRabbit posts comments on the PR leveraging `.coderabbit.yaml`.

### 4. Address CodeRabbit Comments
For EACH CodeRabbit comment:
- [ ] Read and understand the suggestion
- [ ] Apply fix locally
- [ ] Run local checklist again: `pnpm lint && pnpm typecheck && pnpm test && pnpm db:generate`
- [ ] Push fix to same branch
- [ ] Re-trigger review manually on GitHub (`@coderabbitai review` on PR)

### 5. Merge Only After
- [ ] All CodeRabbit comments resolved
- [ ] All CI checks pass (GitHub Actions)
- [ ] At least 1 human approval (if required by branch protection)
- [ ] Local tests and quality gates pass
- [ ] Squash and merge to main
