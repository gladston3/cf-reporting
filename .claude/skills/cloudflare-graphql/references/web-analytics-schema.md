# Cloudflare Web Analytics GraphQL Schema

## httpRequestsAdaptiveGroups

Primary dataset for web traffic analytics.

### Dimensions (group by)
- `datetime` — timestamp (ISO 8601)
- `datetimeHour`, `datetimeMinute`, `datetimeFifteenMinutes` — time buckets
- `clientCountryName` — visitor country
- `clientASNDescription` — visitor ASN name
- `clientRequestHTTPHost` — hostname
- `clientRequestHTTPMethodName` — GET, POST, etc.
- `clientRequestPath` — URL path
- `edgeResponseStatus` — HTTP status code (200, 404, 503, etc.)
- `edgeResponseContentTypeName` — content type
- `cacheStatus` — HIT, MISS, DYNAMIC, etc.
- `coloCode` — Cloudflare edge colo (e.g., VIE, FRA, CDG)
- `upperTierColoName` — upper tier colo
- `botScore` — 1 (bot) to 99 (human)
- `botScoreSrcName` — ML, heuristics, JS fingerprint, etc.

### Aggregations (sum/avg/ratio)
- `sum.edgeResponseBytes` — total bandwidth
- `sum.visits` — unique visitor sessions
- `count` — total request count
- `avg.sampleInterval` — sampling interval

### Common filters
```graphql
filter: {
  datetime_gt: "2025-01-01T00:00:00Z"
  datetime_lt: "2025-01-15T00:00:00Z"
  clientCountryName: "AT"              # optional
  edgeResponseStatus: 200              # optional
  botScore_lt: 30                      # optional: likely bots
}
```

### Limits
- Maximum 10,000 rows per query
- Use `orderBy` + `limit` for top-N queries
- For time series: group by `datetimeHour` or `datetimeFifteenMinutes`

---

## firewallEventsAdaptiveGroups

WAF, firewall rules, rate limiting, bot management events.

### Dimensions
- `datetime`
- `action` — block, challenge, jschallenge, managedChallenge, skip, log
- `ruleId` — rule that triggered
- `source` — firewallRules, l7ddos, rateLimit, botManagement, waf, etc.
- `clientIP` — attacker IP
- `clientCountryName`
- `clientASNDescription`
- `clientRequestHTTPHost`
- `clientRequestPath`
- `clientRequestHTTPMethodName`
- `userAgent` — full user agent string
- `rayName` — Cloudflare ray ID

### Aggregations
- `count` — number of events

### Common filters
```graphql
filter: {
  datetime_gt: $since
  datetime_lt: $until
  action_in: ["block", "challenge"]    # only blocked/challenged
  source: "firewallRules"              # specific source
}
```

### Typical report queries

**Top attacking IPs:**
```graphql
firewallEventsAdaptiveGroups(
  filter: { datetime_gt: $since, datetime_lt: $until }
  limit: 20
  orderBy: [count_DESC]
) {
  count
  dimensions { clientIP clientCountryName clientASNDescription }
}
```

**Events by action type:**
```graphql
firewallEventsAdaptiveGroups(
  filter: { datetime_gt: $since, datetime_lt: $until }
  limit: 10
  orderBy: [count_DESC]
) {
  count
  dimensions { action source }
}
```

**Events over time:**
```graphql
firewallEventsAdaptiveGroups(
  filter: { datetime_gt: $since, datetime_lt: $until }
  limit: 1000
  orderBy: [datetimeHour_ASC]
) {
  count
  dimensions { datetimeHour action }
}
```
