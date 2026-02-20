# ADR: Traffic Overview Report

Date: 2026-02-20

## Status: APPROVED

## Context

The Traffic Overview report is the first turnkey report template for cf-reporting. It provides a comprehensive web traffic analytics summary for a single Cloudflare zone over a configurable time range, using the `httpRequestsAdaptiveGroups` GraphQL dataset.

This is the foundational report that establishes the patterns all future templates will follow: GraphQL query layer, data processing pipeline, report template interface, HTML rendering, and test fixture conventions.

## Decision

### Report Sections

The Traffic Overview report renders six sections:

1. **Hero + Summary Stats** — total requests, bandwidth, unique visitors, cache hit ratio
2. **Traffic Over Time** — line chart of requests per hour/day (grouped by `datetimeHour`)
3. **Status Code Breakdown** — doughnut chart + table of status codes grouped by class (2xx/3xx/4xx/5xx)
4. **Top Paths** — table of top 20 request paths by volume
5. **Top Countries** — table + horizontal bar chart of top 15 countries by request count
6. **Cache Performance** — doughnut chart of cache status distribution (HIT/MISS/DYNAMIC/etc.) + bandwidth saved stat

### GraphQL Queries

Five queries against `httpRequestsAdaptiveGroups`, all scoped to a single `zoneTag` + time range:

| Query | Dimensions | Order | Limit | Purpose |
|-------|-----------|-------|-------|---------|
| `trafficOverTime` | `datetimeHour` | `datetimeHour_ASC` | 1000 | Time-series for line chart |
| `statusCodeBreakdown` | `edgeResponseStatus` | `count_DESC` | 100 | Status code distribution |
| `topPaths` | `clientRequestPath` | `count_DESC` | 20 | Most-requested paths |
| `topCountries` | `clientCountryName` | `count_DESC` | 15 | Geo distribution |
| `cachePerformance` | `cacheStatus` | `count_DESC` | 20 | Cache hit/miss breakdown |

All queries fetch `count` and `sum { edgeResponseBytes visits }` aggregations.

### TypeScript Interfaces

```typescript
// src/lib/cloudflare/types.ts

export interface TimeRange {
  start: string; // ISO 8601
  end: string;   // ISO 8601
}

export interface CloudflareGqlResponse<T> {
  data: T | null;
  errors?: Array<{
    message: string;
    path?: string[];
    extensions?: { code: string };
  }>;
}

export interface HttpRequestsGroup {
  count: number;
  sum: {
    edgeResponseBytes: number;
    visits: number;
  };
  dimensions: Record<string, string | number>;
}

export interface TrafficQueryResult {
  viewer: {
    zones: Array<{
      trafficOverTime: HttpRequestsGroup[];
      statusCodeBreakdown: HttpRequestsGroup[];
      topPaths: HttpRequestsGroup[];
      topCountries: HttpRequestsGroup[];
      cachePerformance: HttpRequestsGroup[];
      totals: HttpRequestsGroup[];
    }>;
  };
}
```

```typescript
// src/lib/reports/types.ts

export interface ReportConfig {
  zoneId: string;
  timeRange: TimeRange;
  zoneName?: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  generate: (config: ReportConfig, fetcher: CloudflareFetcher) => Promise<string>;
}

export type CloudflareFetcher = (
  query: string,
  variables: Record<string, unknown>
) => Promise<unknown>;
```

### Data Flow

```
ReportConfig (zoneId + timeRange)
  → trafficOverview.generate()
    → buildTrafficQuery(zoneId, timeRange)     // constructs GraphQL query string
    → fetcher(query, variables)                 // calls Cloudflare API
    → parseTrafficData(rawResponse)             // validates + transforms
    → renderTrafficReport(parsedData, config)   // produces HTML string
  → HTML string returned
```

### Single Combined Query

All five data slices are fetched in a **single GraphQL request** using aliases:

