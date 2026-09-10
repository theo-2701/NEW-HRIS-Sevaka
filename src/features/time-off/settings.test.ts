import { describe, expect, it } from 'vitest';
import { settingsService } from '@/features/time-off/services/settings.service';

const baseType = {
  code: 'CUTI-BESAR',
  name: 'Cuti Besar',
  isPaid: true,
  affectsBalance: true,
  requiresDocument: false,
  requiresApproval: true,
  allowsExtraApproval: false,
  isActive: true,
  minAdvanceDays: 3,
};

const basePolicy = {
  leaveTypeId: 'lt-annual',
  employmentType: 'Tetap',
  isEligible: true,
  ratePerMonth: 1,
  maxBalanceDays: 24,
  carryOverPolicy: 'FORFEIT' as const,
  carryOverMaxDays: null,
  carryOverExpiry: null,
  effectiveFrom: '2030-01-01',
};

const baseBlackout = {
  name: 'Tutup buku kuartal',
  reason: 'Beban closing keuangan.',
  startDate: '2028-03-01',
  endDate: '2028-03-05',
  mode: 'SOFT' as const,
  scopeRef: null,
};

describe('Leave type — validasi katalog', () => {
  it('menolak kode di luar pola', async () => {
    await expect(settingsService.saveLeaveType({ ...baseType, code: 'cuti besar' })).rejects.toThrow(/422.*kode/i);
  });

  it('menolak kombinasi tidak dibayar + memotong saldo', async () => {
    await expect(
      settingsService.saveLeaveType({ ...baseType, code: 'CUTI-X', isPaid: false, affectsBalance: true }),
    ).rejects.toThrow(/tercharge dua kali/);
  });

  it('menolak kode yang sudah dipakai baris aktif', async () => {
    await expect(settingsService.saveLeaveType({ ...baseType, code: 'CUTI-TAHUNAN' })).rejects.toThrow(/409/);
  });

  it('menyimpan jenis baru sebagai non-statutory', async () => {
    const row = await settingsService.saveLeaveType(baseType);
    expect(row.isStatutory).toBe(false);
    expect(row.code).toBe('CUTI-BESAR');
  });
});

describe('Leave type — perlindungan statutory', () => {
  it('menolak perubahan kode pada jenis statutory', async () => {
    const types = await settingsService.leaveTypes();
    const statutory = types.find((row) => row.isStatutory)!;
    await expect(
      settingsService.saveLeaveType({ ...baseType, code: 'BARU-SAJA' }, statutory.id),
    ).rejects.toThrow(/statutory tidak bisa diubah/);
  });

  it('menolak penghapusan jenis statutory', async () => {
    const types = await settingsService.leaveTypes();
    const statutory = types.find((row) => row.isStatutory)!;
    await expect(settingsService.deleteLeaveType(statutory.id)).rejects.toThrow(/422/);
  });

  it('flag lain pada jenis statutory tetap bisa diubah', async () => {
    const types = await settingsService.leaveTypes();
    const statutory = types.find((row) => row.id === 'lt-annual')!;
    const updated = await settingsService.saveLeaveType(
      {
        code: statutory.code,
        name: statutory.name,
        isPaid: statutory.isPaid,
        affectsBalance: statutory.affectsBalance,
        requiresDocument: statutory.requiresDocument,
        requiresApproval: statutory.requiresApproval,
        allowsExtraApproval: true,
        isActive: statutory.isActive,
        minAdvanceDays: 5,
      },
      statutory.id,
    );
    expect(updated.minAdvanceDays).toBe(5);
    expect(updated.isStatutory).toBe(true);
  });
});

describe('Accrual policy — aturan kontrak', () => {
  it('menolak rate terisi saat tidak entitled', async () => {
    await expect(
      settingsService.createAccrualPolicy({ ...basePolicy, isEligible: false, ratePerMonth: 1 }),
    ).rejects.toThrow(/rate harus kosong/);
  });

  it('menolak carry capped tanpa jumlah hari dan kedaluwarsa', async () => {
    await expect(
      settingsService.createAccrualPolicy({ ...basePolicy, carryOverPolicy: 'CARRY_CAPPED' }),
    ).rejects.toThrow(/carry capped butuh/);
  });

  it('menolak field carry-over terisi di luar carry capped', async () => {
    await expect(
      settingsService.createAccrualPolicy({ ...basePolicy, carryOverMaxDays: 6 }),
    ).rejects.toThrow(/harus kosong kecuali/);
  });

  it('menolak rentang yang bertindih pada pasangan yang sama', async () => {
    await expect(
      settingsService.createAccrualPolicy({ ...basePolicy, effectiveFrom: '2026-06-01' }),
    ).rejects.toThrow(/409/);
  });

  it('kebijakan terbuka menutup seluruh rentang sesudahnya', async () => {
    // policy-annual-tetap berlaku sejak 2026 tanpa tanggal akhir, jadi rentang
    // kapan pun sesudahnya dianggap bertindih sampai ia dihentikan.
    await expect(settingsService.createAccrualPolicy(basePolicy)).rejects.toThrow(/409/);
  });

  it('menerima kebijakan baru setelah yang berjalan dihentikan', async () => {
    const policies = await settingsService.accrualPolicies();
    const running = policies.find((row) => row.leaveTypeId === 'lt-annual' && row.effectiveUntil === null)!;
    await settingsService.endAccrualPolicy(running.id, '2029-12-31');

    const row = await settingsService.createAccrualPolicy(basePolicy);
    expect(row.effectiveUntil).toBeNull();
    expect(row.effectiveFrom).toBe('2030-01-01');
  });
});

describe('Accrual policy — hanya berhenti lewat tanggal akhir', () => {
  it('menolak tanggal akhir sebelum tanggal mulai', async () => {
    const policies = await settingsService.accrualPolicies();
    const running = policies.find((row) => row.effectiveUntil === null)!;
    await expect(settingsService.endAccrualPolicy(running.id, '2000-01-01')).rejects.toThrow(/mendahului/);
  });

  it('mengisi tanggal akhir menghentikan kebijakan', async () => {
    const policies = await settingsService.accrualPolicies();
    const running = policies.find((row) => row.effectiveUntil === null)!;
    await settingsService.endAccrualPolicy(running.id, '2031-12-31');
    const after = await settingsService.accrualPolicies();
    expect(after.find((row) => row.id === running.id)!.effectiveUntil).toBe('2031-12-31');
  });

  it('kebijakan yang sudah berakhir tidak lagi menghalangi rentang sesudahnya', async () => {
    const row = await settingsService.createAccrualPolicy({ ...basePolicy, effectiveFrom: '2032-01-01' });
    expect(row.effectiveFrom).toBe('2032-01-01');
  });
});

describe('Blackout period', () => {
  it('menolak tanpa tanggal akhir', async () => {
    await expect(settingsService.saveBlackout({ ...baseBlackout, endDate: '' })).rejects.toThrow(/wajib diisi/);
  });

  it('menolak tanggal akhir sebelum tanggal mulai', async () => {
    await expect(
      settingsService.saveBlackout({ ...baseBlackout, endDate: '2028-02-01' }),
    ).rejects.toThrow(/mendahului/);
  });

  it('menolak alasan lebih pendek dari 5 karakter', async () => {
    await expect(settingsService.saveBlackout({ ...baseBlackout, reason: 'abc' })).rejects.toThrow(/5–300/);
  });

  it('menyimpan periode yang sah', async () => {
    const row = await settingsService.saveBlackout(baseBlackout);
    expect(row.mode).toBe('SOFT');
    expect(row.endDate).toBe('2028-03-05');
  });
});
