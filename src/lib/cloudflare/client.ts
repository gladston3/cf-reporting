import type { CloudflareGqlResponse } from './types';

const CLOUDFLARE_GQL_ENDPOINT = 'https://api.cloudflare.com/client/v4/graphql';

export class CloudflareApiError extends Error {
  constructor(
    message: string,
    public readonly errors?: CloudflareGqlResponse<unknown>['errors'],
  ) {
    super(message);
    this.name = 'CloudflareApiError';
  }
}

export function createCloudflareClient(apiToken: string) {
  async function query<T>(
    gql: string,
    variables: Record<string, unknown> = {},
  ): Promise<T> {
    const res = await fetch(CLOUDFLARE_GQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: gql, variables }),
    });

    if (!res.ok) {
      throw new CloudflareApiError(
        `Cloudflare API HTTP ${res.status}: ${res.statusText}`,
      );
    }

    const json = (await res.json()) as CloudflareGqlResponse<T>;

    if (json.errors?.length) {
      const msg = json.errors.map((e) => e.message).join('; ');
      throw new CloudflareApiError(msg, json.errors);
    }

    if (!json.data) {
      throw new CloudflareApiError('Empty response from Cloudflare API');
    }

    return json.data;
  }

  return { query };
}

export type CloudflareClient = ReturnType<typeof createCloudflareClient>;
