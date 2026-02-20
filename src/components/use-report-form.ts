'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { useReport } from './report-context';

export type TimePreset = '24h' | '7d' | '30d' | 'custom';

function getPresetRange(preset: TimePreset): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  switch (preset) {
    case '24h':
      start.setHours(start.getHours() - 24);
      break;
    case '7d':
      start.setDate(start.getDate() - 7);
      break;
    case '30d':
      start.setDate(start.getDate() - 30);
      break;
    default:
      start.setDate(start.getDate() - 7);
  }
  return { start: start.toISOString(), end: end.toISOString() };
}

export function useReportForm() {
  const router = useRouter();
  const { setReportHtml } = useReport();

  const [apiToken, setApiToken] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [zoneName, setZoneName] = useState('');
  const [templateId] = useState('traffic-overview');
  const [timePreset, setTimePreset] = useState<TimePreset>('7d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const timeRange = timePreset === 'custom'
      ? { start: new Date(customStart).toISOString(), end: new Date(customEnd).toISOString() }
      : getPresetRange(timePreset);

    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiToken,
          zoneId,
          zoneName: zoneName || undefined,
          templateId,
          timeRange,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      const html = await res.text();
      setReportHtml(html);
      router.push('/report');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  return {
    apiToken, setApiToken,
    zoneId, setZoneId,
    zoneName, setZoneName,
    templateId,
    timePreset, setTimePreset,
    customStart, setCustomStart,
    customEnd, setCustomEnd,
    loading,
    error,
    handleSubmit,
  };
}
