import { describe, expect, it } from 'vitest';
import { DEMO_TRACE, UNAVAILABLE_TRACE, systemLogService } from '@/features/system-log/services/system-log.service';
import { DAY, HOUR, errorCodeProblem } from '@/features/system-log/types';

describe('System Log (TSD-AUTH §14.6)', () => {
  it('Trace ID: hanya Super Admin, format 16/32 heksa, waktu naik', async () => {
    await expect(systemLogService.searchTrace('SUPER_ADMIN', '')).rejects.toMatchObject({ status: 422, code: 'AUT-VAL-318' });
    await expect(systemLogService.searchTrace('SUPER_ADMIN', 'xyz')).rejects.toMatchObject({ code: 'AUT-VAL-319' });
    await expect(systemLogService.searchTrace('HR_MANAGER', DEMO_TRACE)).rejects.toMatchObject({ status: 403 });
    await expect(systemLogService.searchTrace('SUPER_ADMIN', UNAVAILABLE_TRACE)).rejects.toMatchObject({ status: 503 });
    const result = await systemLogService.searchTrace('SUPER_ADMIN', DEMO_TRACE.toUpperCase());
    expect(result.rows.length).toBeGreaterThan(1);
    const times = result.rows.map((row) => row.occurredAt);
    expect([...times].sort()).toEqual(times);
  });

  it('Error Code: rentang ≤ 24 jam, ≤ 7 hari lalu, terbaru di atas', async () => {
    const now = new Date();
    expect(errorCodeProblem('EMP-DEP-725', new Date(now.getTime() - 2 * DAY), now)).toMatch(/24 hours/);
    expect(errorCodeProblem('EMP-DEP-725', new Date(now.getTime() - 8 * DAY), new Date(now.getTime() - 7.5 * DAY))).toMatch(/7 days/);
    expect(errorCodeProblem('EMP725', new Date(now.getTime() - HOUR), now)).toMatch(/ABC-DEF-123/);
    const result = await systemLogService.searchErrorCode('SUPER_ADMIN', 'emp-dep-725', new Date(now.getTime() - HOUR), now);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].occurredAt > result.rows[1].occurredAt).toBe(true);
  });
});
