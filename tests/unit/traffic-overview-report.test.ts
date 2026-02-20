import { describe, it, expect, vi } from 'vitest';

import { trafficOverviewTemplate } from '@/lib/reports/templates/traffic-overview';
import { parseTrafficData } from '@/lib/cloudflare/queries/traffic-overview';
import type { ReportConfig, CloudflareFetcher } from '@/lib/reports/types';
import fixture from '../fixtures/cloudflare/traffic-overview-response.json';

const config: ReportConfig = {
  zoneId: 'test-zone-id',
  timeRange: { start: '2026-02-13T00:00:00Z', end: '2026-02-20T00:00:00Z' },
  zoneName: 'example.com',
};

describe('trafficOverviewTemplate', () => {
  it('has correct metadata', () => {
    expect(trafficOverviewTemplate.id).toBe('traffic-overview');
    expect(trafficOverviewTemplate.name).toBe('Traffic Overview');
  });

  it('generates a complete HTML report', async () => {
    const fetcher: CloudflareFetcher = vi.fn().mockResolvedValue(fixture.data);
    const html = await trafficOverviewTemplate.generate(config, fetcher);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('</html>');
    expect(html).toContain('Traffic Overview');
    expect(html).toContain('example.com');
  });

  it('calls fetcher with the correct query and variables', async () => {
    const fetcher: CloudflareFetcher = vi.fn().mockResolvedValue(fixture.data);
    await trafficOverviewTemplate.generate(config, fetcher);

    expect(fetcher).toHaveBeenCalledOnce();
    const [query, variables] = (fetcher as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(query).toContain('TrafficOverview');
    expect(variables.zoneTag).toBe('test-zone-id');
  });

  it('renders hero section with summary stats', async () => {
    const fetcher: CloudflareFetcher = vi.fn().mockResolvedValue(fixture.data);
    const html = await trafficOverviewTemplate.generate(config, fetcher);

    expect(html).toContain('1.9M');
    expect(html).toContain('Total Requests');
    expect(html).toContain('Bandwidth');
    expect(html).toContain('Visitors');
    expect(html).toContain('Cache Hit');
  });

  it('includes all six sections', async () => {
    const fetcher: CloudflareFetcher = vi.fn().mockResolvedValue(fixture.data);
    const html = await trafficOverviewTemplate.generate(config, fetcher);

    expect(html).toContain('Section 01');
    expect(html).toContain('Section 02');
    expect(html).toContain('Section 03');
    expect(html).toContain('Section 04');
    expect(html).toContain('Section 05');
  });

  it('renders traffic over time chart canvas', async () => {
    const fetcher: CloudflareFetcher = vi.fn().mockResolvedValue(fixture.data);
    const html = await trafficOverviewTemplate.generate(config, fetcher);

    expect(html).toContain('id="trafficChart"');
    expect(html).toContain('new Chart');
  });

  it('renders status code table with 403 as top code', async () => {
    const fetcher: CloudflareFetcher = vi.fn().mockResolvedValue(fixture.data);
    const html = await trafficOverviewTemplate.generate(config, fetcher);

    expect(html).toContain('403');
    expect(html).toContain('865,779');
  });

  it('renders top paths table', async () => {
    const fetcher: CloudflareFetcher = vi.fn().mockResolvedValue(fixture.data);
    const html = await trafficOverviewTemplate.generate(config, fetcher);

    expect(html).toContain('/cdn-cgi/rum');
    expect(html).toContain('54,746');
  });

  it('renders top countries table', async () => {
    const fetcher: CloudflareFetcher = vi.fn().mockResolvedValue(fixture.data);
    const html = await trafficOverviewTemplate.generate(config, fetcher);

    expect(html).toContain('US');
    expect(html).toContain('435,232');
  });

  it('renders cache performance section', async () => {
    const fetcher: CloudflareFetcher = vi.fn().mockResolvedValue(fixture.data);
    const html = await trafficOverviewTemplate.generate(config, fetcher);

    expect(html).toContain('id="cacheChart"');
    expect(html).toContain('none');
    expect(html).toContain('dynamic');
    expect(html).toContain('hit');
  });

  it('includes Chart.js CDN script', async () => {
    const fetcher: CloudflareFetcher = vi.fn().mockResolvedValue(fixture.data);
    const html = await trafficOverviewTemplate.generate(config, fetcher);

    expect(html).toContain('chart.umd.min.js');
  });

  it('renders self-contained HTML (inline CSS)', async () => {
    const fetcher: CloudflareFetcher = vi.fn().mockResolvedValue(fixture.data);
    const html = await trafficOverviewTemplate.generate(config, fetcher);

    expect(html).toContain('<style>');
    expect(html).toContain('--bg-deep');
  });
});

describe('empty traffic (zero requests)', () => {
  const emptyZoneData = {
    viewer: {
      zones: [{
        totals: [{ count: 0, sum: { edgeResponseBytes: 0, visits: 0 } }],
        trafficOverTime: [],
        statusCodeBreakdown: [],
        topPaths: [],
        topCountries: [],
        cachePerformance: [],
      }],
    },
  };

  it('renders a "No data" message instead of charts', async () => {
    const fetcher: CloudflareFetcher = vi.fn().mockResolvedValue(emptyZoneData);
    const html = await trafficOverviewTemplate.generate(config, fetcher);

    expect(html).toContain('No traffic data');
    expect(html).not.toContain('id="trafficChart"');
    expect(html).not.toContain('Section 01');
  });

  it('does not produce NaN or Infinity in HTML', async () => {
    const fetcher: CloudflareFetcher = vi.fn().mockResolvedValue(emptyZoneData);
    const html = await trafficOverviewTemplate.generate(config, fetcher);

    expect(html).not.toContain('NaN');
    expect(html).not.toContain('Infinity');
  });
});

describe('error propagation', () => {
  it('propagates fetcher rejection', async () => {
    const fetcher: CloudflareFetcher = vi.fn().mockRejectedValue(new Error('network timeout'));

    await expect(trafficOverviewTemplate.generate(config, fetcher)).rejects.toThrow('network timeout');
  });

  it('propagates fetcher thrown error', async () => {
    const fetcher: CloudflareFetcher = vi.fn().mockImplementation(() => {
      throw new Error('sync failure');
    });

    await expect(trafficOverviewTemplate.generate(config, fetcher)).rejects.toThrow('sync failure');
  });
});
