import { describe, expect, it } from 'vitest';
import { ptkpAdjustmentSchema } from '@/features/ptkp/validation';
import { ptkpService } from '@/features/ptkp/services/ptkp.service';
import { CURRENT_USER, LOCKED_TAX_YEAR_UNTIL, shortCode } from '@/features/ptkp/types';

const valid = {
  code: 'K1',
  effectiveFrom: '2026-03-01',
  eventDate: '',
  remarks: '',
  documentName: '',
  attestation: true,
};

describe('PTKP-ADJUST — validasi form', () => {
  it('menolak simpan tanpa atestasi', async () => {
    await expect(
      ptkpAdjustmentSchema.validateAt('attestation', { ...valid, attestation: false }),
    ).rejects.toThrow(/Atestasi wajib/);
  });

  it('menolak backdate ke tahun pajak yang sudah dikunci', async () => {
    await expect(
      ptkpAdjustmentSchema.validateAt('effectiveFrom', { ...valid, effectiveFrom: LOCKED_TAX_YEAR_UNTIL }),
    ).rejects.toThrow(/terkunci/);
  });

  it('menerima form yang lengkap', async () => {
    await expect(ptkpAdjustmentSchema.validate(valid)).resolves.toBeTruthy();
  });
});

describe('PTKP-ADJUST — aturan server', () => {
  it('menolak 422 bila atestasi tidak dicentang', async () => {
    await expect(ptkpService.adjust('emp-eka', { ...valid, attestation: false })).rejects.toThrow(/422/);
  });

  it('menolak 403 bila pemohon mengubah PTKP dirinya sendiri', async () => {
    await expect(ptkpService.adjust(CURRENT_USER.id, valid)).rejects.toThrow(/403/);
  });

  it('menolak tanggal mulai yang tidak melewati periode berjalan', async () => {
    // Buka periode 2026-06-01 dulu, lalu coba mundur ke sebelum itu.
    await ptkpService.adjust('emp-dimas', { ...valid, effectiveFrom: '2026-06-01' });
    await expect(
      ptkpService.adjust('emp-dimas', { ...valid, effectiveFrom: '2026-05-01' }),
    ).rejects.toThrow(/setelah periode berjalan/);
  });
});

describe('PTKP-ADJUST — periode & log append-only', () => {
  it('menutup periode berjalan H-1 dan membuka periode baru', async () => {
    const before = await ptkpService.periods('emp-eka');
    const running = before.find((row) => row.status === 'ACTIVE')!;

    const created = await ptkpService.adjust('emp-eka', { ...valid, effectiveFrom: '2026-03-01' });
    const after = await ptkpService.periods('emp-eka');

    expect(created.status).toBe('ACTIVE');
    expect(created.changedBy).toBe(CURRENT_USER.name);

    const closed = after.find((row) => row.id === running.id)!;
    expect(closed.status).toBe('CLOSED');
    expect(closed.effectiveUntil).toBe('2026-02-28');

    // Append-only: baris lama tetap ada, hanya bertambah satu.
    expect(after).toHaveLength(before.length + 1);
    expect(after.filter((row) => row.status === 'ACTIVE')).toHaveLength(1);
  });

  it('menyimpan dokumen sebagai id buram, bukan nama berkas', async () => {
    const created = await ptkpService.adjust('emp-nadia', {
      ...valid,
      effectiveFrom: '2026-05-01',
      documentName: 'akta-kelahiran.pdf',
    });
    expect(created.documentId).toMatch(/^doc-[0-9a-f]{8}$/);
    expect(JSON.stringify(created)).not.toContain('akta-kelahiran.pdf');
  });
});

describe('Format kode PTKP', () => {
  it('memendekkan kode master jadi bentuk tampilan', () => {
    expect(shortCode('TK0')).toBe('TK/0');
    expect(shortCode('K3')).toBe('K/3');
  });
});
