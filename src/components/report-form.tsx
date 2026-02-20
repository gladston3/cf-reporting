'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { useReport } from './report-context';

type TimePreset = '24h' | '7d' | '30d' | 'custom';

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

function toDateInputValue(iso: string): string {
  return iso.slice(0, 10);
}

export function ReportForm() {
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

  const inputClass = `w-full px-4 py-3 bg-card border border-subtle rounded-xl text-text-primary
    placeholder:text-text-muted focus:outline-none focus:border-glow focus:ring-1
    focus:ring-accent-blue/30 transition-all font-dm`;

  const labelClass = 'block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="px-4 py-3 rounded-xl border border-accent-red/25 bg-accent-red/[0.06] text-accent-red text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="apiToken" className={labelClass}>Cloudflare API Token</label>
        <input
          id="apiToken"
          type="password"
          required
          value={apiToken}
          onChange={(e) => setApiToken(e.target.value)}
          placeholder="Your Cloudflare API token"
          className={inputClass}
        />
        <p className="mt-1.5 text-xs text-text-muted">
          Used once to fetch data. Never stored or logged.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="zoneId" className={labelClass}>Zone ID</label>
          <input
            id="zoneId"
            type="text"
            required
            value={zoneId}
            onChange={(e) => setZoneId(e.target.value)}
            placeholder="e.g. abc123def456"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="zoneName" className={labelClass}>Zone Name (optional)</label>
          <input
            id="zoneName"
            type="text"
            value={zoneName}
            onChange={(e) => setZoneName(e.target.value)}
            placeholder="e.g. example.com"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Time Range</label>
        <div className="flex gap-2 mb-3">
          {(['24h', '7d', '30d', 'custom'] as const).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setTimePreset(preset)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all
                ${timePreset === preset
                  ? 'bg-accent-blue/15 border-accent-blue/40 text-accent-blue'
                  : 'bg-card border-subtle text-text-secondary hover:border-glow hover:text-text-bright'
                }`}
            >
              {preset === '24h' ? 'Last 24h'
                : preset === '7d' ? 'Last 7 days'
                : preset === '30d' ? 'Last 30 days'
                : 'Custom'}
            </button>
          ))}
        </div>
        {timePreset === 'custom' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="customStart" className={labelClass}>Start Date</label>
              <input
                id="customStart"
                type="date"
                required
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="customEnd" className={labelClass}>End Date</label>
              <input
                id="customEnd"
                type="date"
                required
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        )}
      </div>

      <div>
        <label className={labelClass}>Report Template</label>
        <div className="px-4 py-3 bg-card border border-subtle rounded-xl text-text-primary flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-accent-blue" />
          <span className="font-medium">Traffic Overview</span>
          <span className="text-xs text-text-muted ml-auto">httpRequestsAdaptiveGroups</span>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className={`w-full py-4 rounded-xl font-outfit font-bold text-lg transition-all
          ${loading
            ? 'bg-accent-blue/30 text-accent-blue/60 cursor-wait'
            : 'bg-accent-blue hover:bg-accent-cyan text-deep hover:shadow-[0_0_30px_rgba(56,189,248,0.25)]'
          }`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-3">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Generating Report...
          </span>
        ) : (
          'Generate Report'
        )}
      </button>
    </form>
  );
}
