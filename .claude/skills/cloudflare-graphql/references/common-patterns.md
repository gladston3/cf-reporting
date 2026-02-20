# Common Cloudflare GraphQL Patterns

## Time range handling

Cloudflare uses ISO 8601 timestamps. Always compute server-side:

```typescript
export interface TimeRange {
  start: string; // ISO 8601: "2025-01-01T00:00:00Z"
  end: string;   // ISO 8601: "2025-01-15T23:59:59Z"
}

export function daysAgo(days: number): TimeRange {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}
```

**Important**: Cloudflare GraphQL uses `datetime_gt` / `datetime_lt` (exclusive).
For inclusive ranges, adjust by 1 second.

## Pagination

Cloudflare GraphQL does NOT support cursor-based pagination.
Maximum 10,000 rows per query. Strategies for large datasets:

1. **Time-window splitting**: Break 30-day range into daily queries.
2. **Aggregation**: Use `orderBy` + `limit` for top-N (avoids needing all rows).
3. **Dimension filtering**: Query per-country, per-action, etc. separately.

## Error handling

Cloudflare GraphQL returns HTTP 200 even for errors. Always check:

```typescript
interface CloudflareGqlResponse<T> {
  data: T | null;
  errors?: Array<{
    message: string;
    path?: string[];
    extensions?: { code: string };
  }>;
}

function handleResponse<T>(response: CloudflareGqlResponse<T>): T {
  if (response.errors?.length) {
    const msg = response.errors.map(e => e.message).join('; ');
    throw new CloudflareApiError(msg, response.errors);
  }
  if (!response.data) {
    throw new CloudflareApiError('Empty response from Cloudflare API');
  }
  return response.data;
}
```

## Rate limiting

- 300 queries per 5 minutes per zone/account
- Implement with a token bucket: allow burst, then throttle

```typescript
// Use src/lib/cloudflare/rate-limiter.ts
// Tokens: 300, refill rate: 1 per second, bucket size: 300
```

## Multi-zone queries

For accounts with multiple zones, DO NOT query all zones in one GraphQL request.
Query each zone separately and aggregate in application code.
The API applies per-zone rate limits, so parallel requests across zones are fine.

## Authentication

Two auth methods:
1. **API Token** (recommended): `Authorization: Bearer {token}`
   - Scoped to specific zones/permissions
   - Token needs: `Zone > Analytics > Read` for web analytics
   - Token needs: `Account > Access > Read` for Zero Trust
2. **Global API Key** (legacy): `X-Auth-Email` + `X-Auth-Key` headers

cf-reporting stores tokens encrypted in Postgres. At query time,
decrypt and pass via Authorization header. Never log tokens.
