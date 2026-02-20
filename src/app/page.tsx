import { ReportForm } from '@/components/report-form';

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-xl">
        <div className="text-center mb-10">
          <div className="font-mono text-xs text-accent-blue tracking-[0.15em] uppercase mb-4">
            cf-reporting
          </div>
          <h1 className="font-outfit text-4xl sm:text-5xl font-black tracking-tight text-text-bright leading-tight">
            Generate a<br />
            <span className="bg-gradient-to-r from-accent-blue to-accent-purple bg-clip-text text-transparent">
              Traffic Report
            </span>
          </h1>
          <p className="mt-4 text-text-secondary text-base max-w-md mx-auto leading-relaxed">
            Enter your Cloudflare zone details below to generate a comprehensive traffic analytics report.
          </p>
        </div>

        <div className="bg-primary/60 backdrop-blur border border-subtle rounded-2xl p-8">
          <ReportForm />
        </div>

        <p className="text-center text-xs text-text-muted mt-8">
          Your API token is used once and never stored.
          <br />
          Reports are generated server-side and displayed in your browser.
        </p>
      </div>
    </div>
  );
}
