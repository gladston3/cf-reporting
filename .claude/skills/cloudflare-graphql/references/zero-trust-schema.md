# Cloudflare Zero Trust / CF One GraphQL Schema

All Zero Trust queries use `accountTag` (not `zoneTag`).
Endpoint is the same: `https://api.cloudflare.com/client/v4/graphql`

---

## gatewayResolverQueriesAdaptiveGroups

DNS queries flowing through Cloudflare Gateway. This is the primary
dataset for DNS security reports, blocked categories, and user activity.

### Dimensions
- `datetime`, `datetimeHour`, `datetimeMinute`
- `queryName` — the DNS name queried (e.g., "facebook.com")
- `queryTypeName` — A, AAAA, CNAME, MX, TXT, etc.
- `resolverDecision` — allowedByPolicy, blockedByCategory, blockedByPolicy,
  blockedBySchedule, blockedAsMalware, blockedAsPhishing, overrideForSafeSearch,
  overrideApplied
- `resolverPolicyName` — name of the Gateway policy that matched
- `resolverPolicyID`
- `deviceName` — WARP device name (if enrolled)
- `deviceID`
- `email` — user email (if authenticated via WARP)
- `locationName` — Gateway location name
- `locationID`
- `categoryIDs` — content category IDs (array)
- `coloCode` — edge colo

### Aggregations
- `count` — number of queries

### Category ID mapping (common)
Cloudflare uses numeric IDs for content categories. Common ones:
- 32: Malware
- 67: Phishing
- 133: Spam
- 68: Spyware
- 109: Command & Control
- 155: DGA (Domain Generation Algorithm)
- 174: New domains
- 176: Newly seen domains
- 83: Adult content
- 138: Social networking
- 101: Gambling
- 167: VPN (consumer)
- 89: Streaming media

Note: Full mapping available via REST API `GET /accounts/{id}/gateway/categories`.
Do NOT hardcode these in application code — fetch dynamically and cache.

### Common filters
```graphql
filter: {
  datetime_gt: $since
  datetime_lt: $until
  resolverDecision_in: ["blockedByCategory", "blockedByPolicy", "blockedAsMalware"]
}
```

### Typical report queries

**Top blocked domains:**
```graphql
gatewayResolverQueriesAdaptiveGroups(
  filter: {
    datetime_gt: $since, datetime_lt: $until,
    resolverDecision_in: ["blockedByCategory", "blockedByPolicy",
                          "blockedAsMalware", "blockedAsPhishing"]
  }
  limit: 50
  orderBy: [count_DESC]
) {
  count
  dimensions { queryName resolverDecision }
}
```

**Blocked queries by category:**
```graphql
gatewayResolverQueriesAdaptiveGroups(
  filter: {
    datetime_gt: $since, datetime_lt: $until,
    resolverDecision_neq: "allowedByPolicy"
  }
  limit: 100
  orderBy: [count_DESC]
) {
  count
  dimensions { categoryIDs resolverDecision }
}
```

**Active users (by query volume):**
```graphql
gatewayResolverQueriesAdaptiveGroups(
  filter: { datetime_gt: $since, datetime_lt: $until }
  limit: 100
  orderBy: [count_DESC]
) {
  count
  dimensions { email deviceName }
}
```

**DNS query volume over time:**
```graphql
gatewayResolverQueriesAdaptiveGroups(
  filter: { datetime_gt: $since, datetime_lt: $until }
  limit: 1000
  orderBy: [datetimeHour_ASC]
) {
  count
  dimensions { datetimeHour resolverDecision }
}
```

---

## gatewayL4FlowsAdaptiveGroups

Layer 4 network flows through Gateway (WARP tunnel / proxy).

### Dimensions
- `datetime`, `datetimeHour`
- `transport` — TCP, UDP, ICMP
- `destIP` — destination IP
- `destPort` — destination port
- `action` — allowed, blocked, isolate
- `policyName`, `policyID`
- `deviceName`, `deviceID`
- `email`
- `locationName`, `locationID`
- `detectionName` — threat detection (e.g., "Malware", "Botnet C2")

### Aggregations
- `count` — number of flows
- `sum.packets`
- `sum.bytes`

---

## accessRequestsAdaptiveGroups

Cloudflare Access application access events.

### Dimensions
- `datetime`
- `appName` — Access application name
- `appDomain` — application domain
- `action` — allow, block
- `email` — user email
- `userIP`
- `country`
- `policyName`
- `identityProviderType` — Google, Okta, AzureAD, etc.

### Aggregations
- `count`

### Typical report queries

**Application access summary:**
```graphql
accessRequestsAdaptiveGroups(
  filter: { datetime_gt: $since, datetime_lt: $until }
  limit: 100
  orderBy: [count_DESC]
) {
  count
  dimensions { appName action }
}
```

**Access by user:**
```graphql
accessRequestsAdaptiveGroups(
  filter: { datetime_gt: $since, datetime_lt: $until }
  limit: 100
  orderBy: [count_DESC]
) {
  count
  dimensions { email appName country }
}
```
