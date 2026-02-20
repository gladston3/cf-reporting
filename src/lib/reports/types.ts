import type { TimeRange } from '@/lib/cloudflare/types';

export interface ReportConfig {
  zoneId: string;
  timeRange: TimeRange;
  zoneName?: string;
}

export type CloudflareFetcher = (
  query: string,
  variables: Record<string, unknown>,
) => Promise<unknown>;

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  generate: (config: ReportConfig, fetcher: CloudflareFetcher) => Promise<string>;
}
