'use client';

import { useReportForm, type TimePreset } from './use-report-form';

const INPUT_CLASS = `w-full px-4 py-3 bg-card border border-subtle rounded-xl text-text-primary
  placeholder:text-text-muted focus:outline-none focus:border-glow focus:ring-1
  focus:ring-accent-blue/30 transition-all font-dm`;

const LABEL_CLASS = 'block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2';

const TIME_PRESETS: { value: TimePreset; label: string }[] = [
  { value: '24h', label: 'Last 24h' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'custom', label: 'Custom' },
];

function TimePresetButton(
  { preset, active, onClick }: { preset: typeof TIME_PRESETS[number]; active: boolean; onClick: () => void },
) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all
        ${active
          ? 'bg-accent-blue/15 border-accent-blue/40 text-accent-blue'
          : 'bg-card border-subtle text-text-secondary hover:border-glow hover:text-text-bright'
        }`}
    >
      {preset.label}
    </button>
  );
}

function SubmitButton({ loading }: { loading: boolean }) {
  return (
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
  );
}

export function ReportForm() {
  const form = useReportForm();

  return (
    <form onSubmit={form.handleSubmit} className="space-y-6">
      {form.error && (
        <div className="px-4 py-3 rounded-xl border border-accent-red/25 bg-accent-red/[0.06] text-accent-red text-sm">
          {form.error}
        </div>
      )}

      <div>
        <label htmlFor="apiToken" className={LABEL_CLASS}>Cloudflare API Token</label>
        <input
          id="apiToken"
          type="password"
          required
          value={form.apiToken}
          onChange={(e) => form.setApiToken(e.target.value)}
          placeholder="Your Cloudflare API token"
          className={INPUT_CLASS}
        />
        <p className="mt-1.5 text-xs text-text-muted">
          Used once to fetch data. Never stored or logged.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="zoneId" className={LABEL_CLASS}>Zone ID</label>
          <input
            id="zoneId"
            type="text"
            required
            value={form.zoneId}
            onChange={(e) => form.setZoneId(e.target.value)}
            placeholder="e.g. abc123def456"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="zoneName" className={LABEL_CLASS}>Zone Name (optional)</label>
          <input
            id="zoneName"
            type="text"
            value={form.zoneName}
            onChange={(e) => form.setZoneName(e.target.value)}
            placeholder="e.g. example.com"
            className={INPUT_CLASS}
          />
        </div>
      </div>

      <div>
        <label className={LABEL_CLASS}>Time Range</label>
        <div className="flex gap-2 mb-3">
          {TIME_PRESETS.map((preset) => (
            <TimePresetButton
              key={preset.value}
              preset={preset}
              active={form.timePreset === preset.value}
              onClick={() => form.setTimePreset(preset.value)}
            />
          ))}
        </div>
        {form.timePreset === 'custom' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="customStart" className={LABEL_CLASS}>Start Date</label>
              <input
                id="customStart"
                type="date"
                required
                value={form.customStart}
                onChange={(e) => form.setCustomStart(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label htmlFor="customEnd" className={LABEL_CLASS}>End Date</label>
              <input
                id="customEnd"
                type="date"
                required
                value={form.customEnd}
                onChange={(e) => form.setCustomEnd(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </div>
        )}
      </div>

      <div>
        <label className={LABEL_CLASS}>Report Template</label>
        <div className="px-4 py-3 bg-card border border-subtle rounded-xl text-text-primary flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-accent-blue" />
          <span className="font-medium">Traffic Overview</span>
          <span className="text-xs text-text-muted ml-auto">httpRequestsAdaptiveGroups</span>
        </div>
      </div>

      <SubmitButton loading={form.loading} />
    </form>
  );
}
