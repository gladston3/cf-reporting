import { z } from 'zod';

import { createCloudflareClient } from '@/lib/cloudflare/client';
import { logger } from '@/lib/logger';

import { getTemplate } from './registry';
import type { CloudflareFetcher } from './types';

const isoDatetime = z.string().refine(
  (val) => !isNaN(Date.parse(val)),
  { message: 'Invalid ISO 8601 datetime' },
);

const zoneIdHex = z.string().regex(
  /^[0-9a-f]{32}$/i,
  'zoneId must be a 32-character hexadecimal string',
);

const generateRequestSchema = z.object({
  apiToken: z.string().min(1, 'apiToken is required'),
  zoneId: zoneIdHex,
  zoneName: z.string().optional(),
  templateId: z.string().min(1, 'templateId is required'),
  timeRange: z.object({
    start: isoDatetime,
    end: isoDatetime,
  }).refine(
    (range) => new Date(range.start) < new Date(range.end),
    { message: 'timeRange.start must be before timeRange.end' },
  ),
});

export type GenerateReportRequest = z.infer<typeof generateRequestSchema>;

export function validateGenerateRequest(body: unknown) {
  return generateRequestSchema.safeParse(body);
}

type GenerateResult =
  | { ok: true; html: string }
  | { ok: false; error: string; statusCode: number };

export async function handleGenerate(
  input: GenerateReportRequest,
  fetcherOverride?: CloudflareFetcher,
): Promise<GenerateResult> {
  const template = getTemplate(input.templateId);
  if (!template) {
    return { ok: false, error: `Unknown template: ${input.templateId}`, statusCode: 400 };
  }

  const fetcher: CloudflareFetcher = fetcherOverride
    ?? createCloudflareClient(input.apiToken).query;

  try {
    const html = await template.generate(
      {
        zoneId: input.zoneId,
        zoneName: input.zoneName,
        timeRange: input.timeRange,
      },
      fetcher,
    );
    return { ok: true, html };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Report generation failed';
    logger.error('Report generation failed', {
      templateId: input.templateId,
      zoneId: input.zoneId,
    });
    return { ok: false, error: message, statusCode: 500 };
  }
}
