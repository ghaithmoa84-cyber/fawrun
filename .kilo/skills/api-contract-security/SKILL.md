---
name: api-contract-security
description: "Enforces FAWRUN API contracts, validation, authorization, rate limiting, and standardized errors"
---

# API Contract and Security Skill

## Purpose

Protect every FAWRUN API change with a shared, typed, validated, authorized, and consistently observable contract. New endpoints must be safe by construction and compatible with the backend, admin dashboard, runner PWA, and customer app.

## When to Run

Run this skill for every:

- New or changed REST endpoint
- New or changed request, response, query, path, or WebSocket event type
- Authentication, authorization, role, rate-limit, CORS, or error-handling change
- Frontend integration that consumes an API contract
- Migration or refactor affecting an existing endpoint

## Gate Checks

### 1. Shared Contract First

- [ ] New DTOs and Zod schemas are added to `packages/shared-types/src/` before backend implementation
- [ ] The backend and all relevant frontends import the same shared types and schemas
- [ ] Zod validates every request body, query, and path input
- [ ] Response and error types are explicit and importable
- [ ] Public APIs contain no `any`; use precise types or `unknown` where a boundary requires it
- [ ] DTO fields match the intended Prisma fields without exposing unsafe internal data

### 2. Endpoint Structure

- [ ] The endpoint is under `/api/v1/`
- [ ] The controller uses the project validation pipe and NestJS conventions
- [ ] Pagination, filtering, sorting, and limits are validated and bounded
- [ ] The service owns business logic; the controller does not implement domain rules
- [ ] WebSocket events, when applicable, use shared schemas, authenticated rooms, and authorized recipients

### 3. Authorization and Authentication

- [ ] The endpoint has the correct authentication guard
- [ ] Role or resource authorization is explicit for every protected operation
- [ ] `@Public` is used only when the route is intentionally anonymous
- [ ] The current user is obtained through the project decorator, not trusted client input
- [ ] Object-level access is checked so users cannot read or mutate another tenant's or user's records
- [ ] Sensitive fields are excluded from responses and logs

### 4. Abuse and Transport Protection

- [ ] Rate limiting is configured for the endpoint according to its risk and expected usage
- [ ] Login, registration, password, and token operations use their stricter limits
- [ ] CORS allows only configured origins
- [ ] Helmet and security headers remain enabled
- [ ] Secrets and keys come from environment variables and are never hardcoded
- [ ] Error messages do not expose stack traces, SQL, tokens, personal data, or internal paths

### 5. Standardized Errors

- [ ] Errors use the standardized response defined in specification section 9.0
- [ ] Validation failures, authentication failures, authorization failures, conflicts, not-found responses, rate limits, and business-rule violations map to the correct status codes
- [ ] The global exception filter preserves the standard shape
- [ ] New error codes are documented in the shared contract or API specification

### 6. Verification Evidence

- [ ] Tests cover valid input, invalid input, unauthenticated access, unauthorized access, and not-found behavior
- [ ] Tests cover rate-limit or abuse behavior when the endpoint is risk-sensitive
- [ ] Tests verify the response/error shape and absence of sensitive data
- [ ] Relevant lint, typecheck, and test commands pass

## Required Commands

Run the commands that apply to the changed packages:

```bash
pnpm --filter @fawrun/shared-types lint
pnpm --filter @fawrun/shared-types typecheck
pnpm --filter fawrun-api lint
pnpm --filter fawrun-api typecheck
pnpm --filter fawrun-api test
pnpm --filter fawrun-api db:generate
pnpm lint
pnpm typecheck
```

If a command fails, record the failure and do not mark the gate as passed. Distinguish a new failure from a pre-existing repository failure.

## Output

Produce a concise gate report containing:

- Endpoint and HTTP method reviewed
- Shared DTO/Zod symbols and their locations
- Authentication, authorization, and rate-limit decisions
- Standardized error mappings
- Security and test evidence
- Blocking findings and the exact fix required

Do not approve an endpoint with missing validation, implicit trust, broad authorization, unbounded input, hardcoded secrets, or a nonstandard error response.

## Integration

- `@code-architect` defines the shared contract before implementation
- `@feature-dev` applies the contract and security controls while building the endpoint
- `@test-engineer` verifies the contract, authorization, abuse controls, and error shape before push
- `coderabbit-workflow` rechecks these concerns during the GitHub PR review
