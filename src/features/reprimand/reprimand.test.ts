import { describe, expect, it } from 'vitest';
import { categorySchema, reprimandSchema } from '@/features/reprimand/validation';
import { reprimandService } from '@/features/reprimand/services/reprimand.service';
import { CURRENT_USER, deriveLevel } from '@/features/reprimand/types';

const valid = {
  employeeId: 'emp-eka',
  categoryCode: 'SP1',
  issuedDate: '2026-01-05',
  reason: 'Tiga kali terlambat menyerahkan laporan.',
  documentName: '',
};

describe('RP-CREATE — validasi', () => {
  it('menolak tanggal terbit di masa depan', async () => {
    await expect(
      reprimandSchema.validateAt('issuedDate', { ...valid, issuedDate: '2099-01-01' }),
    ).rejects.toThrow(/masa depan/);
  });

  it('mewajibkan alasan maksimal 150 karakter', async () => {
    await expect(reprimandSchema.validateAt('reason', { ...valid, reason: '   ' })).rejects.toThrow(/Alasan wajib/);
    await expect(
      reprimandSchema.validateAt('reason', { ...valid, reason: 'x'.repeat(151) }),
    ).rejects.toThrow(/150 karakter/);
  });

  it('skema tidak memuat field snapshot milik server', () => {
    const fields = Object.keys(reprimandSchema.fields);
    expect(fields).not.toContain('point');
    expect(fields).not.toContain('validityMonths');
    expect(fields).not.toContain('levelOrder');
    expect(fields).not.toContain('terminal');
  });
});

describe('RP-CREATE — snapshot & SoD', () => {
  it('membekukan snapshot dari master dan menghitung kedaluwarsa', async () => {
    const row = await reprimandService.create({ ...valid, employeeId: 'emp-nadia', issuedDate: '2026-01-05' });
    expect(row.status).toBe('IN_APPROVAL');
    expect(row.snapshot).toMatchObject({ code: 'SP1', point: 1, validityMonths: 6, levelOrder: 1, terminal: false });
    expect(row.expiryDate).toBe('2026-07-05');
    expect(row.maker).toBe(CURRENT_USER.name);
  });

  it('menolak 403 saat menerbitkan untuk diri sendiri', async () => {
    await expect(reprimandService.create({ ...valid, employeeId: CURRENT_USER.id })).rejects.toThrow(/403/);
  });

  it('menolak 409 saat maker menyetujui reprimand-nya sendiri', async () => {
    const rows = await reprimandService.list();
    const own = rows.find((row) => row.maker === CURRENT_USER.name && row.status === 'IN_APPROVAL')!;
    await expect(reprimandService.approve(own.id, '')).rejects.toThrow(/409/);
  });

  it('checker lain bisa menyetujui dan reprimand jadi ACTIVE', async () => {
    const rows = await reprimandService.list();
    const other = rows.find((row) => row.status === 'IN_APPROVAL' && row.maker !== CURRENT_USER.name)!;
    await reprimandService.approve(other.id, 'Disetujui');
    const after = await reprimandService.list();
    expect(after.find((row) => row.id === other.id)!.status).toBe('ACTIVE');
  });
});

describe('RP-STANDING — derive-on-read dari snapshot', () => {
  it('DIRECT memakai level tertinggi, ACCUMULATIVE menjumlahkan poin', () => {
    expect(deriveLevel('DIRECT', { points: 3, highestLevel: 1, terminal: false })).toBe('SP1');
    expect(deriveLevel('ACCUMULATIVE', { points: 3, highestLevel: 1, terminal: false })).toBe('FINAL');
    expect(deriveLevel('ACCUMULATIVE', { points: 2, highestLevel: 1, terminal: false })).toBe('SP2');
    expect(deriveLevel('DIRECT', { points: 0, highestLevel: 0, terminal: false })).toBe('CLEAN');
  });

  it('snapshot terminal selalu mengunci ke Final warning', () => {
    expect(deriveLevel('DIRECT', { points: 0, highestLevel: 0, terminal: true })).toBe('FINAL');
    expect(deriveLevel('ACCUMULATIVE', { points: 0, highestLevel: 0, terminal: true })).toBe('FINAL');
  });

  it('mengubah master kategori tidak mengubah snapshot lama', async () => {
    const before = await reprimandService.list();
    const target = before.find((row) => row.categoryCode === 'SP1')!;
    const originalPoint = target.snapshot.point;

    await reprimandService.saveCategory(
      { code: 'SP1', label: 'SP1 — diubah', point: 9, validityMonths: 12, levelOrder: 1, terminal: false, active: true },
      'SP1',
    );

    const after = await reprimandService.list();
    expect(after.find((row) => row.id === target.id)!.snapshot.point).toBe(originalPoint);
  });
});

describe('RP-TYPE-SETTING — konfigurasi', () => {
  it('menolak kode kategori yang tidak sesuai format', async () => {
    await expect(
      categorySchema.validateAt('code', { code: 'sp-4' }),
    ).rejects.toThrow(/huruf kapital/i);
  });

  it('menolak kode ganda', async () => {
    await expect(
      reprimandService.saveCategory({
        code: 'SP2',
        label: 'Duplikat',
        point: 1,
        validityMonths: 6,
        levelOrder: 5,
        terminal: false,
        active: true,
      }),
    ).rejects.toThrow(/409/);
  });

  it('menonaktifkan kategori tanpa menghapusnya', async () => {
    await reprimandService.deactivateCategory('VERBAL');
    const rows = await reprimandService.categories();
    const verbal = rows.find((row) => row.code === 'VERBAL')!;
    expect(verbal).toBeDefined();
    expect(verbal.active).toBe(false);
  });

  it('menyimpan mode kebijakan standing', async () => {
    await reprimandService.savePolicy('ACCUMULATIVE');
    expect(await reprimandService.policy()).toBe('ACCUMULATIVE');
  });
});
