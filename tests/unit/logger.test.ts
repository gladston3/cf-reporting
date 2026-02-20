import { describe, it, expect, vi, beforeEach } from 'vitest';

import { logger } from '@/lib/logger';

describe('logger', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('logger.info calls console.info with JSON', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    logger.info('hello');
    expect(spy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.level).toBe('info');
    expect(parsed.message).toBe('hello');
    expect(parsed.timestamp).toBeDefined();
  });

  it('logger.error calls console.error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('fail', { detail: 'oops' });
    expect(spy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.level).toBe('error');
    expect(parsed.message).toBe('fail');
    expect(parsed.detail).toBe('oops');
  });

  it('logger.warn calls console.warn', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logger.warn('caution');
    expect(spy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.level).toBe('warn');
  });

  it('logger.debug calls console.info', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    logger.debug('trace');
    expect(spy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.level).toBe('debug');
  });

  it('includes metadata in output', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    logger.info('request', { method: 'POST', path: '/api/test' });
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.method).toBe('POST');
    expect(parsed.path).toBe('/api/test');
  });
});