```graphql
query TrafficOverview($zoneTag: string!, $since: string!, $until: string!) {
  viewer {
    zones(filter: { zoneTag: $zoneTag }) {
      totals: httpRequestsAdaptiveGroups(
        filter: { datetime_gt: $since, datetime_lt: $until }
        limit: 1
      ) {
        count
        sum { edgeResponseBytes visits }
      }
      trafficOverTime: httpRequestsAdaptiveGroups(
        filter: { datetime_gt: $since, datetime_lt: $until }
        limit: 1000
        orderBy: [datetimeHour_ASC]
      ) {
        count
        sum { edgeResponseBytes visits }
        dimensions { datetimeHour }
      }
      statusCodeBreakdown: httpRequestsAdaptiveGroups(
        filter: { datetime_gt: $since, datetime_lt: $until }
        limit: 100
        orderBy: [count_DESC]
      ) {
        count
        sum { edgeResponseBytes }
        dimensions { edgeResponseStatus }
      }
      topPaths: httpRequestsAdaptiveGroups(
        filter: { datetime_gt: $since, datetime_lt: $until }
        limit: 20
        orderBy: [count_DESC]
      ) {
        count
        sum { edgeResponseBytes }
        dimensions { clientRequestPath }
      }
      topCountries: httpRequestsAdaptiveGroups(
        filter: { datetime_gt: $since, datetime_lt: $until }
        limit: 15
        orderBy: [count_DESC]
      ) {
        count
        sum { edgeResponseBytes visits }
        dimensions { clientCountryName }
      }
      cachePerformance: httpRequestsAdaptiveGroups(
        filter: { datetime_gt: $since, datetime_lt: $until }
        limit: 20
        orderBy: [count_DESC]
      ) {
        count
        sum { edgeResponseBytes }
        dimensions { cacheStatus }
      }
    }
  }
}
```

### HTML Rendering

Uses the base template from `.claude/skills/report-builder/assets/base-template.html` with the project design system. Charts render client-side via Chart.js 4.x loaded from CDN (reports are self-contained HTML files).

### No Database Changes

This ADR covers the report template only. No database tables are needed — template registration, scheduling, and persistence are separate concerns for a future ADR.

## File Changes

### New files

- `src/lib/cloudflare/types.ts` — shared Cloudflare API types (TimeRange, CloudflareGqlResponse, HttpRequestsGroup)
- `src/lib/cloudflare/client.ts` — thin HTTP client wrapping `fetch` for Cloudflare GraphQL API; accepts an API token, returns typed responses
- `src/lib/cloudflare/queries/traffic-overview.ts` — GraphQL query string + response parser for the combined traffic overview query
- `src/lib/reports/types.ts` — ReportTemplate and ReportConfig interfaces
- `src/lib/reports/templates/traffic-overview.ts` — the report template module exporting `generate()`
- `src/lib/reports/render-utils.ts` — shared HTML rendering helpers (format numbers, build chart configs, section builders)
- `tests/fixtures/cloudflare/traffic-overview-response.json` — mock GraphQL response fixture
- `tests/unit/traffic-overview-query.test.ts` — tests for query builder + response parser
- `tests/unit/traffic-overview-report.test.ts` — tests for the report template (HTML output structure, data formatting)

### Modified files

None — this is the first feature. All existing files are `.gitkeep` placeholders.

## Alternatives Considered

### 1. Separate queries per section vs. single combined query

**Rejected: Separate queries.** Five round-trips to Cloudflare adds latency and consumes more of the 300 req/5min rate budget. A single aliased query is idiomatic GraphQL and returns all data in one HTTP call.

### 2. Server-side chart rendering via chartjs-node-canvas vs. client-side Chart.js

**Chose: Client-side Chart.js for HTML reports.** The generated report is a self-contained HTML file. Client-side charts mean the HTML file works when opened in a browser with no server needed. Server-side rendering (chartjs-node-canvas) will be used later for PDF export, which is a separate concern.

### 3. Streaming HTML generation vs. string concatenation

**Chose: String concatenation via template literals.** Reports are ~50-200KB of HTML. String building is simpler, testable, and fast enough. Streaming adds complexity with no real benefit at this size.

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Cloudflare API rate limiting (300/5min) | Report generation fails mid-way | Single combined query uses only 1 API call per report |
| `httpRequestsAdaptiveGroups` returns sampled data at high traffic volumes | Numbers are estimates, not exact | Display `avg.sampleInterval` as a confidence indicator in the report footer |
| Zone has no traffic in the selected time range | Empty report with zero values | Detect empty `totals` and render a clear "No data" message instead of blank charts |
| GraphQL query exceeds 10,000 row limit | Truncated time series for long date ranges | For ranges > 30 days, group by `datetime` (daily) instead of `datetimeHour` |
