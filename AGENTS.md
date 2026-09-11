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
- Never use ny in typed APIs

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
- Semantic commits: eat:, ix:, efactor:, etc.
- Branch per Sprint: eature/sprint-N-<description>
- No direct push to main
- Use /pr command to ensure full workflow
- Wait for CodeRabbit review before merge

### Security Rules
- No hardcoded secrets
- Authorization on every endpoint
- Rate limiting configured per endpoint
- Zod input validation everywhere
- See test-engineer agent for full security checklist

### Rollback Plans
Financial operations (Ledger, Settlement, Order fees) require a documented
rollback plan BEFORE execution. Use /rollback-plan command to create one.

## Agents
- @code-architect — Sprint planning, schema design, state machine validation
- @feature-dev — Endpoint implementation
- @test-engineer — Tests, lint, typecheck, security checks
- @debugger — Bug investigation (on-demand only)

## Skills
- pre-sprint-checklist — Pre-Sprint validation
- ollback-plan — Financial rollback documentation
- coderabbit-workflow — PR workflow with CodeRabbit review

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
