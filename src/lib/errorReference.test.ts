import { describe, expect, it } from 'vitest';
import { referenceFor, rememberErrorReference } from '@/lib/errorReference';

describe('errorReference (LNT-2610141244 T16)', () => {
  it('takes the code from the message and generates a trace id', () => {
    const ref = referenceFor('Failed (EMP-SVC-404).');
    expect(ref?.errorCode).toBe('EMP-SVC-404');
    expect(ref?.traceId).toMatch(/^[0-9a-f]{32}$/);
    expect(referenceFor('Plain message')).toBeUndefined();
  });

  it('prefers a recent API reference, once', () => {
    rememberErrorReference({ errorCode: 'AUT-DEP-326', traceId: 'abc' });
    expect(referenceFor('x')).toEqual({ errorCode: 'AUT-DEP-326', traceId: 'abc' });
    expect(referenceFor('x')).toBeUndefined();
  });
});
