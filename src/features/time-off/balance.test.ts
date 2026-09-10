import { describe, expect, it } from 'vitest';
import { balanceService } from '@/features/time-off/services/balance.service';
import { VIEWERS } from '@/features/time-off/mock-data';

const HR = VIEWERS[0];

const draft = {
  employeeId: 'emp-rina',
  leaveTypeId: 'lt-annual',
  periodYear: 2026,
  mutationDate: '2026-08-01',
  deltaDays: 2,
  reason: 'Kompensasi lembur akhir pekan.',
};

describe('HR adjustment — validasi', () => {
  it('menolak delta nol', async () => {
    await expect(balanceService.createAdjustment(HR, { ...draft, deltaDays: 0 })).rejects.toThrow(/tidak boleh nol/);
  });

  it('menolak tanpa alasan', async () => {
    await expect(balanceService.createAdjustment(HR, { ...draft, reason: '   ' })).rejects.toThrow(/alasan wajib/i);
  });

  it('menolak tahun hak di luar 2000–2999', async () => {
    await expect(balanceService.createAdjustment(HR, { ...draft, periodYear: 1999 })).rejects.toThrow(/2000/);
  });

  it('menolak field wajib yang kosong', async () => {
    await expect(balanceService.createAdjustment(HR, { ...draft, mutationDate: '' })).rejects.toThrow(/wajib diisi/);
  });
});

describe('HR adjustment — create-only & sumber terkunci', () => {
  it('sumbernya selalu HR_ADJUSTMENT dengan refId kosong', async () => {
    const entry = await balanceService.createAdjustment(HR, draft);
    expect(entry.source).toBe('HR_ADJUSTMENT');
    expect(entry.refId).toBeNull();
    expect(entry.createdBy).toBe(HR.employeeId);
  });

  it('menulis baris baru, tidak mengubah baris lama', async () => {
    const before = await balanceService.ledger({});
    await balanceService.createAdjustment(HR, { ...draft, deltaDays: -1, reason: 'Koreksi kelebihan hak.' });
    const after = await balanceService.ledger({});

    expect(after).toHaveLength(before.length + 1);
    // Setiap baris lama masih persis sama.
    before.forEach((row) => {
      expect(after.find((item) => item.id === row.id)).toEqual(row);
    });
  });
});

describe('Saldo dihitung dari ledger', () => {
  it('saldo berubah sebesar delta yang ditulis', async () => {
    const before = (await balanceService.balances({ employeeId: 'emp-budi', leaveTypeId: 'lt-annual' }))[0];
    await balanceService.createAdjustment(HR, {
      ...draft,
      employeeId: 'emp-budi',
      deltaDays: 3,
      reason: 'Hak tambahan masa kerja.',
    });
    const after = (await balanceService.balances({ employeeId: 'emp-budi', leaveTypeId: 'lt-annual' }))[0];

    expect(after.balanceDays).toBeCloseTo(before.balanceDays + 3, 2);
    expect(after.projectedDays).toBeCloseTo(before.projectedDays + 3, 2);
  });

  it('membuat baris saldo baru bila pasangannya belum ada', async () => {
    await balanceService.createAdjustment(HR, {
      employeeId: 'emp-hendra',
      leaveTypeId: 'lt-sick',
      periodYear: 2026,
      mutationDate: '2026-08-02',
      deltaDays: 4,
      reason: 'Pembukaan saldo sakit.',
    });
    const rows = await balanceService.balances({ employeeId: 'emp-hendra', leaveTypeId: 'lt-sick' });
    expect(rows).toHaveLength(1);
    expect(rows[0].balanceDays).toBe(4);
  });
});

describe('Filter ledger', () => {
  it('menyaring per sumber mutasi', async () => {
    const rows = await balanceService.ledger({ source: 'HR_ADJUSTMENT' });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.source === 'HR_ADJUSTMENT')).toBe(true);
  });

  it('mengurutkan dari mutasi terbaru', async () => {
    const rows = await balanceService.ledger({});
    const dates = rows.map((row) => row.mutationDate);
    expect([...dates].sort().reverse()).toEqual(dates);
  });
});
