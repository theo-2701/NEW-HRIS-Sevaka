import { describe, expect, it } from 'vitest';
import { dashboardService } from '@/features/dashboard/services/dashboard.service';
import { MY_REQUESTS_PANEL_LIMIT, arrangeMyRequests } from '@/features/dashboard/home/myRequestRules';
import { ACTION_QUEUE_PANEL_LIMIT, arrangeQueue } from '@/features/dashboard/home/queueRules';
import { ListChecks } from 'lucide-react';
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

  it('Pengajuan saya: 10 data → daftar lengkap 10, panel memotong ke batasnya', () => {
    const now = new Date('2026-10-14T00:00:00Z');
    const ten = Array.from({ length: 10 }, (_, i) => ({
      id: `r${i}`,
      kind: 'LEAVE' as const,
      title: 'x',
      detail: 'x',
      statusLabel: 'x',
      tone: 'warn' as const,
      open: true,
      submittedAt: `2026-10-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
      to: '/',
    }));
    expect(arrangeMyRequests(ten, now)).toHaveLength(10);
    expect(arrangeMyRequests(ten, now, MY_REQUESTS_PANEL_LIMIT).map((row) => row.id)).toEqual([
      'r9',
      'r8',
      'r7',
      'r6',
      'r5',
    ]);
  });

  it('Pengajuan saya: milik pemanggil saja, yang masih berjalan di atas', async () => {
    const { rows, partial } = await dashboardService.getMyRequests(new Date('2026-10-14T09:00:00+07:00'));
    expect(partial).toBe(false);
    expect(rows.length).toBeGreaterThan(0);
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
    expect(arrangeMyRequests(rows, new Date('2026-10-14T00:00:00Z'), 1).map((row) => row.id)).toEqual(['running']);
  });

  it('Perlu tindak lanjut: jenis 0 dibuang, keputusan dulu lalu tugas, angka terbesar dulu', () => {
    const row = (key: string, group: 'decide' | 'mine', count: number | null) =>
      ({ key, group, count, title: key, detail: '', icon: ListChecks }) as const;
    const keys = arrangeQueue([
      row('tugas-3', 'mine', 3),
      row('nol', 'decide', 0),
      row('putus-1', 'decide', 1),
      row('memuat', 'decide', null),
      row('putus-5', 'decide', 5),
    ]).map((item) => item.key);
    expect(keys).toEqual(['putus-5', 'putus-1', 'memuat', 'tugas-3']);
    expect(ACTION_QUEUE_PANEL_LIMIT).toBe(6);
  });

  it('lima nilai kartu dirakit dari modul Time & Employee', async () => {
    const stats = await dashboardService.getHomeStats();
    expect(stats.leaveBalanceDays).toBe(7);
    expect(stats.activeEmployees).toBeGreaterThan(0);
    expect(stats.onLeaveToday).not.toBeNull();
  });
});
