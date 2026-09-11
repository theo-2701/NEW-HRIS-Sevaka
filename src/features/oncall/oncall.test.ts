import { beforeEach, describe, expect, it } from 'vitest';
import { oncallService, resetOncallMocks } from '@/features/oncall/services/oncall.service';
import { oncallActivityService } from '@/features/oncall/services/oncall-activity.service';
import { resetOvertimeMocks } from '@/features/overtime/services/overtime.service';
import { deriveOncall, extraReasonFor, overlapping, windowHours } from '@/features/oncall/rules';
import { ONCALL, VIEWERS } from '@/features/oncall/mock-data';
import { DAILY_HOUR_CAP } from '@/features/overtime/mock-data';
import type { OncallDraft } from '@/features/oncall/types';

const HENDRA = VIEWERS[0];
const SARI = VIEWERS[1];

const draft: OncallDraft = {
  employeeId: 'emp-sari',
  startDate: '2026-09-07',
  startTime: '21:00',
  endDate: '2026-09-08',
  endTime: '06:00',
  maxCalloutHours: '3',
  assignmentNote: 'Standby rilis versi baru.',
};

beforeEach(() => {
  resetOncallMocks();
  resetOvertimeMocks();
});

describe('Aturan murni jendela siaga', () => {
  it('panjang jendela dihitung dari kedua ujungnya', () => {
    expect(windowHours('2026-09-07T21:00:00+07:00', '2026-09-08T06:00:00+07:00')).toBe(9);
    expect(windowHours(null, '2026-09-08T06:00:00+07:00')).toBeNull();
  });

  it('lapis tambahan menyala hanya saat pagu melewati plafon harian', () => {
    expect(extraReasonFor(DAILY_HOUR_CAP)).toBeNull();
    expect(extraReasonFor(DAILY_HOUR_CAP + 0.5)).toBe('MAX_CALLOUT_EXCEEDS_DAILY_CAP');
  });

  it('pratinjau menurunkan ketiga nilainya dari isian form', () => {
    const derived = deriveOncall({ ...draft, maxCalloutHours: '5' });
    expect(derived.hours).toBe(9);
    expect(derived.extraReason).toBe('MAX_CALLOUT_EXCEEDS_DAILY_CAP');
  });

  it('hanya jendela hidup yang dihitung bertindih', () => {
    const clash = overlapping(ONCALL, 'emp-hendra', '2026-07-27T23:00:00+07:00', '2026-07-28T02:00:00+07:00');
    expect(clash?.id).toBe('oncall-1');
    const free = overlapping(ONCALL, 'emp-hendra', '2026-09-01T21:00:00+07:00', '2026-09-02T06:00:00+07:00');
    expect(free).toBeUndefined();
  });
});

describe('Jendela siaga — pembuatan', () => {
  it('menolak jendela yang berakhir sebelum atau saat ia mulai', async () => {
    await expect(
      oncallService.save(HENDRA, { ...draft, endDate: '2026-09-07', endTime: '21:00' }),
    ).rejects.toThrow(/berakhir setelah/);
  });

  it('menolak pagu nol atau negatif', async () => {
    await expect(oncallService.save(HENDRA, { ...draft, maxCalloutHours: '0' })).rejects.toThrow(/422/);
  });

  it('menolak rentang yang bertindih dengan jendela hidup milik orang yang sama', async () => {
    await expect(
      oncallService.save(HENDRA, {
        ...draft,
        employeeId: 'emp-sari',
        startDate: '2026-08-03',
        startTime: '23:00',
        endDate: '2026-08-04',
        endTime: '03:00',
      }),
    ).rejects.toThrow(/409/);
  });

  it('baris baru lahir Pending approval dengan pemicu turunan server', async () => {
    const row = await oncallService.save(HENDRA, { ...draft, maxCalloutHours: '6' });
    expect(row.oncallStatus).toBe('PENDING_APPROVAL');
    expect(row.requiresExtraApprovalReason).toBe('MAX_CALLOUT_EXCEEDS_DAILY_CAP');
    expect(row.approvedBy).toBeNull();
  });

  it('pemicu padam sendiri saat pagunya diturunkan', async () => {
    const row = await oncallService.save(HENDRA, { ...draft, maxCalloutHours: '2' }, 'oncall-3');
    expect(row.requiresExtraApprovalReason).toBeNull();
  });

  it('Ubah hanya sah selagi jendela masih menunggu keputusan', async () => {
    await expect(oncallService.save(HENDRA, draft, 'oncall-4')).rejects.toThrow(/422/);
  });
});

