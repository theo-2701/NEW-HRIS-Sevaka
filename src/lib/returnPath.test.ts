import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearReturnPath, isSafeReturnPath, saveReturnPath, takeReturnPath } from '@/lib/returnPath';
import { referenceFor, rememberErrorReference } from '@/lib/errorReference';

describe('returnPath', () => {
  afterEach(() => {
    vi.useRealTimers();
    clearReturnPath();
  });

  it('accepts internal paths only', () => {
    expect(isSafeReturnPath('/employees/directory?q=a')).toBe(true);
    for (const bad of ['//evil.com', 'https://evil.com', '/\\evil', '/auth/login', '/', '/dashboard', '/a\nb', '/javascript:x']) {
      expect(isSafeReturnPath(bad)).toBe(false);
    }
  });

  it('is single use and expires after 15 minutes', () => {
    saveReturnPath('/time/overtime');
    expect(takeReturnPath()).toBe('/time/overtime');
    expect(takeReturnPath()).toBeNull();

    vi.useFakeTimers();
    saveReturnPath('/time/overtime');
    vi.advanceTimersByTime(15 * 60 * 1000 + 1);
    expect(takeReturnPath()).toBeNull();
  });
});

describe('errorReference', () => {
  it('takes the code from the message and generates a trace id', () => {
    const ref = referenceFor('Gagal (EMP-SVC-404).');
    expect(ref?.errorCode).toBe('EMP-SVC-404');
    expect(ref?.traceId).toMatch(/^[0-9a-f]{32}$/);
    expect(referenceFor('Plain message')).toBeUndefined();
  });

  it('prefers a recent API reference, once', () => {
    rememberErrorReference({ errorCode: 'AUTH-SVC-001', traceId: 'abc' });
    expect(referenceFor('x')).toEqual({ errorCode: 'AUTH-SVC-001', traceId: 'abc' });
    expect(referenceFor('x')).toBeUndefined();
  });
});
