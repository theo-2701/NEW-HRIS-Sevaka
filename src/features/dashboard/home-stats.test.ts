import { describe, expect, it } from 'vitest';
import { dashboardService } from '@/features/dashboard/services/dashboard.service';
import { arrangeMyRequests } from '@/features/dashboard/home/myRequestRules';
import { attendanceMeMonthly, attendanceTodayOverview } from '@/features/attendance/services/attendance.service';
import { leaveBalanceMeSummary } from '@/features/time-off/services/balance.service';

describe('Kartu HOME dua lapis (FSD-AUTH 0.7 §2.9)', () => {
  it('#97 ringkasan hari ini hanya cacah; sedang cuti = ON_LEAVE atau SICK', async () => {
    expect(await attendanceTodayOverview('2026-07-20')).toEqual({
      workDate: '2026-07-20',
      presentCount: 0,
      onLeaveCount: 1,
    });
    expect(await attendanceTodayOverview('2026-07-23')).toMatchObject({ onLeaveCount: 1 });
  });

  it('#96 kehadiran bulan berjalan menghitung PRESENT dan LATE milik pemanggil', async () => {
    expect((await attendanceMeMonthly('emp-hendra', '2026-07')).presentDays).toBe(2);
  });

  it('#95 sisa cuti hanya membaca jenis cuti tahunan', async () => {
    expect(await leaveBalanceMeSummary('emp-budi', 2026)).toMatchObject({ leaveCode: 'CUTI-TAHUNAN', balanceDays: 7 });
  });

  it('Pengajuan saya: milik pemanggil saja, yang masih berjalan di atas, maks. 5', async () => {
    const { rows, partial } = await dashboardService.getMyRequests(new Date('2026-10-14T09:00:00+07:00'));
    expect(partial).toBe(false);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThanOrEqual(5);
    const firstDone = rows.findIndex((row) => !row.open);
    if (firstDone >= 0) expect(rows.slice(firstDone).every((row) => !row.open)).toBe(true);
  });

  it('Pengajuan saya: yang final lebih dari 30 hari tidak tampil', () => {
    const base = { title: 'x', detail: 'x', statusLabel: 'x', tone: 'ok' as const, kind: 'LEAVE' as const, to: '/' };
    const rows = arrangeMyRequests(
      [
        { ...base, id: 'old', open: false, submittedAt: '2026-08-01T00:00:00Z' },
        { ...base, id: 'recent', open: false, submittedAt: '2026-10-10T00:00:00Z' },
        { ...base, id: 'running', open: true, submittedAt: '2026-07-01T00:00:00Z' },
      ],
      new Date('2026-10-14T00:00:00Z'),
    );
    expect(rows.map((row) => row.id)).toEqual(['running', 'recent']);
  });

  it('lima nilai kartu dirakit dari modul Time & Employee', async () => {
    const stats = await dashboardService.getHomeStats();
    expect(stats.leaveBalanceDays).toBe(7);
    expect(stats.activeEmployees).toBeGreaterThan(0);
    expect(stats.onLeaveToday).not.toBeNull();
  });
});
