# ADR: MVP API & Frontend

Date: 2026-02-20

## Status: APPROVED

## Context

The Traffic Overview report template is fully implemented and tested (71 tests passing), but there's no way to use it without writing code. The app has no frontend, no API routes, and no working Next.js pages.

This ADR covers the minimum viable product to make the app functional end-to-end: a user opens the web UI, enters their Cloudflare zone ID and API token, selects a time range, clicks "Generate", and sees the rendered Traffic Overview report in their browser.

This is deliberately scoped to avoid database, scheduling, and authentication concerns — those are future ADRs. The MVP is stateless: credentials are used for a single request and never stored.

## Decision

### Architecture Overview

```
Browser (React)
  → POST /api/reports/generate  (Next.js API route)
    → createCloudflareClient(apiToken)
    → trafficOverviewTemplate.generate(config, client.query)
    → Returns HTML string
  → Display HTML in iframe
```

### API Route

**`POST /api/reports/generate`**

Stateless endpoint that accepts credentials + config, generates a report, and returns the HTML.

```typescript
// Request body
interface GenerateReportRequest {
  apiToken: string;      // Cloudflare API token (used once, never stored)
  zoneId: string;        // Cloudflare zone ID
  zoneName?: string;     // Optional human-readable zone name
  templateId: string;    // Report template ID (e.g., 'traffic-overview')
  timeRange: {
    start: string;       // ISO 8601
    end: string;         // ISO 8601
  };
}

// Response: 200 OK
// Content-Type: text/html
// Body: self-contained HTML report string

// Error responses
// 400: { error: string } — validation failure
// 500: { error: string } — Cloudflare API or generation failure
```

**Security considerations for the API route:**
- The API token is accepted in the POST body (not a header or query param) to avoid URL logging
- The token is used for a single Cloudflare API call and immediately discarded — never logged, stored, or included in error messages
- Input validation via Zod: zoneId format, ISO date format, templateId exists
- Rate limiting is deferred to a future ADR (acceptable for MVP)

### Template Registry

A simple registry mapping template IDs to template objects. This avoids hardcoding template selection in the API route and makes it easy to add future templates.

```typescript
// src/lib/reports/registry.ts
import { trafficOverviewTemplate } from './templates/traffic-overview';
import type { ReportTemplate } from './types';

const templates: Map<string, ReportTemplate> = new Map([
  [trafficOverviewTemplate.id, trafficOverviewTemplate],
]);

export function getTemplate(id: string): ReportTemplate | undefined {
  return templates.get(id);
}

export function listTemplates(): ReportTemplate[] {
  return Array.from(templates.values());
}
```

### Frontend Pages

The frontend uses Next.js App Router with three routes:

| Route | Purpose |
|---|---|
| `/` | Landing / generate form page |
| `/report` | Report viewer (receives HTML via state, renders in iframe) |
| `/api/reports/generate` | API route (POST) |

#### Page: `/` (Generate Form)

A single-page form with:
1. **API Token** — password input field
2. **Zone ID** — text input (paste from Cloudflare dashboard)
3. **Zone Name** — optional text input for display in the report header
4. **Time Range** — preset buttons (Last 24h, Last 7 days, Last 30 days) + custom date pickers
5. **Template** — dropdown (only "Traffic Overview" for now, but extensible)
6. **Generate button** — submits to the API route

The form uses React state + fetch. On success, the generated HTML is stored in a React context provider and the app navigates to `/report` using `next/navigation`'s `useRouter().push()` (client-side navigation — no full page reload).

#### Page: `/report` (Report Viewer)

Displays the generated HTML report in a sandboxed iframe. Features:
- Full-width iframe with the report HTML rendered via `srcdoc`
- Toolbar at top with: "Back" button, "Download HTML" button, "Print" button
- The iframe is sandboxed (`sandbox="allow-scripts"`) to allow Chart.js to run but prevent navigation/forms
- **Empty state**: if the user navigates directly to `/report` (no HTML in context — e.g., page refresh), show a message with a link back to `/` to generate a new report

#### State Passing: Report Context

A React context provider holds the generated HTML string in memory, shared across pages via client-side navigation:

```typescript
// src/components/report-context.tsx
'use client';
import { createContext, useContext, useState, type ReactNode } from 'react';

interface ReportContextValue {
  reportHtml: string | null;
  setReportHtml: (html: string | null) => void;
}

const ReportContext = createContext<ReportContextValue>({
  reportHtml: null,
  setReportHtml: () => {},
});

export function ReportProvider({ children }: { children: ReactNode }) {
  const [reportHtml, setReportHtml] = useState<string | null>(null);
  return (
    <ReportContext.Provider value={{ reportHtml, setReportHtml }}>
      {children}
    </ReportContext.Provider>
  );
}

export function useReport() {
  return useContext(ReportContext);
}
```

The `ReportProvider` wraps the app content inside `layout.tsx`. The root layout itself remains a server component — the provider is a client component boundary nested inside it:

```typescript
// src/app/layout.tsx (simplified)
import { ReportProvider } from '@/components/report-context';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ReportProvider>{children}</ReportProvider>
      </body>
    </html>
  );
}
```

On page refresh of `/report`, the context is empty (state is lost). The report viewer handles this gracefully by showing "No report loaded — go back to generate one."

#### Layout

- `src/app/layout.tsx` — server component root layout with dark theme, fonts, Tailwind, wrapping `ReportProvider`
- Uses Tailwind CSS for the app UI (not the reports — reports are self-contained)
- Shares the same design system colors (--bg-deep, --accent-blue, etc.) for visual consistency