describe('Jendela siaga — keputusan & pembatalan', () => {
  it('pembuat tidak pernah memutuskan jendelanya sendiri', async () => {
    // Seluruh baris seed dibuat emp-hendra, jadi sesi itulah yang ditolak.
    await expect(oncallService.decide(HENDRA, 'oncall-2', 'APPROVED')).rejects.toThrow(/403/);
  });

  it('menyetujui memindahkan status ke Scheduled', async () => {
    const row = await oncallService.decide(SARI, 'oncall-2', 'APPROVED');
    expect(row.oncallStatus).toBe('SCHEDULED');
    expect(row.approvedBy).toBe('emp-sari');
  });

  it('menolak memindahkan status ke Rejected', async () => {
    const row = await oncallService.decide(SARI, 'oncall-3', 'REJECTED');
    expect(row.oncallStatus).toBe('REJECTED');
  });

  it('jendela yang sudah diputuskan tidak bisa diputuskan lagi', async () => {
    await oncallService.decide(SARI, 'oncall-2', 'APPROVED');
    await expect(oncallService.decide(SARI, 'oncall-2', 'REJECTED')).rejects.toThrow(/422/);
  });

  it('jendela yang sudah diputuskan tidak bisa dibatalkan', async () => {
    await expect(oncallService.cancel('oncall-1')).rejects.toThrow(/422/);
  });

  it('membatalkan menyisakan barisnya di catatan', async () => {
    const row = await oncallService.cancel('oncall-4');
    expect(row.oncallStatus).toBe('CANCELLED');
    const rows = await oncallService.list();
    expect(rows.find((item) => item.id === 'oncall-4')).toBeTruthy();
  });

  it('jendela yang dibatalkan membebaskan rentangnya untuk jendela baru', async () => {
    await oncallService.cancel('oncall-2');
    const row = await oncallService.save(HENDRA, {
      ...draft,
      employeeId: 'emp-sari',
      startDate: '2026-08-03',
      startTime: '21:00',
      endDate: '2026-08-04',
      endTime: '06:00',
    });
    expect(row.oncallStatus).toBe('PENDING_APPROVAL');
  });
});

describe('Jendela siaga — filter kontrak pencarian', () => {
  it('menyaring per status', async () => {
    const rows = await oncallService.list({ oncallStatus: 'PENDING_APPROVAL' });
    expect(rows.map((row) => row.id)).toEqual(['oncall-2', 'oncall-3']);
  });

  it('menyaring per rentang tanggal mulai siaga', async () => {
    const rows = await oncallService.list({ from: '2026-08-01', to: '2026-08-12' });
    expect(rows.map((row) => row.id)).toEqual(['oncall-2', 'oncall-3']);
  });

  it('mencari nama karyawan tanpa membedakan huruf besar-kecil', async () => {
    const rows = await oncallService.list({ employeeName: 'rina' });
    expect(rows.map((row) => row.id)).toEqual(['oncall-3']);
  });
});

describe('On Call Activity — bacaan tersaring', () => {
  it('hanya baris lembur otomatis yang terikat jendela siaga yang muncul', async () => {
    const rows = await oncallActivityService.list();
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('ot-2');
    expect(rows[0].isAuto).toBe(true);
    expect(rows[0].oncallAssignmentId).toBe('oncall-1');
  });

  it('sisi permintaan memang kosong; sisi disetujui salinan pagu jendelanya', async () => {
    const [row] = await oncallActivityService.list();
    expect(row.requestedHours).toBeNull();
    expect(row.approvedHours).toBe(4);
    const window = ONCALL.find((item) => item.id === row.oncallAssignmentId)!;
    expect(row.approvedHours).toBe(window.maxCalloutHours);
  });

  it('menyaring per jendela siaga', async () => {
    expect(await oncallActivityService.list({ oncallAssignmentId: 'oncall-1' })).toHaveLength(1);
    expect(await oncallActivityService.list({ oncallAssignmentId: 'oncall-4' })).toHaveLength(0);
  });

  it('menyaring per kategori dan rentang tanggal', async () => {
    expect(await oncallActivityService.list({ overtimeCategory: 'WEEKLY_REST' })).toHaveLength(1);
    expect(await oncallActivityService.list({ overtimeCategory: 'WORKDAY' })).toHaveLength(0);
    expect(await oncallActivityService.list({ from: '2026-07-28' })).toHaveLength(0);
  });
});
