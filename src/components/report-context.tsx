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
