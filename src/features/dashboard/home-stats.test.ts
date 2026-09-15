import { describe, expect, it } from 'vitest';
import { dashboardService } from '@/features/dashboard/services/dashboard.service';
import { attendanceMeMonthly, attendanceTodayOverview } from '@/features/attendance/services/attendance.service';
import { leaveBalanceMeSummary } from '@/features/time-off/services/balance.service';

describe('Kartu HOME dua lapis (FSD-AUTH 0.7 §2.9)', () => {
  it('#97 ringkasan hari ini hanya cacah; sedang cuti = ON_LEAVE atau SICK', async () => {
    expect(await attendanceTodayOverview('2026-07-20')).toEqual({ workDate: '2026-07-20', presentCount: 0, onLeaveCount: 1 });
    expect(await attendanceTodayOverview('2026-07-23')).toMatchObject({ onLeaveCount: 1 });
  });

  it('#96 kehadiran bulan berjalan menghitung PRESENT dan LATE milik pemanggil', async () => {
    expect((await attendanceMeMonthly('emp-hendra', '2026-07')).presentDays).toBe(2);
  });

  it('#95 sisa cuti hanya membaca jenis cuti tahunan', async () => {
    expect(await leaveBalanceMeSummary('emp-budi', 2026)).toMatchObject({ leaveCode: 'CUTI-TAHUNAN', balanceDays: 7 });
  });

  it('lima nilai kartu dirakit dari modul Time & Employee', async () => {
    const stats = await dashboardService.getHomeStats();
    expect(stats.leaveBalanceDays).toBe(7);
    expect(stats.activeEmployees).toBeGreaterThan(0);
    expect(stats.onLeaveToday).not.toBeNull();
  });
});