### Error Handling & Logging

CLAUDE.md mandates `src/lib/errors.ts` and `src/lib/logger.ts`. These don't exist yet, so this ADR creates them as minimal MVP implementations:

```typescript
// src/lib/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

// Re-export CloudflareApiError for convenience
export { CloudflareApiError } from '@/lib/cloudflare/client';
```

```typescript
// src/lib/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  [key: string]: unknown;
}

function log(entry: LogEntry): void {
  const { level, message, ...meta } = entry;
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.info;
  fn(JSON.stringify({ timestamp: new Date().toISOString(), level, message, ...meta }));
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => log({ level: 'debug', message, ...meta }),
  info: (message: string, meta?: Record<string, unknown>) => log({ level: 'info', message, ...meta }),
  warn: (message: string, meta?: Record<string, unknown>) => log({ level: 'warn', message, ...meta }),
  error: (message: string, meta?: Record<string, unknown>) => log({ level: 'error', message, ...meta }),
};
```

The API route uses these: `ValidationError` for bad input, `logger.error()` for Cloudflare API failures (without logging the token), and `AppError` for structured error responses.

### Tailwind & PostCSS Setup

The project has `tailwindcss` and `postcss` in devDependencies but no config files. These need to be created:

- `tailwind.config.ts` — content paths, extended theme with design system colors
- `postcss.config.mjs` — standard tailwind + autoprefixer
- `src/app/globals.css` — Tailwind directives + CSS custom properties from design system

### Data Flow

```
1. User fills form on / page
2. Form submits POST /api/reports/generate with JSON body
3. API route:
   a. Validates input with Zod
   b. Looks up template by templateId
   c. Creates CloudflareClient with provided apiToken
   d. Calls template.generate(config, client.query)
   e. Returns HTML string (Content-Type: text/html)
4. Frontend receives HTML string
5. Navigates to /report page
6. Report page renders HTML in sandboxed iframe via srcdoc
7. User can download/print the report
```

### No Database Changes

This ADR is stateless. No database tables, no migrations. Credentials are used for a single request and immediately discarded.

## File Changes

### New files

- `tailwind.config.ts` — Tailwind configuration with design system colors
- `postcss.config.mjs` — PostCSS config (tailwind + autoprefixer)
- `src/app/globals.css` — Tailwind directives + design system CSS custom properties
- `src/app/layout.tsx` — Root layout (server component, dark theme, fonts, Tailwind, wraps ReportProvider)
- `src/app/page.tsx` — Home page with report generation form
- `src/app/report/page.tsx` — Report viewer page with iframe + toolbar + empty state
- `src/components/report-form.tsx` — React client component: form for report configuration
- `src/components/report-viewer.tsx` — React client component: renders HTML in sandboxed iframe
- `src/components/report-context.tsx` — React context provider for passing generated HTML between pages
- `src/lib/reports/registry.ts` — Template registry (map of id → template)
- `src/lib/reports/generate.ts` — Report generation logic: Zod validation, template lookup, and handleGenerate orchestrator (extracted from route for testability)
- `src/lib/errors.ts` — Typed error classes (AppError base, ValidationError, CloudflareApiError re-export)
- `src/lib/logger.ts` — Structured logger (thin wrapper; console-based for MVP, replaceable later)
- `src/app/api/reports/generate/route.ts` — Thin POST handler delegating to generate.ts
- `tests/unit/report-registry.test.ts` — Tests for template registry
- `tests/unit/generate-api.test.ts` — Tests for API route validation logic

### Modified files

- `package.json` — add any missing Tailwind/PostCSS peer deps if needed

## Alternatives Considered

### 1. Server-side rendering the report directly (no iframe)

**Rejected.** The report HTML is self-contained with its own `<html>`, `<head>`, and `<style>` tags. Embedding it directly in a Next.js page would cause conflicts (duplicate `<html>`, competing stylesheets). A sandboxed iframe provides clean isolation.

### 2. Store reports in the database before viewing

**Rejected for MVP.** Adds database dependency, migration complexity, and cleanup logic. The stateless approach is simpler — generate and return. Persistence will come in a future ADR with the scheduling feature.

### 3. Use Server Actions instead of API routes

**Rejected.** Server Actions are tightly coupled to React components and harder to test independently. A standard API route is easier to test with curl, reuse from other clients, and reason about.

### 4. Use URL blob for passing HTML between pages

**Considered but rejected.** `URL.createObjectURL(new Blob([html]))` could pass large HTML strings via URL, but blob URLs have lifecycle issues and don't survive page refresh. React context with client-side navigation is simpler and more reliable.

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| API token exposed in network tab | Security — token visible in browser DevTools POST body | Acceptable for MVP (user's own browser, their own token). Future ADR will add stored encrypted connections. |
| Large report HTML in memory | Performance — reports can be 100-200KB | Acceptable at this scale. Future optimization: streaming response. |
| No rate limiting on /api/reports/generate | Abuse — anyone can trigger unlimited CF API calls | MVP is intended for local/personal use. Rate limiting in a future ADR. |
| Iframe sandbox blocks some Chart.js features | Charts might not render | `allow-scripts` sandbox attribute permits JS execution. Tested with Chart.js 4.x. |
| Missing Tailwind config causes build failure | Docker build breaks | Tailwind setup is included in this ADR's file changes. |
| Page refresh on /report loses generated HTML | UX — user sees empty state | Show clear "No report loaded" message with link back to / to regenerate. |
| Validation errors not shown to user | UX — silent failure on bad input | Form component displays API 400 error messages inline above the submit button. |
