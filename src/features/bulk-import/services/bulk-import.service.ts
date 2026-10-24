import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import { CURRENT_USER, MAX_BYTES, MAX_ROWS, TEMPLATE_COLUMNS } from '@/features/bulk-import/types';
import type { ImportBatch, ImportFilter, ImportRow, RowState } from '@/features/bulk-import/types';
import { atsEmailTaken, inviteFromImport } from '@/features/ats-bridge/services/ats-bridge.service';

/**
 * API service Employee Bulk Import (FSD-001-EMPLOYEE 0.46 §8 bentuk EMAIL-SAJA · TSD §7.16):
 *   GET  /employee-imports/template      — templat CSV satu kolom `email`
 *   POST /employee-imports               — unggah (maker), 202 BERTIKET, wajib Idempotency-Key
 *   POST /employee-imports/{id}/approve  — checker ≠ maker (409), hanya VALIDATED; mengirim magic link
 *                                          user consent + melahirkan baris ATS `source=BULK_IMPORT`
 *   POST /employee-imports/{id}/cancel   — alasan wajib, hanya VALIDATED
 *   GET  /employee-imports/{id}          — ringkasan tiket
 *   GET  /employee-imports/{id}/rows     — nasib per baris
 *   POST /employee-imports/search        — grid riwayat
 */
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));
/** Lama pemeriksaan/eksekusi latar di mode dummy. */
const BACKGROUND_MS = 1500;

const fakeHash = () => `sha256:${crypto.randomUUID().replace(/-/g, '')}`;
const nowIso = () => new Date().toISOString();

/** FileReader, bukan `File.text()` — jsdom (vitest) belum punya `text()`. */
const readText = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });

const seedRows = (count: number, invalid: Record<number, string>, state: 'pre' | 'post'): ImportRow[] =>
  Array.from({ length: count }, (_, index) => {
    const row = index + 2; // judul kolom = baris 1
    const message = invalid[row] ?? null;
    const rowState: RowState = message ? 'INVALID' : state === 'pre' ? 'VALID' : 'IMPORTED';
    const email = message?.startsWith('Not a valid') ? `kandidat${row - 1}@` : `kandidat${row - 1}@gmail.com`;
    return { row, rowState, email, message };
  });

const batches: ImportBatch[] = [
  { id: 'BI-0005', fileName: 'kandidat-cabang-surabaya.csv', importStatus: 'VALIDATED', totalRows: 20, successCount: 0, failedCount: 2, selectionHash: null, submittedBy: 'Rina Hartono', submittedAt: '2026-10-14T09:12:00+07:00', approvedBy: null, approvedAt: null },
  { id: 'BI-0004', fileName: 'kandidat-oktober.csv', importStatus: 'VALIDATED', totalRows: 8, successCount: 0, failedCount: 0, selectionHash: null, submittedBy: CURRENT_USER, submittedAt: '2026-10-13T14:30:00+07:00', approvedBy: null, approvedAt: null },
  { id: 'BI-0003', fileName: 'kandidat-cabang-bandung.csv', importStatus: 'PARTIAL', totalRows: 24, successCount: 21, failedCount: 3, selectionHash: fakeHash(), submittedBy: 'Rina Hartono', submittedAt: '2026-09-07T09:12:00+07:00', approvedBy: CURRENT_USER, approvedAt: '2026-09-07T09:40:00+07:00' },
  { id: 'BI-0002', fileName: 'kandidat-hq.xlsx.csv', importStatus: 'REJECTED_FILE', totalRows: 0, successCount: 0, failedCount: 0, selectionHash: null, submittedBy: 'Dewi Anggraini', submittedAt: '2026-09-02T10:05:00+07:00', approvedBy: null, approvedAt: null },
  { id: 'BI-0001', fileName: 'kandidat-cabang-medan.csv', importStatus: 'PROCESSED', totalRows: 12, successCount: 12, failedCount: 0, selectionHash: fakeHash(), submittedBy: 'Dewi Anggraini', submittedAt: '2026-08-28T08:00:00+07:00', approvedBy: CURRENT_USER, approvedAt: '2026-08-28T08:30:00+07:00' },
];

