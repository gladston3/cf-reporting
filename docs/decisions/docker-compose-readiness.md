# ADR: Docker Compose Readiness

Date: 2026-02-20

## Status: APPROVED

## Context

The Docker Compose configuration (`docker-compose.yml`) and multi-stage Dockerfile (`docker/Dockerfile`) are fully scaffolded but cannot build successfully. There are five blockers:

1. **No `public/` directory** — the Dockerfile `COPY --from=builder /app/public ./public` fails
2. **No `src/workers/index.ts`** — `npm run build` runs `tsup src/workers/index.ts` which doesn't exist
3. **No Prisma migrations** — `prisma migrate deploy` has nothing to deploy
4. **No `/api/health` endpoint** — the `app` service healthcheck curls `http://localhost:3000/api/health`
5. **No Prisma client singleton** — `src/lib/db/` is empty, no shared PrismaClient instance exists

The MVP frontend and API route work via `npm run dev`, but the production Docker path is broken. Fixing this is necessary before any deployment.

## Decision

### 1. Create `public/` directory

Create an empty `public/` directory with a `robots.txt` placeholder. Next.js standalone output requires this directory to exist even if empty.

### 2. Create placeholder worker

Create `src/workers/index.ts` as a minimal BullMQ worker skeleton that:
- Connects to Redis via `REDIS_URL` environment variable
- Registers a `report-generation` queue processor
- Logs startup and graceful shutdown
- Does NOT implement actual job processing yet — just logs "job received" and marks complete

This is enough for the Docker build to succeed and the worker container to start and stay healthy. Actual job processing will be implemented in a future ADR.

```typescript
// src/workers/index.ts
import { Worker } from 'bullmq';
import IORedis from 'ioredis';

import { logger } from '../lib/logger';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

const worker = new Worker(
  'report-generation',
  async (job) => {
    logger.info('Job received (not yet implemented)', {
      jobId: job.id,
      jobName: job.name,
    });
  },
  { connection },
);

worker.on('ready', () => logger.info('Worker ready', { queue: 'report-generation' }));
worker.on('failed', (job, err) => logger.error('Job failed', { jobId: job?.id, error: err.message }));

async function shutdown() {
  logger.info('Shutting down worker...');
  await worker.close();
  await connection.quit();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
```

### 3. Generate initial Prisma migration

Run `npx prisma migrate dev --name init` to create the initial migration from the existing schema. This creates the `prisma/migrations/` directory with a timestamped migration SQL file. The Docker `runner-migrate` service can then run `prisma migrate deploy` successfully.

### 4. Create health check API route

Create `GET /api/health` returning `{ status: "ok" }`. The Docker healthcheck already curls this endpoint. It should also verify the database connection via Prisma to report actual health.

```typescript
// src/app/api/health/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
}
```

For now the health check is simple — just returns ok. Database connectivity checks can be added once the app actually uses the database (future ADR).

### 5. Create Prisma client singleton

Create `src/lib/db/index.ts` exporting a shared PrismaClient singleton (standard Next.js pattern to avoid creating multiple clients in dev mode's hot reload).

```typescript
// src/lib/db/index.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

### 6. Fix build script for worker

The `build` script in `package.json` is `next build && npm run build:worker`. If the worker source uses `@/` path aliases (via tsconfig), `tsup` needs the alias configured. However, since the worker is a standalone Node.js process (not Next.js), the simpler approach is to use relative imports in the worker file. The `build:worker` script is already correct: `tsup src/workers/index.ts --out-dir dist/workers --format cjs --target node22`.

The worker will import from `@/lib/logger` which needs to resolve at build time. We add a `tsup.config.ts` that configures the path alias for the worker build, OR we use relative imports in the worker file. We use `tsup`'s `--tsconfig` flag with the existing tsconfig.

Actually, `tsup` does not resolve TypeScript path aliases by default. The cleanest fix: the worker uses relative imports instead of `@/` aliases, since it's a standalone entry point bundled by tsup. This avoids adding extra tooling.

### 7. Dockerfile adjustments

The Dockerfile's `COPY --from=builder /app/public ./public` will work once `public/` exists. No Dockerfile changes needed — only the missing source files.

## File Changes

### New files

- `public/robots.txt` — minimal robots.txt (allows all crawlers)
- `src/workers/index.ts` — placeholder BullMQ worker with graceful shutdown
- `src/app/api/health/route.ts` — GET health check endpoint
- `src/lib/db/index.ts` — PrismaClient singleton
- `prisma/migrations/{timestamp}_init/migration.sql` — auto-generated by `prisma migrate dev`
- `tests/unit/health-api.test.ts` — test for health endpoint
- `tests/unit/db-client.test.ts` — test for Prisma singleton export

### Modified files

None — existing `package.json` build scripts and Dockerfile work as-is once the missing files are created.

## Alternatives Considered

### 1. Remove worker service from docker-compose.yml entirely

**Rejected.** The worker service is scaffolded and will be needed for scheduled report generation. Removing it means re-adding it later. A placeholder worker is simpler and keeps the architecture intact.

### 2. Use `prisma db push` instead of migrations

**Rejected.** `prisma db push` is for prototyping. Migrations provide a versioned, auditable history of schema changes and are the correct approach for production (Docker `migrate` service uses `prisma migrate deploy`).

### 3. Skip the health check endpoint

**Rejected.** The Docker healthcheck is already configured to curl `/api/health`. Without it, the `app` container will be marked unhealthy, and dependent services may not start. A simple JSON response is trivial to implement.

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Prisma migration generated in dev may not match production Postgres exactly | Migration fails on deploy | Both use PostgreSQL 16; schema is straightforward (no extensions/custom types). |
| Worker placeholder does nothing | Confusing for users who expect report scheduling to work | Clear log message: "Job received (not yet implemented)". Document in README. |
| `tsup` may not resolve `@/` aliases in worker entry point | Build fails | Worker uses relative imports for its dependencies, sidestepping the issue. |
| Health check doesn't verify database connectivity | False positive health signal | Acceptable for MVP. DB health check is a future enhancement. |
