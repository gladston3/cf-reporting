---
name: docker-ops
description: >
  Docker container architecture, build, and deployment. Use when modifying
  Dockerfiles, docker-compose configuration, debugging container issues,
  or setting up the development environment. Triggers: "docker", "container",
  "deploy", "build image", "compose", "healthcheck".
allowed-tools: "Read,Write,Edit,Bash(docker *),Bash(docker compose *),Glob,Grep"
---

# Docker Operations

cf-reporting uses Docker Compose with separate images for each concern.

## Container architecture

| Service   | Base image       | Purpose                        | Build target     |
|-----------|------------------|--------------------------------|------------------|
| app       | node:22-slim     | Next.js web server             | runner-app       |
| worker    | node:22-slim     | BullMQ report generation       | runner-worker    |
| migrate   | node:22-slim     | Prisma migration runner        | runner-migrate   |
| postgres  | postgres:16-alpine | Database                     | (stock image)    |
| redis     | redis:7-alpine   | Job queue backend              | (stock image)    |

## Build targets

The Dockerfile uses multi-stage builds with separate runner targets:

- **runner-app**: Next.js standalone output + static files + Prisma runtime
- **runner-worker**: Full production `node_modules` + compiled worker + canvas system deps
- **runner-migrate**: Prisma CLI + schema for running migrations

## Key system dependencies

The worker image needs Cairo/Pango for `chartjs-node-canvas`:
```
libcairo2 libpango-1.0-0 libpangocairo-1.0-0 libjpeg62-turbo libgif7 librsvg2-2
```

Build stage needs the dev headers:
```
build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
```

## Development commands

```bash
# Start all services
docker compose up -d

# Run migrations (one-shot)
docker compose run --rm migrate

# View logs
docker compose logs -f app worker

# Rebuild after dependency changes
docker compose build --no-cache app worker

# Run tests in container
docker compose exec app npx vitest run

# Access database
docker compose exec postgres psql -U cf_reporting
```

## Environment variables

All containers need:
- `DATABASE_URL` — Postgres connection string
- `REDIS_URL` — Redis connection string
- `ENCRYPTION_KEY` — 32-byte hex for API key encryption (app + worker only)

## Health checks

- **app**: `curl -f http://localhost:3000/api/health`
- **postgres**: `pg_isready -U cf_reporting`
- **redis**: `redis-cli ping`
- **worker**: no HTTP endpoint; monitor via BullMQ dashboard or logs
