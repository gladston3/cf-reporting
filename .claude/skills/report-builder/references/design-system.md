# cf-reporting Design System

Derived from the project's sample reports. All reports use this system.

## CSS Variables

```css
:root {
  /* Backgrounds */
  --bg-deep: #050a14;
  --bg-primary: #0a1628;
  --bg-card: #0d1f3c;
  --bg-card-hover: #112a4a;
  --bg-elevated: #132f52;

  /* Borders */
  --border-subtle: rgba(56, 189, 248, 0.08);
  --border-glow: rgba(56, 189, 248, 0.2);

  /* Text */
  --text-primary: #e2e8f0;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --text-bright: #f8fafc;

  /* Accent colors */
  --accent-blue: #38bdf8;
  --accent-cyan: #22d3ee;
  --accent-red: #f43f5e;
  --accent-orange: #fb923c;
  --accent-yellow: #facc15;
  --accent-green: #4ade80;
  --accent-purple: #a78bfa;
  --accent-pink: #f472b6;

  /* Glow effects */
  --glow-blue: 0 0 30px rgba(56, 189, 248, 0.15);
  --glow-red: 0 0 30px rgba(244, 63, 94, 0.15);

  /* Radii */
  --radius: 12px;
  --radius-sm: 8px;
  --radius-lg: 16px;
}
```

## Fonts

Load from Google Fonts CDN:
- **Outfit**: headings, hero text, large numbers (weight 300-900)
- **DM Sans**: body text, paragraphs (weight 300-700)
- **JetBrains Mono**: code, monospace data, section numbers (weight 400-700)

## Component classes

### Cards
- `.card` — standard content card with subtle border
- `.card-grid-2`, `.card-grid-3`, `.card-grid-4` — responsive grid layouts
- `.card-label` — small uppercase label (var(--text-muted))
- `.card-value` — large number display (Outfit font)

### Alert boxes
- `.alert.critical` — red, for blocking issues
- `.alert.warning` — orange, for cautions
- `.alert.info` — blue, for informational notes

### Tags / badges
- `.tag-red`, `.tag-orange`, `.tag-green`, `.tag-blue`, `.tag-purple`
- Small pill-shaped labels for inline status indicators

### Tables
- `.table-wrap` — scrollable container with border
- Standard `<table>` with hover rows
- `.mono` class for monospace data cells
- `.highlight` class for emphasized values

### Sections
- `.section` — padded content section
- `.section-number` — "Section 01 — Title" style header
- `.section-title` — large heading (Outfit, weight 800)

### Stat strips
- `.stats-strip` — 4-column summary bar (used in hero sections)
- `.stat-value` — large number with color classes (.critical, .warning, .info)
- `.stat-label` — small label below

## Chart.js theme config

```javascript
const chartTheme = {
  color: '#94a3b8',              // text-secondary
  borderColor: 'rgba(56, 189, 248, 0.08)', // border-subtle
  backgroundColor: 'transparent',
  font: { family: "'DM Sans', sans-serif" },
  plugins: {
    legend: {
      labels: { color: '#94a3b8', font: { size: 11 } }
    }
  },
  scales: {
    x: {
      ticks: { color: '#64748b' },
      grid: { color: 'rgba(56, 189, 248, 0.04)' }
    },
    y: {
      ticks: { color: '#64748b' },
      grid: { color: 'rgba(56, 189, 248, 0.04)' }
    }
  }
};
```

## Color usage guidelines

| Purpose              | Color               | Variable           |
|---------------------|---------------------|--------------------|
| Critical / blocked  | Red (#f43f5e)       | --accent-red       |
| Warning / caution   | Orange (#fb923c)    | --accent-orange    |
| Info / neutral      | Blue (#38bdf8)      | --accent-blue      |
| Success / allowed   | Green (#4ade80)     | --accent-green     |
| Bot / automated     | Purple (#a78bfa)    | --accent-purple    |
| Human / organic     | Cyan (#22d3ee)      | --accent-cyan      |
