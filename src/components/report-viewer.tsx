'use client';

import { useRef, useCallback } from 'react';
import Link from 'next/link';

interface ReportViewerProps {
  html: string;
}

export function ReportViewer({ html }: ReportViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleDownload = useCallback(() => {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'report.html';
    a.click();
    URL.revokeObjectURL(url);
  }, [html]);

  const handlePrint = useCallback(() => {
    iframeRef.current?.contentWindow?.print();
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center gap-3 px-6 py-3 bg-primary border-b border-subtle">
        <Link
          href="/"
          className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-bright
                     bg-card hover:bg-card-hover border border-subtle hover:border-glow
                     rounded-lg transition-all"
        >
          &larr; Back
        </Link>
        <div className="flex-1" />
        <button
          onClick={handleDownload}
          className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-bright
                     bg-card hover:bg-card-hover border border-subtle hover:border-glow
                     rounded-lg transition-all"
        >
          Download HTML
        </button>
        <button
          onClick={handlePrint}
          className="px-4 py-2 text-sm font-medium text-deep
                     bg-accent-blue hover:bg-accent-cyan
                     rounded-lg transition-all font-semibold"
        >
          Print
        </button>
      </div>
      <iframe
        ref={iframeRef}
        srcDoc={html}
        sandbox="allow-scripts"
        title="Generated Report"
        className="flex-1 w-full border-none bg-deep"
      />
    </div>
  );
}
