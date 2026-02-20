import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createCloudflareClient, CloudflareApiError } from '@/lib/cloudflare/client';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function jsonResponse(body: unknown, status = 200, statusText = 'OK') {
  return new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('createCloudflareClient', () => {
  const client = createCloudflareClient('test-token');

  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('sends correct headers and body', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ data: { ok: true }, errors: null }));
    await client.query('query { viewer { zones { id } } }', { zoneTag: 'z1' });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.cloudflare.com/client/v4/graphql');
    expect(opts.headers.Authorization).toBe('Bearer test-token');
    expect(JSON.parse(opts.body)).toEqual({
      query: 'query { viewer { zones { id } } }',
      variables: { zoneTag: 'z1' },
    });
  });

  it('returns typed data on success', async () => {
    const payload = { viewer: { zones: [{ id: 'z1' }] } };
    mockFetch.mockResolvedValue(jsonResponse({ data: payload, errors: null }));

    const result = await client.query<typeof payload>('query {}');
    expect(result).toEqual(payload);
  });

  it('throws CloudflareApiError on HTTP 403', async () => {
    mockFetch.mockResolvedValue(new Response('Forbidden', { status: 403, statusText: 'Forbidden' }));

    await expect(client.query('query {}')).rejects.toThrow(CloudflareApiError);
    await expect(client.query('query {}')).rejects.toThrow('HTTP 403');
  });

  it('throws CloudflareApiError on HTTP 500', async () => {
    mockFetch.mockResolvedValue(new Response('Error', { status: 500, statusText: 'Internal Server Error' }));

    await expect(client.query('query {}')).rejects.toThrow(CloudflareApiError);
    await expect(client.query('query {}')).rejects.toThrow('HTTP 500');
  });

  it('throws CloudflareApiError with joined messages on GraphQL errors', async () => {
    mockFetch.mockResolvedValue(jsonResponse({
      data: null,
      errors: [
        { message: 'field not found' },
        { message: 'rate limited' },
      ],
    }));

    await expect(client.query('query {}')).rejects.toThrow('field not found; rate limited');
  });

  it('exposes errors array on CloudflareApiError', async () => {
    const gqlErrors = [{ message: 'bad query', path: ['viewer'] }];
    mockFetch.mockResolvedValue(jsonResponse({ data: null, errors: gqlErrors }));

    try {
      await client.query('query {}');
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(CloudflareApiError);
      expect((err as CloudflareApiError).errors).toEqual(gqlErrors);
    }
  });

  it('throws CloudflareApiError on null data with no errors', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ data: null }));

    await expect(client.query('query {}')).rejects.toThrow('Empty response');
  });
});
