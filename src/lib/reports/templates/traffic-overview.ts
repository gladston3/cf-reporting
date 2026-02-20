import type { ReportTemplate, ReportConfig, CloudflareFetcher } from '../types';
import type { TrafficQueryResult } from '@/lib/cloudflare/types';
import {
  buildTrafficOverviewQuery,
  parseTrafficData,
  type TrafficOverviewData,
} from '@/lib/cloudflare/queries/traffic-overview';
import {
  formatNumber,
  formatBytes,
  formatPercent,
  statusCodeClass,
  statusCodeTagClass,
  escapeHtml,
  formatDateRange,
  formatHour,
  safeJsonForScript,
} from '../render-utils';

function renderHero(data: TrafficOverviewData, config: ReportConfig): string {
  const zoneName = config.zoneName ?? config.zoneId;
  const dateRange = formatDateRange(config.timeRange.start, config.timeRange.end);

  return `<section class="hero">
  <div class="container" style="text-align:center;padding:6rem 2rem 4rem">
    <div style="font-family:'JetBrains Mono',monospace;font-size:0.75rem;color:var(--accent-blue);letter-spacing:0.08em;text-transform:uppercase;margin-bottom:1.5rem">
      cf-reporting &middot; Traffic Overview
    </div>
    <h1 style="font-family:'Outfit',sans-serif;font-size:clamp(2rem,5vw,3.5rem);font-weight:900;line-height:1.1;background:linear-gradient(135deg,#f8fafc 0%,#38bdf8 50%,#a78bfa 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:1rem">
      Traffic Overview
    </h1>
    <p style="color:var(--text-secondary);font-size:1.1rem;max-width:600px;margin:0 auto 2.5rem">
      ${escapeHtml(zoneName)} &middot; ${escapeHtml(dateRange)}
    </p>
    <div class="card-grid card-grid-4" style="max-width:900px;margin:0 auto">
      <div class="card" style="text-align:center">
        <div class="card-label">Total Requests</div>
        <div class="card-value" style="color:var(--accent-blue)">${formatNumber(data.totalRequests)}</div>
      </div>
      <div class="card" style="text-align:center">
        <div class="card-label">Bandwidth</div>
        <div class="card-value" style="color:var(--accent-cyan)">${formatBytes(data.totalBandwidth)}</div>
      </div>
      <div class="card" style="text-align:center">
        <div class="card-label">Visitors</div>
        <div class="card-value" style="color:var(--accent-green)">${formatNumber(data.totalVisitors)}</div>
      </div>
      <div class="card" style="text-align:center">
        <div class="card-label">Cache Hit</div>
        <div class="card-value" style="color:var(--accent-purple)">${formatPercent(data.cacheHitRatio)}</div>
      </div>
    </div>
  </div>
</section>`;
}

function renderTrafficOverTime(data: TrafficOverviewData): string {
  const labels = safeJsonForScript(data.trafficOverTime.map((h) => formatHour(h.hour)));
  const requests = safeJsonForScript(data.trafficOverTime.map((h) => h.requests));

  return `<section class="section">
  <div class="section-header">
    <div class="section-number">Section 01 &mdash; Traffic Over Time</div>
    <div class="section-title">Request Volume</div>
  </div>
  <div class="chart-container">
    <div class="chart-wrap"><canvas id="trafficChart"></canvas></div>
  </div>
  <script>
  (function(){
    const ctx = document.getElementById('trafficChart');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ${labels},
        datasets: [{
          label: 'Requests',
          data: ${requests},
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56,189,248,0.08)',
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#94a3b8', font: { size: 11 } } }
        },
        scales: {
          x: { ticks: { color: '#64748b', maxTicksLimit: 14 }, grid: { color: 'rgba(56,189,248,0.04)' } },
          y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(56,189,248,0.04)' } }
        }
      }
    });
  })();
  </script>
</section>`;
}

