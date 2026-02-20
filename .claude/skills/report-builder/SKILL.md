---
name: report-builder
description: >
  Report HTML template design and generation patterns. Use when creating
  new report templates, modifying report styling, or debugging report
  rendering. Contains the design system, component patterns, and template
  conventions. Triggers: "new report template", "report design", "report
  styling", "add chart to report", "report layout".
allowed-tools: "Read,Write,Edit,Glob,Grep"
---

# Report Template Builder

You are building HTML report templates for cf-reporting. Reports must be
beautiful, self-contained HTML files that work standalone (no external
dependencies except CDN-hosted Chart.js).

## Design system

Read the supporting files in this skill's directory:
- [Design System](references/design-system.md) — full CSS variable reference, color palette, component classes
- [Base Template](assets/base-template.html) — HTML skeleton that every report extends

## Report template module structure

Every report template lives in `src/lib/reports/templates/` and exports:

```typescript
// src/lib/reports/templates/{report-name}.ts

export interface ReportConfig {
  title: string;
  subtitle?: string;
  timeRange: TimeRange;
  zoneId?: string;      // for web reports
  accountId?: string;    // for Zero Trust reports
}

export interface ReportData {
  // Typed data shape specific to this report
}

export async function fetchData(
  config: ReportConfig,
  cfClient: CloudflareClient
): Promise<ReportData> {
  // Fetch all needed data from Cloudflare APIs
}

export function renderHtml(
  config: ReportConfig,
  data: ReportData
): string {
  // Return complete, self-contained HTML string
}
```

## Chart patterns

Use Chart.js for all charts. Charts are rendered:
- **Server-side** (for PDF/HTML reports): via `chartjs-node-canvas`
- **Client-side** (for dashboard previews): via `<canvas>` + inline script

For HTML reports, embed charts as inline `<script>` blocks that initialize
Chart.js on `<canvas>` elements. The base template already includes
Chart.js from CDN.

Common chart types for reports:
- **Doughnut**: response code distribution, cache ratio, bot vs human
- **Bar (horizontal)**: top attacking IPs, top blocked domains, top users
- **Line (time series)**: requests over time, firewall events over time
- **Stacked bar**: traffic by country over time, events by action over time

## HTML report rules

1. Every report is ONE self-contained HTML file (inline CSS + JS)
2. Dark theme by default (matches design system)
3. Must include: hero section, executive summary, data sections, footer
4. All data tables must be responsive (horizontal scroll wrapper)
5. No external image dependencies — use CSS/SVG for decorations
6. Include `<meta>` tags for title, date, zone info
7. Print-friendly: include `@media print` styles
