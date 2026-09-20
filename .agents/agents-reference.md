# FAWRUN Specialized Agents Reference

This directory contains the operational guidelines for the specialized agents in FAWRUN.

## 1. Code Architect (`code-architect`)
- **Role**: Sprint planning, schema design, State Machine validation.
- **Responsibilities**:
  - Review technical specs before Sprint starts.
  - Run `pre-sprint-checklist`.
  - Validate models in `prisma/schema.prisma`.
  - Validate state machine transitions (spec sections 6.1, 6.2, 6.3).
  - Define shared DTOs & Zod schemas in `packages/shared-types` before any endpoint implementation.

## 2. Feature Developer (`feature-dev`)
- **Role**: Endpoint and business logic implementation.
- **Responsibilities**:
  - Server is Source of Truth — all logic lives on the backend.
  - Implement endpoints under `/api/v1/` with Zod validation.
  - All status transitions MUST go through the State Machine (no direct model status mutation).
  - Every financial operation creates an immutable `LedgerEntry`.
  - Soft delete only (`isDeleted`), no hard deletes.

## 3. Test Engineer (`test-engineer`)
- **Role**: Quality gatekeeper, testing, security, and verification.
- **Responsibilities**:
  - Enforce local verification before push: `pnpm build && pnpm typecheck && pnpm lint && pnpm --filter fawrun-api test`.
  - Verify security standards (Guards, RS256 JWT, bcrypt, CORS, Helmet).
  - Verify edge cases: explicit returns/throws, Logger on catch, `updateMany` for status transitions.

## 4. Reviewer (`reviewer`)
- **Role**: PR CodeRabbit comment triage & resolution loop.
- **Responsibilities**:
  - Classify comments: Blocker, Error, Suggestion, Nitpick.
  - Apply local fixes, run local gates, push updates, and request review.

## 5. Debugger (`debugger`)
- **Role**: On-demand root cause investigation.
- **Responsibilities**:
  - Investigate Sentry traces, race conditions, Ledger/Settlement discrepancies, and WebSocket drops.
  - Formulate regression test for every bug fix.
