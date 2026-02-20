export interface TimeRange {
  start: string;
  end: string;
}

export interface CloudflareGqlError {
  message: string;
  path?: string[];
  extensions?: { code: string };
}

export interface CloudflareGqlResponse<T> {
  data: T | null;
  errors?: CloudflareGqlError[];
}

export interface HttpRequestsGroup {
  count: number;
  sum: {
    edgeResponseBytes: number;
    visits?: number;
  };
  dimensions?: Record<string, string | number>;
}

export interface TrafficQueryResult {
  viewer: {
    zones: Array<{
      totals: HttpRequestsGroup[];
      trafficOverTime: HttpRequestsGroup[];
      statusCodeBreakdown: HttpRequestsGroup[];
      topPaths: HttpRequestsGroup[];
      topCountries: HttpRequestsGroup[];
      cachePerformance: HttpRequestsGroup[];
    }>;
  };
}
