import { describe, it, expect, vi, beforeEach } from 'vitest';

// We test the validation schema and handler logic extracted from the route,
// not the Next.js route handler directly (which needs the Next.js runtime).
import { validateGenerateRequest, handleGenerate } from '@/lib/reports/generate';

describe('validateGenerateRequest', () => {
  const validBody = {
    apiToken: 'test-token-123',
    zoneId: 'abc123def456',
    templateId: 'traffic-overview',
    timeRange: {
      start: '2026-02-13T00:00:00Z',
      end: '2026-02-20T00:00:00Z',
    },
  };

  it('accepts a valid request', () => {
    const result = validateGenerateRequest(validBody);
    expect(result.success).toBe(true);
  });

  it('accepts optional zoneName', () => {
    const result = validateGenerateRequest({ ...validBody, zoneName: 'example.com' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.zoneName).toBe('example.com');
    }
  });

  it('rejects missing apiToken', () => {
    const { apiToken, ...body } = validBody;
    const result = validateGenerateRequest(body);
    expect(result.success).toBe(false);
  });

  it('rejects empty apiToken', () => {
    const result = validateGenerateRequest({ ...validBody, apiToken: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing zoneId', () => {
    const { zoneId, ...body } = validBody;
    const result = validateGenerateRequest(body);
    expect(result.success).toBe(false);
  });

  it('rejects missing templateId', () => {
    const { templateId, ...body } = validBody;
    const result = validateGenerateRequest(body);
    expect(result.success).toBe(false);
  });

  it('rejects missing timeRange', () => {
    const { timeRange, ...body } = validBody;
    const result = validateGenerateRequest(body);
    expect(result.success).toBe(false);
  });

  it('rejects invalid timeRange.start', () => {
    const result = validateGenerateRequest({
      ...validBody,
      timeRange: { start: 'not-a-date', end: '2026-02-20T00:00:00Z' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid timeRange.end', () => {
    const result = validateGenerateRequest({
      ...validBody,
      timeRange: { start: '2026-02-13T00:00:00Z', end: 'not-a-date' },
    });
    expect(result.success).toBe(false);
  });
});

describe('handleGenerate', () => {
  it('returns error for unknown templateId', async () => {
    const result = await handleGenerate({
      apiToken: 'test-token',
      zoneId: 'zone-1',
      templateId: 'nonexistent',
      timeRange: { start: '2026-02-13T00:00:00Z', end: '2026-02-20T00:00:00Z' },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('nonexistent');
      expect(result.statusCode).toBe(400);
    }
  });

  it('returns error when fetcher returns no data', async () => {
    // Mock fetcher returns undefined, causing the template to throw
    const mockFetcher = vi.fn();
    const result = await handleGenerate(
      {
        apiToken: 'test-token',
        zoneId: 'zone-1',
        zoneName: 'example.com',
        templateId: 'traffic-overview',
        timeRange: { start: '2026-02-13T00:00:00Z', end: '2026-02-20T00:00:00Z' },
      },
      mockFetcher,
    );
    // The mock fetcher will be called but returns undefined, causing an error.
    // That's fine — we verify the template lookup succeeded and it tried to generate.
    expect(mockFetcher).toHaveBeenCalledOnce();
    // Since the mock returns undefined, the template will throw, and we get an error result
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.statusCode).toBe(500);
    }
  });

  it('returns HTML when fetcher returns valid data', async () => {
    // Load the real fixture
    const fixture = await import('../fixtures/cloudflare/traffic-overview-response.json');
    const mockFetcher = vi.fn().mockResolvedValue(fixture.data);

    const result = await handleGenerate(
      {
        apiToken: 'test-token',
        zoneId: 'zone-1',
        zoneName: 'example.com',
        templateId: 'traffic-overview',
        timeRange: { start: '2026-02-13T00:00:00Z', end: '2026-02-20T00:00:00Z' },
      },
      mockFetcher,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.html).toContain('<!DOCTYPE html>');
      expect(result.html).toContain('Traffic Overview');
    }
  });

  it('does not include apiToken in error messages', async () => {
    const mockFetcher = vi.fn().mockRejectedValue(new Error('network error'));
    const result = await handleGenerate(
      {
        apiToken: 'super-secret-token-12345',
        zoneId: 'zone-1',
        templateId: 'traffic-overview',
        timeRange: { start: '2026-02-13T00:00:00Z', end: '2026-02-20T00:00:00Z' },
      },
      mockFetcher,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).not.toContain('super-secret-token-12345');
    }
  });
});
