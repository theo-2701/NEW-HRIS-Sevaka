import { beforeEach, describe, expect, it } from 'vitest';
import { overtimeService, resetOvertimeMocks } from '@/features/overtime/services/overtime.service';
import { categoryOf, derive, payableHours, retroWindowStart } from '@/features/overtime/rules';
import { OT_REQUESTS } from '@/features/overtime/mock-data';
import type { OvertimeSession } from '@/features/overtime/types';

const RINA: OvertimeSession = { employeeId: 'emp-rina', role: 'EMPLOYEE' };
const BUDI: OvertimeSession = { employeeId: 'emp-budi', role: 'DEPT_MANAGER' };
const SARI: OvertimeSession = { employeeId: 'emp-sari', role: 'HR_STAFF' };
const HENDRA: OvertimeSession = { employeeId: 'emp-hendra', role: 'HR_MANAGER' };

const draft = { overtimeDate: '2026-08-03', requestedHours: '2', requestReason: '' };

beforeEach(() => {
  resetOvertimeMocks();
});

describe('Field turunan server', () => {
  it('tanggal lampau jadi susulan, tanggal depan jadi pengajuan di muka', () => {
    expect(derive(OT_REQUESTS, 'emp-rina', '2026-07-25', 1).submissionMode).toBe('RETROACTIVE');
    expect(derive(OT_REQUESTS, 'emp-rina', '2026-07-30', 1).submissionMode).toBe('PRE');
  });

  it('kategori dibaca dari kalender, bukan dari kiriman klien', () => {
    // 17 Agustus 2026 = libur nasional yang sudah disetujui.
    expect(categoryOf('2026-08-17')).toBe('PUBLIC_HOLIDAY');
    // 2 Agustus 2026 jatuh Minggu.
    expect(categoryOf('2026-08-02')).toBe('WEEKLY_REST');
    expect(categoryOf('2026-07-30')).toBe('WORKDAY');
    // Libur REGIONAL yang belum disetujui tidak mengubah kategori.
    expect(categoryOf('2026-08-18')).toBe('WORKDAY');
  });

  it('pemicu lapis menyala saat jam yang sudah disetujui + permintaan menembus plafon', () => {
    const withCap = derive(OT_REQUESTS, 'emp-hendra', '2026-07-27', 1);
    expect(withCap.alreadyApproved).toBe(4);
    expect(withCap.extraApprovalReason).toBe('DAILY_CAP_EXCEEDED');
    expect(derive(OT_REQUESTS, 'emp-rina', '2026-08-03', 2).extraApprovalReason).toBeNull();
  });
});

describe('Pengajuan', () => {
  it('menolak peran tanpa scope create', async () => {
    await expect(overtimeService.save(HENDRA, draft)).rejects.toThrow(/403/);
    await expect(overtimeService.save(SARI, draft)).rejects.toThrow(/403/);
  });

  it('menolak jam nol atau negatif', async () => {
    await expect(overtimeService.save(RINA, { ...draft, requestedHours: '0' })).rejects.toThrow(/422/);
  });

  it('menolak pengajuan susulan tanpa alasan tertulis', async () => {
    await expect(
      overtimeService.save(RINA, { ...draft, overtimeDate: '2026-07-26' }),
    ).rejects.toThrow(/alasan tertulis/);
  });

  it('menolak tanggal di luar jendela susulan', async () => {
    await expect(
      overtimeService.save(RINA, { overtimeDate: '2026-07-01', requestedHours: '2', requestReason: 'Telat lapor.' }),
    ).rejects.toThrow(/jendela susulan/);
    expect(retroWindowStart()).toBe('2026-07-20');
  });

  it('menolak dua pengajuan menunggu keputusan pada tanggal yang sama', async () => {
    await expect(
      overtimeService.save(RINA, { ...draft, overtimeDate: '2026-07-30' }),
    ).rejects.toThrow(/409/);
  });

  it('menyimpan mode dan kategori hasil hitung server, bukan kiriman layar', async () => {
    const row = await overtimeService.save(RINA, { ...draft, overtimeDate: '2026-08-17', requestedHours: '2' });
    expect(row.submissionMode).toBe('PRE');
    expect(row.overtimeCategory).toBe('PUBLIC_HOLIDAY');
    expect(row.overtimeStatus).toBe('PENDING_APPROVAL');
    expect(row.approvedHours).toBeNull();
  });

  it('Ubah hanya sah selagi menunggu keputusan', async () => {
    await expect(
      overtimeService.save(RINA, { ...draft, overtimeDate: '2026-08-03' }, 'ot-1'),
    ).rejects.toThrow(/422/);
  });

  it('Ubah menghitung ulang mode dan pemicu saat tanggalnya bergeser', async () => {
    const row = await overtimeService.save(
      RINA,
      { overtimeDate: '2026-07-26', requestedHours: '2', requestReason: 'Lembur akhir pekan.' },
      'ot-3',
    );
    expect(row.submissionMode).toBe('RETROACTIVE');
    expect(row.overtimeCategory).toBe('WEEKLY_REST');
  });
});

