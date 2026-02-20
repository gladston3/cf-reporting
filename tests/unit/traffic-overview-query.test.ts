import { describe, it, expect, beforeAll } from 'vitest';

import {
  buildTrafficOverviewQuery,
  parseTrafficData,
  type TrafficOverviewData,
} from '@/lib/cloudflare/queries/traffic-overview';
import fixture from '../fixtures/cloudflare/traffic-overview-response.json';

describe('buildTrafficOverviewQuery', () => {
  it('returns a GraphQL query string with expected aliases', () => {
    const { query, variables } = buildTrafficOverviewQuery(
      'abc123',
      { start: '2026-02-13T00:00:00Z', end: '2026-02-20T00:00:00Z' },
    );

    expect(query).toContain('query TrafficOverview');
    expect(query).toContain('totals:');
    expect(query).toContain('trafficOverTime:');
    expect(query).toContain('statusCodeBreakdown:');
    expect(query).toContain('topPaths:');
    expect(query).toContain('topCountries:');
    expect(query).toContain('cachePerformance:');
    expect(variables.zoneTag).toBe('abc123');
    expect(variables.since).toBe('2026-02-13T00:00:00Z');
    expect(variables.until).toBe('2026-02-20T00:00:00Z');
  });
});

describe('parseTrafficData', () => {
  let data: TrafficOverviewData;

  beforeAll(() => {
    data = parseTrafficData(fixture.data);
  });

  it('extracts totals', () => {
    expect(data.totalRequests).toBe(1_916_778);
    expect(data.totalBandwidth).toBe(19_474_125_231);
    expect(data.totalVisitors).toBe(236_272);
  });

  it('computes cache hit ratio from hit + revalidated vs total cacheable', () => {
    expect(data.cacheHitRatio).toBeGreaterThan(0);
    expect(data.cacheHitRatio).toBeLessThanOrEqual(1);
  });

  it('parses traffic over time with 168 hourly entries', () => {
    expect(data.trafficOverTime).toHaveLength(168);
    expect(data.trafficOverTime[0]).toEqual({
      hour: '2026-02-13T00:00:00Z',
      requests: 4997,
      bandwidth: 67204747,
      visitors: 1397,
    });
  });

  it('parses status code breakdown ordered by count desc', () => {
    expect(data.statusCodes.length).toBeGreaterThan(0);
    expect(data.statusCodes[0].code).toBe(403);
    expect(data.statusCodes[0].count).toBe(865_779);
  });

  it('parses top paths', () => {
    expect(data.topPaths).toHaveLength(20);
    expect(data.topPaths[0].path).toBe('/cdn-cgi/rum');
    expect(data.topPaths[0].count).toBe(54_746);
  });

  it('parses top countries', () => {
    expect(data.topCountries).toHaveLength(15);
    expect(data.topCountries[0].country).toBe('US');
    expect(data.topCountries[0].count).toBe(435_232);
  });

  it('parses cache performance entries', () => {
    expect(data.cacheStatuses.length).toBeGreaterThan(0);
    const none = data.cacheStatuses.find((c) => c.status === 'none');
    expect(none).toBeDefined();
    expect(none!.count).toBe(1_022_203);
  });

  it('throws on empty zones array', () => {
    expect(() => parseTrafficData({ viewer: { zones: [] } })).toThrow();
  });
});
