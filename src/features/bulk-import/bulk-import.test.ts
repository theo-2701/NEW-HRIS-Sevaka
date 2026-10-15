import { describe, expect, it } from 'vitest';
import { bulkImportService } from '@/features/bulk-import/services/bulk-import.service';
import { TEMPLATE_COLUMNS } from '@/features/bulk-import/types';

const csv = (name: string, lines: string[]) => new File([lines.join('\n')], name, { type: 'text/csv' });
const header = TEMPLATE_COLUMNS.join(',');
const row = (nomor: string, email = 'a@b.co') =>
  `Andi,KTP,${nomor},${email},+62811,,2026-11-01,,,,WFO,,,,,,`;

describe('Bulk Import Karyawan (FSD-EMPLOYEE §8 · UIC §6A)', () => {
  it('judul kolom tidak sesuai templat → 422 dan batch REJECTED_FILE tercatat', async () => {
    await expect(bulkImportService.upload(csv('salah.csv', ['nama,email', 'x,y']), 'k-reject')).rejects.toThrow(/^422/);
    const [latest] = await bulkImportService.search({});
    expect(latest.fileName).toBe('salah.csv');
    expect(latest.importStatus).toBe('REJECTED_FILE');
  });

  it('unggah valid → tiket VALIDATING; baris cacat & duplikat ditandai INVALID; Idempotency-Key tidak melahirkan batch kedua', async () => {
    const file = csv('ok.csv', [header, row('111'), row('222', 'bukan-email'), row('111')]);
    const ticket = await bulkImportService.upload(file, 'k-ok');
    expect(ticket.importStatus).toBe('VALIDATING');
    expect((await bulkImportService.upload(file, 'k-ok')).id).toBe(ticket.id);

    const invalid = await bulkImportService.rows(ticket.id, ['INVALID']);
    expect(invalid.map((r) => r.row)).toEqual([3, 4]);
    expect(invalid[1].message).toMatch(/duplikat pada baris 2 dan 4/);
  });

  it('pengunggah tidak boleh menyetujui batch-nya sendiri (403); batalkan wajib alasan; status bukan VALIDATED → 409', async () => {
    await expect(bulkImportService.approve('BI-0004', '')).rejects.toThrow(/^403/);
    await expect(bulkImportService.cancel('BI-0004', ' ')).rejects.toThrow(/^422/);
    await bulkImportService.cancel('BI-0004', 'Salah unggah');
    expect((await bulkImportService.detail('BI-0004')).importStatus).toBe('CANCELLED');
    await expect(bulkImportService.approve('BI-0004', '')).rejects.toThrow(/^409/);
  });

  it('checker lain menyetujui → PROCESSING dengan selection_hash', async () => {
    const batch = await bulkImportService.approve('BI-0005', 'Sudah dicek');
    expect(batch.importStatus).toBe('PROCESSING');
    expect(batch.selectionHash).toMatch(/^sha256:/);
  });
});