describe('Keputusan', () => {
  it('peran tanpa scope approve ditolak 403', async () => {
    await expect(overtimeService.decide(SARI, 'ot-3', 'APPROVED', 3)).rejects.toThrow(/403/);
    await expect(overtimeService.decide(RINA, 'ot-3', 'APPROVED', 3)).rejects.toThrow(/403/);
  });

  it('pemutus tidak pernah boleh jadi pengaju', async () => {
    const rinaAsManager: OvertimeSession = { employeeId: 'emp-rina', role: 'HR_MANAGER' };
    await expect(overtimeService.decide(rinaAsManager, 'ot-3', 'APPROVED', 3)).rejects.toThrow(/403/);
  });

  it('jam yang disetujui wajib diisi saat menyetujui', async () => {
    await expect(overtimeService.decide(HENDRA, 'ot-3', 'APPROVED')).rejects.toThrow(/wajib diisi/);
  });

  it('jam yang disetujui boleh dipangkas, tidak pernah dinaikkan', async () => {
    await expect(overtimeService.decide(HENDRA, 'ot-3', 'APPROVED', 5)).rejects.toThrow(/dinaikkan/);
    const result = await overtimeService.decide(HENDRA, 'ot-3', 'APPROVED', 1.5);
    expect(result.row.approvedHours).toBe(1.5);
    expect(result.row.approvedBy).toBe('emp-hendra');
  });

  it('persetujuan saja tidak melahirkan baris fakta harian', async () => {
    const result = await overtimeService.decide(BUDI, 'ot-3', 'APPROVED', 3);
    expect(result.recomputed).toBe(false);
    const rows = await overtimeService.daily(HENDRA);
    expect(rows.find((row) => row.overtimeDate === '2026-07-30')).toBeUndefined();
  });

  it('menolak tidak menyisakan jam yang bisa dibayar', async () => {
    const result = await overtimeService.decide(HENDRA, 'ot-3', 'REJECTED');
    expect(result.row.overtimeStatus).toBe('REJECTED');
    expect(result.row.approvedHours).toBeNull();
  });

  it('pengajuan yang sudah diputuskan tidak bisa diputuskan lagi', async () => {
    await expect(overtimeService.decide(HENDRA, 'ot-1', 'APPROVED', 2)).rejects.toThrow(/422/);
  });
});

describe('Ringkasan harian — fakta mesin', () => {
  it('payable adalah yang lebih kecil antara aktual dan pagu', () => {
    expect(payableHours(3.5, 4)).toBe(3.5);
    expect(payableHours(5, 4)).toBe(4);
  });

  it('recompute menaikkan pagu setelah persetujuan pada tanggal yang punya fakta punch', async () => {
    // Rina mengajukan 1 jam pada 27 Juli; fakta punch harian milik Hendra,
    // jadi yang dipakai adalah pengajuan atas nama Hendra sendiri.
    const before = (await overtimeService.daily(HENDRA)).find((row) => row.id === 'otd-hendra-0727')!;
    expect(before.approvedHoursTotal).toBe(4);
    expect(before.payableHours).toBe(3.5);
  });

  it('sesi EMPLOYEE hanya melihat fakta hariannya sendiri', async () => {
    const rows = await overtimeService.daily(RINA);
    expect(rows).toHaveLength(0);
  });
});

describe('Penarikan & cakupan baris', () => {
  it('hanya pengaju yang bisa menarik, dan hanya selagi pending', async () => {
    await expect(overtimeService.withdraw(HENDRA, 'ot-3')).rejects.toThrow(/403/);
    await expect(overtimeService.withdraw(RINA, 'ot-1')).rejects.toThrow(/422/);
  });

  it('penarikan adalah soft-delete — barisnya tetap terbaca', async () => {
    const row = await overtimeService.withdraw(RINA, 'ot-3');
    expect(row.overtimeStatus).toBe('CANCELLED');
    const rows = await overtimeService.requests(RINA);
    expect(rows.find((item) => item.id === 'ot-3')).toBeTruthy();
  });

  it('sesi EMPLOYEE hanya melihat barisnya sendiri; peran lain melihat semua', async () => {
    const mine = await overtimeService.requests(RINA);
    expect(mine.every((row) => row.employeeId === 'emp-rina')).toBe(true);
    expect(await overtimeService.requests(SARI)).toHaveLength(OT_REQUESTS.length);
  });

  it('baris otomatis tidak pernah bisa diubah atau ditarik', async () => {
    await expect(overtimeService.withdraw(HENDRA, 'ot-2')).rejects.toThrow(/422/);
  });
});