const rowsById: Record<string, ImportRow[]> = {
  'BI-0005': seedRows(20, { 5: 'Not a valid email address.', 14: 'Duplicate email on rows 14 and 18.' }, 'pre'),
  'BI-0004': seedRows(8, {}, 'pre'),
  'BI-0003': seedRows(24, { 4: 'Not a valid email address.', 9: 'This email already has a pending invitation.', 17: 'Duplicate email on rows 3 and 17.' }, 'post'),
  'BI-0002': [],
  'BI-0001': seedRows(12, {}, 'post'),
};

/** Klaim Idempotency-Key → id batch (pengiriman ulang unggahan yang sama tidak melahirkan batch kedua). */
const claims = new Map<string, string>();

const find = (id: string) => {
  const batch = batches.find((row) => row.id === id);
  if (!batch) throw new Error('404 — Import batch not found.');
  return batch;
};

const requireValidated = (batch: ImportBatch) => {
  if (batch.importStatus !== 'VALIDATED') {
    throw new Error('409 — This batch was already decided by someone else. The status has been reloaded.');
  }
};

/** Pemeriksaan baris (TSD §7.16.3 bentuk email-saja): format, kembar di berkas, undangan/karyawan yang sudah ada. */
function checkRow(email: string, seen: Map<string, number>, row: number): string | null {
  if (!email) return 'Email is empty.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Not a valid email address.';
  const key = email.toLowerCase();
  const first = seen.get(key);
  if (first) return `Duplicate email on rows ${first} and ${row}.`;
  seen.set(key, row);
  if (atsEmailTaken(key)) return 'This email already has a pending invitation or belongs to an employee.';
  return null;
}

