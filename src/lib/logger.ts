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
  debug: (message: string, meta?: Record<string, unknown>) =>
    log({ level: 'debug', message, ...meta }),
  info: (message: string, meta?: Record<string, unknown>) =>
    log({ level: 'info', message, ...meta }),
  warn: (message: string, meta?: Record<string, unknown>) =>
    log({ level: 'warn', message, ...meta }),
  error: (message: string, meta?: Record<string, unknown>) =>
    log({ level: 'error', message, ...meta }),
};