function renderStatusCodes(data: TrafficOverviewData): string {
  const grouped: Record<string, { count: number; bandwidth: number }> = {};
  for (const sc of data.statusCodes) {
    const cls = statusCodeClass(sc.code);
    if (!grouped[cls]) grouped[cls] = { count: 0, bandwidth: 0 };
    grouped[cls].count += sc.count;
    grouped[cls].bandwidth += sc.bandwidth;
  }

  const doughnutLabels = safeJsonForScript(Object.keys(grouped));
  const doughnutData = safeJsonForScript(Object.values(grouped).map((g) => g.count));
  const doughnutColors = safeJsonForScript(
    Object.keys(grouped).map((cls) => {
      if (cls === '2xx') return '#4ade80';
      if (cls === '3xx') return '#38bdf8';
      if (cls === '4xx') return '#fb923c';
      if (cls === '5xx') return '#f43f5e';
      return '#a78bfa';
    }),
  );

  const rows = data.statusCodes
    .map(
      (sc) => `<tr>
      <td><span class="tag ${statusCodeTagClass(sc.code)}">${sc.code}</span></td>
      <td class="mono">${sc.count.toLocaleString('en-US')}</td>
      <td class="mono">${formatBytes(sc.bandwidth)}</td>
      <td class="mono">${formatPercent(sc.count / data.totalRequests)}</td>
    </tr>`,
    )
    .join('\n');

  return `<section class="section">
  <div class="section-header">
    <div class="section-number">Section 02 &mdash; Status Codes</div>
    <div class="section-title">Response Status Breakdown</div>
  </div>
  <div class="card-grid card-grid-2">
    <div class="chart-container">
      <div class="chart-title">By Class</div>
      <div class="chart-wrap" style="max-height:280px;display:flex;justify-content:center">
        <canvas id="statusChart"></canvas>
      </div>
    </div>
    <div class="table-wrap" style="max-height:400px;overflow-y:auto">
      <table>
        <thead><tr><th>Code</th><th>Requests</th><th>Bandwidth</th><th>% Total</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>
  <script>
  (function(){
    const ctx = document.getElementById('statusChart');
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ${doughnutLabels},
        datasets: [{
          data: ${doughnutData},
          backgroundColor: ${doughnutColors},
          borderColor: '#0a1628',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 11 }, padding: 16 } }
        }
      }
    });
  })();
  </script>
</section>`;
}

function renderTopPaths(data: TrafficOverviewData): string {
  const rows = data.topPaths
    .map(
      (p, i) => `<tr>
      <td class="mono">${i + 1}</td>
      <td class="mono">${escapeHtml(p.path)}</td>
      <td class="mono">${p.count.toLocaleString('en-US')}</td>
      <td class="mono">${formatBytes(p.bandwidth)}</td>
      <td class="mono">${formatPercent(p.count / data.totalRequests)}</td>
    </tr>`,
    )
    .join('\n');

  return `<section class="section">
  <div class="section-header">
    <div class="section-number">Section 03 &mdash; Top Paths</div>
    <div class="section-title">Most Requested Paths</div>
  </div>
  <div class="table-wrap">
    <table>
      <thead><tr><th>#</th><th>Path</th><th>Requests</th><th>Bandwidth</th><th>% Total</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
</section>`;
}

function renderTopCountries(data: TrafficOverviewData): string {
  const labels = safeJsonForScript(data.topCountries.map((c) => c.country));
  const counts = safeJsonForScript(data.topCountries.map((c) => c.count));

  const rows = data.topCountries
    .map(
      (c, i) => `<tr>
      <td class="mono">${i + 1}</td>
      <td>${escapeHtml(c.country)}</td>
      <td class="mono">${c.count.toLocaleString('en-US')}</td>
      <td class="mono">${formatBytes(c.bandwidth)}</td>
      <td class="mono">${c.visitors.toLocaleString('en-US')}</td>
    </tr>`,
    )
    .join('\n');

  return `<section class="section">
  <div class="section-header">
    <div class="section-number">Section 04 &mdash; Top Countries</div>
    <div class="section-title">Geographic Distribution</div>
  </div>
  <div class="card-grid card-grid-2">
    <div class="chart-container">
      <div class="chart-title">Requests by Country</div>
      <div class="chart-wrap"><canvas id="countriesChart"></canvas></div>
    </div>
    <div class="table-wrap" style="max-height:400px;overflow-y:auto">
      <table>
        <thead><tr><th>#</th><th>Country</th><th>Requests</th><th>Bandwidth</th><th>Visitors</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>
  <script>
  (function(){
    const ctx = document.getElementById('countriesChart');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ${labels},
        datasets: [{
          label: 'Requests',
          data: ${counts},
          backgroundColor: 'rgba(56,189,248,0.6)',
          borderColor: '#38bdf8',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(56,189,248,0.04)' } },
          y: { ticks: { color: '#94a3b8' }, grid: { display: false } }
        }
      }
    });
  })();
  </script>
</section>`;
}