export const bulkImportService = {
  templateCsv(): string {
    return `${TEMPLATE_COLUMNS.join(',')}\n`;
  },

  async search(filter: ImportFilter): Promise<ImportBatch[]> {
    if (MOCK) {
      await delay(150);
      const keyword = filter.keyword?.trim().toLowerCase();
      return batches
        .filter((row) => !keyword || row.fileName.toLowerCase().includes(keyword))
        .filter((row) => !filter.importStatus?.length || filter.importStatus.includes(row.importStatus))
        .filter((row) => !filter.startDate || row.submittedAt.slice(0, 10) >= filter.startDate)
        .filter((row) => !filter.endDate || row.submittedAt.slice(0, 10) <= filter.endDate)
        .map((row) => ({ ...row }));
    }
    const { data } = await api.post<{ data: ImportBatch[] }>('/employee-imports/search', {
      keyword: filter.keyword,
      import_status: filter.importStatus,
      start_date: filter.startDate,
      end_date: filter.endDate,
      page: 1,
      size: 200,
    });
    return data.data;
  },

  async detail(id: string): Promise<ImportBatch> {
    if (MOCK) {
      await delay(120);
      return { ...find(id) };
    }
    const { data } = await api.get<ImportBatch>(`/employee-imports/${id}`);
    return data;
  },

  async rows(id: string, rowState: RowState[]): Promise<ImportRow[]> {
    if (MOCK) {
      await delay(120);
      return (rowsById[id] ?? []).filter((row) => !rowState.length || rowState.includes(row.rowState));
    }
    const { data } = await api.get<{ data: ImportRow[] }>(`/employee-imports/${id}/rows`, {
      params: { row_state: rowState.join(',') || undefined, page: 1, size: 200 },
    });
    return data.data;
  },

  /** Unggah (maker). `idempotencyKey` dibuat per upaya unggah oleh pemanggil. */
  async upload(file: File, idempotencyKey: string): Promise<ImportBatch> {
    if (MOCK) {
      await delay();
      const claimed = claims.get(idempotencyKey);
      if (claimed) return { ...find(claimed) };

      const id = `BI-${String(batches.length + 1).padStart(4, '0')}`;
      const lines = (await readText(file)).split(/\r?\n/).filter((line) => line.trim());
      const header = lines[0]?.split(',').map((cell) => cell.trim());
      const reject = (reason: string) => {
        batches.unshift({ id, fileName: file.name, importStatus: 'REJECTED_FILE', totalRows: 0, successCount: 0, failedCount: 0, selectionHash: null, submittedBy: CURRENT_USER, submittedAt: nowIso(), approvedBy: null, approvedAt: null });
        rowsById[id] = [];
        claims.set(idempotencyKey, id);
        throw new Error(`422 — ${reason}`);
      };
      if (!file.name.toLowerCase().endsWith('.csv')) reject('Only plain-text CSV files are accepted.');
      if (file.size > MAX_BYTES) reject('The file is larger than 5 MB.');
      if (header?.join(',').toLowerCase() !== TEMPLATE_COLUMNS.join(',')) reject('The heading must be exactly "email", as in the template.');
      if (lines.length - 1 > MAX_ROWS) reject(`The file has more than ${MAX_ROWS.toLocaleString('en-US')} data rows. Split it into several files.`);
      if (lines.length < 2) reject('The file has no data rows.');

      const seen = new Map<string, number>();
      const parsed: ImportRow[] = lines.slice(1).map((line, index) => {
        const email = line.split(',')[0]?.trim() ?? '';
        const row = index + 2;
        const message = checkRow(email, seen, row);
        return { row, rowState: message ? 'INVALID' : 'VALID', email, message };
      });
      const batch: ImportBatch = { id, fileName: file.name, importStatus: 'VALIDATING', totalRows: parsed.length, successCount: 0, failedCount: 0, selectionHash: null, submittedBy: CURRENT_USER, submittedAt: nowIso(), approvedBy: null, approvedAt: null };
      batches.unshift(batch);
      rowsById[id] = parsed;
      claims.set(idempotencyKey, id);
      setTimeout(() => {
        batch.importStatus = 'VALIDATED';
        batch.failedCount = parsed.filter((row) => row.rowState === 'INVALID').length;
      }, BACKGROUND_MS);
      return { ...batch };
    }
    const body = new FormData();
    body.append('file', file);
    const { data } = await api.post<ImportBatch>('/employee-imports', body, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    return { ...data, fileName: file.name };
  },

  async approve(id: string, approverNote: string): Promise<ImportBatch> {
    if (MOCK) {
      await delay();
      const batch = find(id);
      requireValidated(batch);
      // FSD 0.32: checker = maker → 409 (sebelumnya 403).
      if (batch.submittedBy === CURRENT_USER) {
        throw new Error('409 — You uploaded this batch. Someone other than the uploader must approve it.');
      }
      Object.assign(batch, { importStatus: 'PROCESSING', selectionHash: fakeHash(), approvedBy: CURRENT_USER, approvedAt: nowIso() });
      setTimeout(() => {
        const rows = rowsById[id] ?? [];
        rows.forEach((row) => {
          if (row.rowState !== 'VALID') return;
          // Undangan terkirim = baris ATS lahir; email yang keburu dipakai sejak diperiksa gagal dikirim.
          if (atsEmailTaken(row.email)) {
            Object.assign(row, { rowState: 'FAILED', message: 'This email got an invitation elsewhere after the check.' });
            return;
          }
          inviteFromImport(row.email, { id: 'emp-tony', name: batch.submittedBy, nik: '—' });
          row.rowState = 'IMPORTED';
        });
        batch.failedCount = rows.filter((row) => row.rowState === 'INVALID' || row.rowState === 'FAILED').length;
        batch.successCount = rows.filter((row) => row.rowState === 'IMPORTED').length;
        batch.importStatus = batch.failedCount ? 'PARTIAL' : 'PROCESSED';
      }, BACKGROUND_MS);
      return { ...batch };
    }
    const { data } = await api.post<ImportBatch>(`/employee-imports/${id}/approve`, { approver_note: approverNote || undefined });
    return data;
  },

  async cancel(id: string, reason: string): Promise<void> {
    if (MOCK) {
      await delay();
      if (!reason.trim()) throw new Error('422 — A cancellation reason is required.');
      const batch = find(id);
      requireValidated(batch);
      batch.importStatus = 'CANCELLED';
      return;
    }
    await api.post(`/employee-imports/${id}/cancel`, { reason });
  },
};
