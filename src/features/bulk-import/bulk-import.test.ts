import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bulkImportService as svc, checkRows, parseCsv, resetBulkImportMocks } from '@/features/bulk-import/services/bulk-import.service';
import { atsBridgeService, resetAtsMocks } from '@/features/ats-bridge/services/ats-bridge.service';

const MAKER = { employeeId: 'emp-sari', role: 'HR_STAFF' as const };
const CHECKER = { employeeId: 'emp-hendra', role: 'HR_MANAGER' as const };
const csv = (body: string) => new File([body], 'kandidat.csv', { type: 'text/csv' });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout'] });
  resetBulkImportMocks();
  resetAtsMocks();
});
afterEach(() => vi.useRealTimers());

const run = async <T,>(promise: Promise<T>) => {
  await vi.advanceTimersByTimeAsync(500);
  return promise;
};

describe('Bulk Import email-saja (§7.16)', () => {
  it('berkas utuh ditolak 422: judul salah, nol baris', () => {
    expect(() => parseCsv('nama\nandi@x.com', 20)).toThrow(/judul kolom/);
    expect(() => parseCsv('email\n', 6)).toThrow(/baris data/);
  });

  it('per baris: format, kembar di berkas, undangan menunggu; nomor baris = baris berkas', () => {
    const rows = checkRows(['ok@x.com', 'salah', 'dup@x.com', 'DUP@x.com', 'nadia.putri@gmail.com']);
    expect(rows.map((row) => [row.row, row.rowState])).toEqual([
      [2, 'VALID'],
      [3, 'INVALID'],
      [4, 'INVALID'],
      [5, 'INVALID'],
      [6, 'INVALID'],
    ]);
  });

  it('maker tidak bisa menyetujui; checker menyetujui ⇒ baris ATS BULK_IMPORT lahir', async () => {
    const batch = await run(svc.upload(MAKER, csv('email\nbaru1@x.com\nsalah\n'), 'k1'));
    await vi.advanceTimersByTimeAsync(2000);
    const own = expect(svc.approve({ employeeId: 'emp-sari', role: 'HR_MANAGER' }, batch.id, 'ptdika.co.id', '')).rejects.toThrow(/409/);
    await vi.advanceTimersByTimeAsync(500);
    await own;
    await run(svc.approve(CHECKER, batch.id, 'ptdika.co.id', ''));
    await vi.advanceTimersByTimeAsync(2000);
    const [done] = await run(svc.list());
    expect(done).toMatchObject({ importStatus: 'PARTIAL', successCount: 1, failedCount: 1, emailDomain: 'ptdika.co.id' });
    const ats = (await run(atsBridgeService.search({ source: 'BULK_IMPORT' }))).find((row) => row.candidateEmail === 'baru1@x.com');
    expect(ats).toMatchObject({ atsStatus: 'WAITING_CANDIDATE', emailDomain: 'ptdika.co.id' });
  });

  it('kunci idempotensi yang sama tidak melahirkan batch kedua', async () => {
    const a = await run(svc.upload(MAKER, csv('email\na@x.com\n'), 'same'));
    const b = await run(svc.upload(MAKER, csv('email\na@x.com\n'), 'same'));
    expect(b.id).toBe(a.id);
    expect(await run(svc.list())).toHaveLength(1);
  });
});
