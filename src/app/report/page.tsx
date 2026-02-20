'use client';

import Link from 'next/link';

import { useReport } from '@/components/report-context';
import { ReportViewer } from '@/components/report-viewer';

export default function ReportPage() {
  const { reportHtml } = useReport();

  if (!reportHtml) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <div className="font-mono text-xs text-accent-blue tracking-[0.15em] uppercase mb-4">
            cf-reporting
          </div>
          <h1 className="font-outfit text-2xl font-bold text-text-bright mb-3">
            No report loaded
          </h1>
          <p className="text-text-secondary mb-6 max-w-sm mx-auto">
            Generate a report first, or this page lost its data after a refresh.
          </p>
          <Link
            href="/"
            className="inline-flex px-6 py-3 bg-accent-blue hover:bg-accent-cyan text-deep
                       font-semibold rounded-xl transition-all
                       hover:shadow-[0_0_30px_rgba(56,189,248,0.25)]"
          >
            &larr; Generate a Report
          </Link>
        </div>
      </div>
    );
  }

  return <ReportViewer html={reportHtml} />;
}
