import { describe, it, expect } from 'vitest';

import { AppError, ValidationError, CloudflareApiError } from '@/lib/errors';

describe('AppError', () => {
  it('sets default statusCode to 500', () => {
    const err = new AppError('something broke');
    expect(err.message).toBe('something broke');
    expect(err.statusCode).toBe(500);
    expect(err.code).toBeUndefined();
    expect(err.name).toBe('AppError');
  });

  it('accepts custom statusCode and code', () => {
    const err = new AppError('not found', 404, 'NOT_FOUND');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
  });

  it('is an instance of Error', () => {
    expect(new AppError('test')).toBeInstanceOf(Error);
  });
});

describe('ValidationError', () => {
  it('sets statusCode to 400 and code to VALIDATION_ERROR', () => {
    const err = new ValidationError('bad input');
    expect(err.message).toBe('bad input');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.name).toBe('ValidationError');
  });

  it('is an instance of AppError', () => {
    expect(new ValidationError('test')).toBeInstanceOf(AppError);
  });
});

describe('CloudflareApiError re-export', () => {
  it('is importable from errors.ts', () => {
    expect(CloudflareApiError).toBeDefined();
    const err = new CloudflareApiError('api fail');
    expect(err.name).toBe('CloudflareApiError');
  });
});
