# cf-reporting — Cloudflare Reporting Platform

Open-source tool for generating beautiful, scheduled reports from Cloudflare analytics data.
Supports both Web/Application Security and Zero Trust / Cloudflare One reporting.

## Tech Stack

- **Runtime**: Node.js 22 LTS, TypeScript 5.x (strict mode, no `any` without justification)
- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL 16 via Prisma ORM
- **Queue**: BullMQ + Redis for scheduled report generation
- **UI**: Tailwind CSS + shadcn/ui, dark theme by default
- **Charts**: Chart.js (server-side rendering for reports via chartjs-node-canvas, client-side for dashboards)
- **Containerization**: Docker Compose (app + worker + migrate + postgres + redis)
- **Testing**: Vitest for unit/integration, Playwright for e2e

## Architecture Principles

- All Cloudflare API interactions go through `src/lib/cloudflare/` — never call APIs directly from components or routes.
- Report templates live in `src/lib/reports/templates/` — each template is a self-contained module exporting a `generate()` function.
- API keys are encrypted at rest in Postgres (AES-256-GCM). Never log, print, or include in error messages.
- Every report template must work with mock data for testing. Mock fixtures live in `tests/fixtures/cloudflare/`.
- Environment variables go in `.env.local` (gitignored). Document every required var in `.env.example`.

## Code Conventions

- Functions: < 50 lines, single responsibility. Extract helpers.
- Naming: camelCase for variables/functions, PascalCase for components/types, SCREAMING_SNAKE for constants.
- Imports: group as (1) node built-ins, (2) external packages, (3) internal `@/` aliases. Blank line between groups.
- Error handling: all external API calls wrapped in try/catch. Use typed error classes from `src/lib/errors.ts`.
- No `console.log` in production code. Use the structured logger from `src/lib/logger.ts`.
- Prisma migrations: always generate with a descriptive name (`npx prisma migrate dev --name add_report_schedules`).
- Comments: explain WHY, not WHAT. Code should be self-documenting.

## Development Workflow (MANDATORY)

Every feature follows this process. Hooks enforce steps 1 and 3.

### Phase 1: Architecture (enforced by PreToolUse hook)
- Invoke `/architect` skill before writing ANY implementation code.
- An ADR (Architecture Decision Record) must exist at `docs/decisions/{feature-name}.md`.
- The `/architect` skill writes the ADR path to `.claude/ACTIVE_ADR` (gitignored pointer file).
- The ADR must contain the marker `## Status: APPROVED` before implementation can begin.
- The PreToolUse hook reads `.claude/ACTIVE_ADR`, checks the referenced ADR is approved,
  and blocks Write/Edit on gated paths until it is.
- **Escape hatch**: Create `.claude/SKIP_STOP_GATE` to bypass the Stop quality gate if stuck.

### Phase 2: Implementation
- Follow TDD: write a failing test → implement → refactor.
- Commit logical units. Commit messages follow Conventional Commits (feat:, fix:, docs:, test:, chore:).
- Run `npm run typecheck && npm run lint` before considering a task complete.

### Phase 3: QA Review (enforced by Stop hook)
- After implementation, invoke `/qa-review` for an independent code review.
- The QA review runs as a forked subagent with NO write access.
- Blocking issues must be resolved before the feature is considered done.
- The Stop hook verifies tests pass and typecheck succeeds before allowing session end.

### Gated Paths (ADR required)
Files matching these patterns require an approved ADR:
- `src/**` (all source code)
- `prisma/schema.prisma` (data model changes)

### Exempt Paths (no ADR required)
- `tests/**`, `*.test.ts`, `*.spec.ts`
- `*.css`, `*.scss`, `tailwind.config.*`
- `docs/**`, `README.md`, `CLAUDE.md`
- `.env*`, `docker-compose.*`, `Dockerfile*`
- `package.json`, `package-lock.json`, `tsconfig.json`, `*.config.*`
- `prisma/migrations/**`
- `.claude/**`, `.gitignore`, `LICENSE`, `.gitkeep`

## Cloudflare API Reference

The Cloudflare GraphQL Analytics API endpoint is `https://api.cloudflare.com/client/v4/graphql`.
Auth header: `Authorization: Bearer {api_token}`.

Key GraphQL datasets:
- `httpRequestsAdaptiveGroups` — web traffic analytics
- `firewallEventsAdaptiveGroups` — WAF/firewall events
- `gatewayResolverQueriesAdaptiveGroups` — Gateway DNS queries (Zero Trust)
- `gatewayL4FlowsAdaptiveGroups` — Gateway L4 network flows (Zero Trust)
- `accessRequestsAdaptiveGroups` — Access audit logs (Zero Trust)

Always consult `.claude/skills/cloudflare-graphql/references/` for schema details before writing queries.

## Project Structure

```
cf-reporting/
├── CLAUDE.md                          # This file
├── .claude/                           # Claude Code configuration
│   ├── skills/                        # Skills (expert playbooks)
│   ├── agents/                        # Custom subagent definitions
│   ├── hooks/                         # Enforcement hooks
│   └── settings.json                  # Hook registration
├── docs/
│   ├── decisions/                     # Architecture Decision Records
│   └── reports/                       # Report template documentation
├── src/
│   ├── app/                           # Next.js App Router pages + API routes
│   │   ├── api/                       # API routes
│   │   ├── dashboard/                 # Dashboard pages
│   │   └── reports/                   # Report viewer pages
│   ├── lib/
│   │   ├── cloudflare/                # Cloudflare API client + GraphQL queries
│   │   ├── reports/
│   │   │   ├── templates/             # Report template modules
│   │   │   └── renderer.ts            # HTML report renderer
│   │   ├── db/                        # Prisma client + helpers
│   │   ├── queue/                     # BullMQ job definitions
│   │   ├── crypto.ts                  # API key encryption
│   │   ├── errors.ts                  # Typed error classes
│   │   └── logger.ts                  # Structured logger
│   ├── components/                    # React UI components
│   └── workers/                       # BullMQ worker processes
├── tests/
│   ├── fixtures/cloudflare/           # Mock API responses
│   ├── unit/                          # Unit tests
│   └── integration/                   # Integration tests
├── docker/                            # Dockerfile(s)
├── prisma/                            # Prisma schema + migrations
├── docker-compose.yml
├── package.json
└── .env.example
```
