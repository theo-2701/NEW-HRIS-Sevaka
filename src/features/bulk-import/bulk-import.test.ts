import { describe, expect, it } from 'vitest';
import { bulkImportService } from '@/features/bulk-import/services/bulk-import.service';
import { atsBridgeService } from '@/features/ats-bridge/services/ats-bridge.service';

const csv = (name: string, lines: string[]) => new File([lines.join('\n')], name, { type: 'text/csv' });
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Employee Bulk Import — bentuk email-saja (FSD-001-EMPLOYEE 0.46 §8)', () => {
  it('judul kolom bukan "email" → 422 dan batch REJECTED_FILE tercatat', async () => {
    await expect(bulkImportService.upload(csv('wrong.csv', ['nama,email', 'x,y']), 'k-reject')).rejects.toThrow(/^422/);
    const [latest] = await bulkImportService.search({});
    expect(latest.fileName).toBe('wrong.csv');
    expect(latest.importStatus).toBe('REJECTED_FILE');
  });

  it('unggah → VALIDATING; email cacat, kembar, dan yang masih menunggu undangan ditandai Failed Check; Idempotency-Key aman', async () => {
    const file = csv('ok.csv', ['email', 'baru.satu@gmail.com', 'bukan-email', 'baru.satu@gmail.com', 'andi.wijaya@gmail.com']);
    const ticket = await bulkImportService.upload(file, 'k-ok');
    expect(ticket.importStatus).toBe('VALIDATING');
    expect((await bulkImportService.upload(file, 'k-ok')).id).toBe(ticket.id);
    const invalid = await bulkImportService.rows(ticket.id, ['INVALID']);
    expect(invalid.map((r) => r.row)).toEqual([3, 4, 5]);
    expect(invalid[1].message).toMatch(/Duplicate email on rows 2 and 4/);
  });

  it('pengunggah tidak boleh menyetujui batch-nya sendiri (409); batalkan wajib alasan', async () => {
    await expect(bulkImportService.approve('BI-0004', '')).rejects.toThrow(/^409/);
    await expect(bulkImportService.cancel('BI-0004', ' ')).rejects.toThrow(/^422/);
    await bulkImportService.cancel('BI-0004', 'Wrong file');
    expect((await bulkImportService.detail('BI-0004')).importStatus).toBe('CANCELLED');
  });

  it('checker lain menyetujui → undangan terkirim dan kandidat muncul di ATS Bridge (sumber Bulk Import)', async () => {
    await expect(bulkImportService.approve('BI-0005', 'Checked', 'ed-juaracoding')).rejects.toThrow(/^422/);
    const batch = await bulkImportService.approve('BI-0005', 'Checked', 'ed-ptdika-coid');
    expect(batch.importStatus).toBe('PROCESSING');
    expect(batch.selectionHash).toMatch(/^sha256:/);
    await wait(1700);
    const invited = await bulkImportService.rows('BI-0005', ['IMPORTED']);
    expect(invited.length).toBe(18);
    const ats = await atsBridgeService.search({ source: 'BULK_IMPORT', atsStatus: 'WAITING_CANDIDATE' });
    expect(ats.some((row) => row.candidateEmail === invited[0].email)).toBe(true);
  });
});
