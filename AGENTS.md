# FAWRUN Coding Standards & Workflow

## Project Overview
FAWRUN is a grocery delivery platform built as a Modular Monolith in a Monorepo.
- Backend: NestJS + PostgreSQL + Prisma + Socket.IO
- Admin Dashboard: Next.js 14 (App Router)
- Runner PWA: React + Vite + PWA
- Customer App: Kotlin (Native Android)

## Coding Rules (Spec Section 17)

### 1. Server is Source of Truth
- Never compute fees or change states on the frontend
- All business logic lives in the backend

### 2. State Machine Enforcement
- Every status change MUST go through the State Machine
- Never mutate the status field directly on a model
- All transitions are logged to AuditLog

### 3. Financial Operations
- Every financial operation = LedgerEntry
- Ledger is append-only (no updates, no deletes)
- Multi-step financial ops must use DB transactions
- Idempotency on critical operations (e.g., DELIVERED)

### 4. Data Integrity
- Soft delete only (isDeleted flag, no hard deletes)
- AuditLog and LedgerEntry: never delete, ever
- orderNumber generated from seqNumber inside a transaction after save

### 5. Types First
- New DTOs go in packages/shared-types first
- Zod schemas shared between backend and frontend
- Never use any in typed APIs

### 6. API Standards
- All endpoints under /api/v1/
- Zod validation on every input
- Environment variables for all secrets
- Standardized error responses (spec section 9.0)

## Workflow

### Sprint Flow
1. code-architect runs /pre-sprint (runs pre-sprint-checklist)
2. feature-dev implements endpoints
3. test-engineer runs full local checklist
4. /pr command: commit + push + create PR + wait for CodeRabbit
5. CodeRabbit reviews on GitHub (not locally)
6. Kilo reads CodeRabbit comments and fixes them
7. Merge to main

### Git Rules
- Semantic commits: feat:, fix:, refactor:, etc.
- Branch per Sprint: feature/sprint-N-<description>
- No direct push to main
- Use /pr command to ensure full workflow
- Wait for CodeRabbit review before merge

### Security Rules
- No hardcoded secrets
- Authorization on every endpoint
- Rate limiting configured per endpoint
- Zod input validation everywhere
- See test-engineer agent for full security checklist

2. Load each applicable skill once per active task context. When delegating to a subagent, pass the applicable skill requirement to that subagent.
3. If multiple skills apply, load all of them. Use this order when applicable: `pre-sprint-checklist`, then `fawrun-domain-gate` and/or `api-contract-security`, then `rollback-plan`, then `coderabbit-workflow`.
4. Do not load unrelated skills for a task. If a skill is already loaded in the active context, do not reload it.
5. Automatic activation means reading and applying the skill checks. It does not bypass approval or automatically execute destructive or state-changing actions, including production migrations, financial operations, `git push`, merge, or PR creation.
6. Preserve all existing `AGENTS.md` rules, agent responsibilities, commands, security requirements, and Sprint workflow. In particular, `/pre-sprint`, `/rollback-plan`, and `/pr` remain required where specified.
7. If an explicit user instruction conflicts with a skill, follow the explicit user instruction, report the conflict, and do not silently ignore either constraint.
8. If the task scope is ambiguous, load the potentially relevant safety skill and state why; do not skip a safety gate because of uncertainty.
9. After loading a skill, report which skills were loaded and identify any blocking findings before proceeding.
10. Do not disable or replace global, compatibility, or previously configured skills.


## Commands
- /pre-sprint — Run pre-sprint checklist
- /rollback-plan — Create rollback plan for financial ops
- /pr — Full PR workflow with CodeRabbit

## Commands Reference
- pnpm build — Build all packages
- pnpm dev — Start all apps in dev mode
- pnpm lint — Lint all code
- pnpm typecheck — Type check all code
- pnpm test — Run all tests
- pnpm db:generate — Generate Prisma client
- pnpm db:push — Push schema to DB

## Validation Command
pnpm build && pnpm --filter fawrun-api test
