import type { TimeRange, TrafficQueryResult } from '../types';

const TRAFFIC_OVERVIEW_QUERY = `
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
}`;

export interface TrafficOverviewVariables {
  zoneTag: string;
  since: string;
  until: string;
}

export function buildTrafficOverviewQuery(
  zoneId: string,
  timeRange: TimeRange,
): { query: string; variables: TrafficOverviewVariables } {
  return {
    query: TRAFFIC_OVERVIEW_QUERY,
    variables: {
      zoneTag: zoneId,
      since: timeRange.start,
      until: timeRange.end,
    },
  };
}

export interface HourlyTraffic {
  hour: string;
  requests: number;
  bandwidth: number;
  visitors: number;
}

export interface StatusCodeEntry {
  code: number;
  count: number;
  bandwidth: number;
}

export interface PathEntry {
  path: string;
  count: number;
  bandwidth: number;
}

export interface CountryEntry {
  country: string;
  count: number;
  bandwidth: number;
  visitors: number;
}

export interface CacheStatusEntry {
  status: string;
  count: number;
  bandwidth: number;
}

export interface TrafficOverviewData {
  totalRequests: number;
  totalBandwidth: number;
  totalVisitors: number;
  cacheHitRatio: number;
  trafficOverTime: HourlyTraffic[];
  statusCodes: StatusCodeEntry[];
  topPaths: PathEntry[];
  topCountries: CountryEntry[];
  cacheStatuses: CacheStatusEntry[];
}

function computeCacheHitRatio(entries: TrafficQueryResult['viewer']['zones'][0]['cachePerformance']): number {
  const hitStatuses = new Set(['hit', 'stale', 'revalidated']);
  let hitCount = 0;
  let totalCacheable = 0;

  for (const entry of entries) {
    const status = String(entry.dimensions?.cacheStatus ?? '').toLowerCase();
    if (status === 'none' || status === 'dynamic') continue;
    totalCacheable += entry.count;
    if (hitStatuses.has(status)) hitCount += entry.count;
  }

  return totalCacheable > 0 ? hitCount / totalCacheable : 0;
}

export function parseTrafficData(raw: TrafficQueryResult): TrafficOverviewData {
  const zone = raw.viewer.zones[0];
  if (!zone) {
    throw new Error('No zone data returned from Cloudflare API');
  }

  const totals = zone.totals[0];

  return {
    totalRequests: totals?.count ?? 0,
    totalBandwidth: totals?.sum.edgeResponseBytes ?? 0,
    totalVisitors: totals?.sum?.visits ?? 0,
    cacheHitRatio: computeCacheHitRatio(zone.cachePerformance),

    trafficOverTime: zone.trafficOverTime.map((g) => ({
      hour: String(g.dimensions?.datetimeHour ?? ''),
      requests: g.count,
      bandwidth: g.sum.edgeResponseBytes,
      visitors: g.sum.visits ?? 0,
    })),

    statusCodes: zone.statusCodeBreakdown.map((g) => ({
      code: Number(g.dimensions?.edgeResponseStatus ?? 0),
      count: g.count,
      bandwidth: g.sum.edgeResponseBytes,
    })),

    topPaths: zone.topPaths.map((g) => ({
      path: String(g.dimensions?.clientRequestPath ?? ''),
      count: g.count,
      bandwidth: g.sum.edgeResponseBytes,
    })),

    topCountries: zone.topCountries.map((g) => ({
      country: String(g.dimensions?.clientCountryName ?? ''),
      count: g.count,
      bandwidth: g.sum.edgeResponseBytes,
      visitors: g.sum.visits ?? 0,
    })),

    cacheStatuses: zone.cachePerformance.map((g) => ({
      status: String(g.dimensions?.cacheStatus ?? ''),
      count: g.count,
      bandwidth: g.sum.edgeResponseBytes,
    })),
  };
}
