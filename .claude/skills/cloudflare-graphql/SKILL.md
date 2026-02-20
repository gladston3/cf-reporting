---
name: cloudflare-graphql
description: >
  Cloudflare GraphQL Analytics API reference and query patterns. Use when
  writing or debugging Cloudflare API queries, understanding available data
  fields, or building report data fetchers. Provides schema documentation,
  common query patterns, and rate limit guidance. Triggers: "cloudflare API",
  "GraphQL query", "analytics data", "what fields are available",
  "gateway query", "firewall events query", "DNS analytics".
allowed-tools: "Read,Grep,Glob"
user-invocable: true
---

# Cloudflare GraphQL Analytics API

This skill provides reference documentation for the Cloudflare GraphQL
Analytics API. Use this when building or modifying data fetchers.

## Quick reference

- **Endpoint**: `https://api.cloudflare.com/client/v4/graphql`
- **Auth**: `Authorization: Bearer {api_token}` header
- **Method**: POST with JSON body
- **Rate limits**: 300 queries/5 min per zone, response max 10,000 rows

## Available reference files

Load these as needed — do NOT load all of them at once:

- [Web Analytics Schema](references/web-analytics-schema.md) — httpRequestsAdaptiveGroups,
  firewallEventsAdaptiveGroups, response codes, cache, bandwidth
- [Zero Trust Schema](references/zero-trust-schema.md) — gatewayResolverQueriesAdaptiveGroups,
  gatewayL4FlowsAdaptiveGroups, accessRequestsAdaptiveGroups
- [Common Patterns](references/common-patterns.md) — reusable query patterns,
  time range handling, pagination, error handling

## Query conventions for this project

All query functions MUST:
1. Live in `src/lib/cloudflare/queries/`
2. Accept typed parameters: `zoneId`, `accountId`, `timeRange: { start: string, end: string }`
3. Return typed responses (define interfaces in same file)
4. Handle errors: wrap in try/catch, throw typed errors from `src/lib/errors.ts`
5. Respect rate limits: use the rate limiter from `src/lib/cloudflare/rate-limiter.ts`

## Example query structure

```typescript
import { cloudflareGql } from '@/lib/cloudflare/client';
import { CloudflareApiError } from '@/lib/errors';
import type { TimeRange } from '@/lib/cloudflare/types';

interface HttpOverviewData {
  requests: number;
  cachedRequests: number;
  threats: number;
  bandwidth: number;
  responseStatusMap: Record<string, number>;
}

export async function fetchHttpOverview(
  zoneId: string,
  timeRange: TimeRange
): Promise<HttpOverviewData> {
  const query = `
    query HttpOverview($zoneTag: string!, $since: Time!, $until: Time!) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          httpRequestsAdaptiveGroups(
            filter: { datetime_gt: $since, datetime_lt: $until }
            limit: 1000
          ) {
            count
            dimensions { ... }
            sum { ... }
          }
        }
      }
    }
  `;
  // ... implementation
}
```

Consult the reference files linked above for complete field lists and filter options.