function renderCachePerformance(data: TrafficOverviewData): string {
  const labels = safeJsonForScript(data.cacheStatuses.map((c) => c.status));
  const counts = safeJsonForScript(data.cacheStatuses.map((c) => c.count));
  const colors = safeJsonForScript(
    data.cacheStatuses.map((c) => {
      switch (c.status.toLowerCase()) {
        case 'hit': return '#4ade80';
        case 'miss': return '#f43f5e';
        case 'dynamic': return '#a78bfa';
        case 'expired': return '#fb923c';
        case 'stale': return '#facc15';
        case 'revalidated': return '#22d3ee';
        default: return '#64748b';
      }
    }),
  );

  const rows = data.cacheStatuses
    .map(
      (c) => `<tr>
      <td class="mono">${escapeHtml(c.status)}</td>
      <td class="mono">${c.count.toLocaleString('en-US')}</td>
      <td class="mono">${formatBytes(c.bandwidth)}</td>
      <td class="mono">${formatPercent(c.count / data.totalRequests)}</td>
    </tr>`,
    )
    .join('\n');

  return `<section class="section">
  <div class="section-header">
    <div class="section-number">Section 05 &mdash; Cache Performance</div>
    <div class="section-title">Edge Cache Efficiency</div>
  </div>
  <div class="card-grid card-grid-2">
    <div class="chart-container">
      <div class="chart-title">Cache Status Distribution</div>
      <div class="chart-wrap" style="max-height:280px;display:flex;justify-content:center">
        <canvas id="cacheChart"></canvas>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Status</th><th>Requests</th><th>Bandwidth</th><th>% Total</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>
  <script>
  (function(){
    const ctx = document.getElementById('cacheChart');
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ${labels},
        datasets: [{
          data: ${counts},
          backgroundColor: ${colors},
          borderColor: '#0a1628',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 11 }, padding: 16 } }
        }
      }
    });
  })();
  </script>
</section>`;
}

function renderNoData(): string {
  return `<section class="section">
  <div class="alert info">No traffic data was recorded for this zone during the selected time range.</div>
</section>`;
}

function renderSections(data: TrafficOverviewData): string {
  return [
    renderTrafficOverTime(data),
    renderStatusCodes(data),
    renderTopPaths(data),
    renderTopCountries(data),
    renderCachePerformance(data),
  ].join('\n');
}

function renderFooter(config: ReportConfig): string {
  const dateRange = formatDateRange(config.timeRange.start, config.timeRange.end);
  const today = new Date().toISOString().split('T')[0];

  return `<footer style="text-align:center;padding:4rem 2rem;color:var(--text-muted);font-size:0.75rem">
  <p>Generated by cf-reporting &middot; ${today} &middot; ${escapeHtml(dateRange)}</p>
  <p style="margin-top:0.5rem">Data source: Cloudflare Analytics API</p>
</footer>`;
}

