# ADR: {Feature Name}
Date: {YYYY-MM-DD}

## Status: DRAFT

## Context
What problem are we solving? Why now? What triggered this change?

## Decision
What approach do we take? Be specific:

- Which Cloudflare API endpoints / GraphQL query nodes
- New TypeScript interfaces (write them out)
- Data flow: API call → processing → storage → rendering
- New database tables or columns (if any)
- New API routes (if any)

## File Changes
List every file that will be created or modified:

- `src/lib/cloudflare/queries/{name}.ts` — {description}
- `src/lib/reports/templates/{name}.ts` — {description}
- `tests/unit/{name}.test.ts` — {description}
- `tests/fixtures/cloudflare/{name}-response.json` — {description}

## Alternatives Considered
What other approaches did we evaluate? Why did we choose this one?

## Risks
What could go wrong? How do we mitigate each risk?
