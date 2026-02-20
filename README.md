# cf-reporting

Open-source Cloudflare reporting platform. Generate beautiful, scheduled reports from your Cloudflare analytics data — covering both Web/Application Security and Zero Trust.

## Features

- **Turnkey report templates**: Traffic Overview, Security Posture, WAF Analysis, Gateway DNS, Zero Trust Executive Summary, and more
- **Scheduled generation**: Daily, weekly, or monthly reports delivered automatically
- **Self-hosted**: Your data stays on your infrastructure
- **Beautiful output**: Dark-themed HTML reports with interactive Chart.js visualizations
- **MSP-friendly**: Multi-zone and multi-account support with encrypted API key storage

## Quick Start

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/cf-reporting.git
cd cf-reporting

# Copy environment template
cp .env.example .env.local

# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Add the output to ENCRYPTION_KEY in .env.local

# Start with Docker Compose
docker compose up -d

# Run database migrations (one-shot)
docker compose run --rm migrate

# Open http://localhost:3000
```

## Architecture

```
┌──────────────┐     ┌───────────┐     ┌──────────┐
│   Next.js    │────▶│  Postgres │     │  Redis   │
│   (app)      │     │  (data)   │     │  (queue) │
└──────────────┘     └───────────┘     └──────────┘
                                            │
                                     ┌──────┴──────┐
                                     │   BullMQ    │
                                     │  (worker)   │
                                     └─────────────┘
                                            │
                                     ┌──────┴──────┐
                                     │ Cloudflare  │
                                     │ GraphQL API │
                                     └─────────────┘
```

- **app**: Next.js 15 web server — dashboard UI, API routes, report viewer
- **worker**: BullMQ processor — scheduled report generation, chart rendering
- **postgres**: Report schedules, encrypted API tokens, generated report metadata
- **redis**: Job queue for BullMQ

## Development

```bash
# Install dependencies
npm install

# Start database + redis
docker compose up postgres redis -d

# Run migrations
npm run db:migrate

# Start dev server
npm run dev

# Run tests
npm test

# Type check
npm run typecheck
```

## Report Templates

Reports live in `src/lib/reports/templates/`. Each template exports:

- `fetchData(config, client)` — fetches data from Cloudflare APIs
- `renderHtml(config, data)` — generates self-contained HTML report

Available templates (planned):
- Traffic Overview
- Security Posture
- WAF Analysis
- Gateway DNS Activity
- Zero Trust Executive Summary
- Access Application Audit
- Bot Management Summary

## Contributing

See [CLAUDE.md](CLAUDE.md) for development workflow, code conventions, and architecture guidelines.

## License

MIT
