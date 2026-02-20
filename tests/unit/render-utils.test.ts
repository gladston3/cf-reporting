import { describe, it, expect } from 'vitest';

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
} from '@/lib/reports/render-utils';

describe('formatNumber', () => {
  it('formats billions', () => expect(formatNumber(2_500_000_000)).toBe('2.5B'));
  it('formats millions', () => expect(formatNumber(1_916_778)).toBe('1.9M'));
  it('formats thousands', () => expect(formatNumber(54_746)).toBe('54.7K'));
  it('formats small numbers', () => expect(formatNumber(999)).toBe('999'));
  it('formats zero', () => expect(formatNumber(0)).toBe('0'));
});

describe('formatBytes', () => {
  it('formats terabytes', () => expect(formatBytes(2_199_023_255_552)).toBe('2.0 TB'));
  it('formats gigabytes', () => expect(formatBytes(19_474_125_231)).toBe('18.1 GB'));
  it('formats megabytes', () => expect(formatBytes(10_485_760)).toBe('10.0 MB'));
  it('formats kilobytes', () => expect(formatBytes(2048)).toBe('2.0 KB'));
  it('formats bytes', () => expect(formatBytes(512)).toBe('512 B'));
  it('formats zero', () => expect(formatBytes(0)).toBe('0 B'));
});

describe('formatPercent', () => {
  it('formats normal ratio', () => expect(formatPercent(0.456)).toBe('45.6%'));
  it('formats zero', () => expect(formatPercent(0)).toBe('0.0%'));
  it('formats 100%', () => expect(formatPercent(1)).toBe('100.0%'));
  it('handles NaN', () => expect(formatPercent(NaN)).toBe('0.0%'));
  it('handles Infinity', () => expect(formatPercent(Infinity)).toBe('0.0%'));
  it('handles -Infinity', () => expect(formatPercent(-Infinity)).toBe('0.0%'));
});

describe('statusCodeClass', () => {
  it('classifies 200 as 2xx', () => expect(statusCodeClass(200)).toBe('2xx'));
  it('classifies 301 as 3xx', () => expect(statusCodeClass(301)).toBe('3xx'));
  it('classifies 404 as 4xx', () => expect(statusCodeClass(404)).toBe('4xx'));
  it('classifies 503 as 5xx', () => expect(statusCodeClass(503)).toBe('5xx'));
  it('classifies 100 as other', () => expect(statusCodeClass(100)).toBe('other'));
});

describe('statusCodeTagClass', () => {
  it('returns tag-green for 2xx', () => expect(statusCodeTagClass(200)).toBe('tag-green'));
  it('returns tag-blue for 3xx', () => expect(statusCodeTagClass(302)).toBe('tag-blue'));
  it('returns tag-orange for 4xx', () => expect(statusCodeTagClass(429)).toBe('tag-orange'));
  it('returns tag-red for 5xx', () => expect(statusCodeTagClass(500)).toBe('tag-red'));
  it('returns tag-purple for other', () => expect(statusCodeTagClass(101)).toBe('tag-purple'));
});

describe('escapeHtml', () => {
  it('escapes ampersand', () => expect(escapeHtml('a&b')).toBe('a&amp;b'));
  it('escapes less-than', () => expect(escapeHtml('a<b')).toBe('a&lt;b'));
  it('escapes greater-than', () => expect(escapeHtml('a>b')).toBe('a&gt;b'));
  it('escapes double quotes', () => expect(escapeHtml('a"b')).toBe('a&quot;b'));
  it('handles empty string', () => expect(escapeHtml('')).toBe(''));
  it('escapes compound XSS', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
    );
  });
});

describe('safeJsonForScript', () => {
  it('serializes normal data', () => {
    expect(safeJsonForScript(['US', 'DE'])).toBe('["US","DE"]');
  });

  it('escapes </script> sequences', () => {
    const result = safeJsonForScript(['hit</script><script>alert(1)']);
    expect(result).not.toContain('</script>');
    expect(result).toContain('<\\/script>');
  });

  it('escapes nested </style> sequences', () => {
    const result = safeJsonForScript('</style>');
    expect(result).not.toContain('</style>');
  });

  it('handles numbers and objects', () => {
    expect(safeJsonForScript([100, 200])).toBe('[100,200]');
    expect(safeJsonForScript({ key: 'val' })).toBe('{"key":"val"}');
  });
});

describe('formatDateRange', () => {
  it('formats a date range', () => {
    const result = formatDateRange('2026-02-13T00:00:00Z', '2026-02-20T00:00:00Z');
    expect(result).toContain('Feb');
    expect(result).toContain('2026');
    expect(result).toContain('—');
  });
});

describe('formatHour', () => {
  it('formats an ISO timestamp to readable hour', () => {
    const result = formatHour('2026-02-13T09:00:00Z');
    expect(result).toContain('Feb');
    expect(result).toContain('13');
  });
});