function renderFullHtml(data: TrafficOverviewData, config: ReportConfig): string {
  const zoneName = config.zoneName ?? config.zoneId;
  const today = new Date().toISOString().split('T')[0];

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="generator" content="cf-reporting">
<meta name="report-date" content="${today}">
<meta name="report-zone" content="${escapeHtml(zoneName)}">
<title>Traffic Overview — ${escapeHtml(zoneName)}</title>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Outfit:wght@300;400;500;600;700;800;900&family=DM+Sans:wght@300;400;500;700&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
<style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
:root{
  --bg-deep:#050a14;--bg-primary:#0a1628;--bg-card:#0d1f3c;
  --bg-card-hover:#112a4a;--bg-elevated:#132f52;
  --border-subtle:rgba(56,189,248,0.08);--border-glow:rgba(56,189,248,0.2);
  --text-primary:#e2e8f0;--text-secondary:#94a3b8;--text-muted:#64748b;--text-bright:#f8fafc;
  --accent-blue:#38bdf8;--accent-cyan:#22d3ee;--accent-red:#f43f5e;
  --accent-orange:#fb923c;--accent-yellow:#facc15;--accent-green:#4ade80;
  --accent-purple:#a78bfa;--accent-pink:#f472b6;
  --glow-blue:0 0 30px rgba(56,189,248,0.15);--glow-red:0 0 30px rgba(244,63,94,0.15);
  --radius:12px;--radius-sm:8px;--radius-lg:16px;
}
html{scroll-behavior:smooth;font-size:16px}
body{background:var(--bg-deep);color:var(--text-primary);font-family:'DM Sans',sans-serif;line-height:1.7;-webkit-font-smoothing:antialiased}
.container{max-width:1200px;margin:0 auto;padding:0 2rem}
.section{padding:5rem 0}
.section-header{margin-bottom:2.5rem}
.section-number{font-family:'JetBrains Mono',monospace;font-size:0.7rem;font-weight:700;color:var(--accent-blue);letter-spacing:0.15em;text-transform:uppercase;display:flex;align-items:center;gap:12px;margin-bottom:0.75rem}
.section-number::before{content:'';width:30px;height:1px;background:var(--accent-blue)}
.section-title{font-family:'Outfit',sans-serif;font-size:clamp(1.8rem,3vw,2.5rem);font-weight:800;letter-spacing:-0.02em;color:var(--text-bright);line-height:1.2}
.card{background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--radius-lg);padding:2rem;transition:all 0.3s}
.card:hover{border-color:var(--border-glow);transform:translateY(-2px);box-shadow:var(--glow-blue)}
.card-grid{display:grid;gap:1.5rem}
.card-grid-2{grid-template-columns:repeat(auto-fit,minmax(340px,1fr))}
.card-grid-3{grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}
.card-grid-4{grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}
.card-label{font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.1em;font-weight:600;margin-bottom:8px}
.card-value{font-family:'Outfit',sans-serif;font-size:2.2rem;font-weight:800;letter-spacing:-0.02em;line-height:1;margin-bottom:8px}
.table-wrap{overflow-x:auto;border-radius:var(--radius);border:1px solid var(--border-subtle);margin:1.5rem 0}
table{width:100%;border-collapse:collapse;font-size:0.85rem}
thead{background:var(--bg-elevated)}
th{padding:12px 16px;text-align:left;font-weight:600;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);border-bottom:1px solid var(--border-subtle);white-space:nowrap}
td{padding:12px 16px;border-bottom:1px solid rgba(56,189,248,0.04);color:var(--text-secondary)}
tr:hover td{background:rgba(56,189,248,0.03)}
.mono{font-family:'JetBrains Mono',monospace;font-size:0.8rem}
.highlight{color:var(--accent-red);font-weight:700}
.tag{display:inline-flex;padding:3px 10px;border-radius:100px;font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em}
.tag-red{background:rgba(244,63,94,0.12);color:var(--accent-red);border:1px solid rgba(244,63,94,0.25)}
.tag-orange{background:rgba(251,146,60,0.12);color:var(--accent-orange);border:1px solid rgba(251,146,60,0.25)}
.tag-green{background:rgba(74,222,128,0.12);color:var(--accent-green);border:1px solid rgba(74,222,128,0.25)}
.tag-blue{background:rgba(56,189,248,0.12);color:var(--accent-blue);border:1px solid rgba(56,189,248,0.25)}
.tag-purple{background:rgba(167,139,250,0.12);color:var(--accent-purple);border:1px solid rgba(167,139,250,0.25)}
.alert{border-radius:var(--radius);padding:1.25rem 1.5rem;margin-bottom:1.5rem;display:flex;gap:14px;border:1px solid;font-size:0.9rem;line-height:1.6}
.alert.info{background:rgba(56,189,248,0.06);border-color:rgba(56,189,248,0.2);color:rgba(56,189,248,0.9)}
.chart-container{position:relative;padding:1.5rem;background:var(--bg-card);border-radius:var(--radius-lg);border:1px solid var(--border-subtle)}
.chart-title{font-family:'Outfit',sans-serif;font-weight:700;font-size:1rem;margin-bottom:1rem;color:var(--text-bright)}
.chart-wrap{position:relative;width:100%;max-height:320px}
@media print{
  body{background:#fff;color:#000}
  .card{border:1px solid #ddd;box-shadow:none}
  .section{padding:2rem 0;page-break-inside:avoid}
}
</style>
</head>
<body>

${renderHero(data, config)}

<div class="container">
${data.totalRequests === 0 ? renderNoData() : renderSections(data)}
</div>

${renderFooter(config)}

</body>
</html>`;
}

async function generate(config: ReportConfig, fetcher: CloudflareFetcher): Promise<string> {
  const { query, variables } = buildTrafficOverviewQuery(config.zoneId, config.timeRange);
  const raw = await fetcher(query, { ...variables }) as TrafficQueryResult;
  const data = parseTrafficData(raw);
  return renderFullHtml(data, config);
}

export const trafficOverviewTemplate: ReportTemplate = {
  id: 'traffic-overview',
  name: 'Traffic Overview',
  description: 'Comprehensive web traffic analytics report with volume, status codes, paths, geography, and cache performance.',
  generate,
};
