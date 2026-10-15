import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import { CURRENT_USER, MAX_BYTES, MAX_ROWS, TEMPLATE_COLUMNS } from '@/features/bulk-import/types';
import type { ImportBatch, ImportFilter, ImportRow, RowState } from '@/features/bulk-import/types';

/**
 * API service Bulk Import Karyawan (UIC-001-EMPLOYEE §6A · TSD §7.16):
 *   GET  /employee-imports/template      — templat CSV 17 kolom
 *   POST /employee-imports               — unggah (maker), 202 BERTIKET, wajib Idempotency-Key
 *   POST /employee-imports/{id}/approve  — checker ≠ maker, hanya VALIDATED, sekaligus menjalankan
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
    return {
      row,
      rowState,
      nama: `Karyawan Impor ${row - 1}`,
      nomorIdentitas: `3271${String(100000 + row).padStart(12, '0')}`,
      employeeId: rowState === 'IMPORTED' ? `EMP-${String(9000 + row)}` : null,
      message,
    };
  });

const batches: ImportBatch[] = [
  { id: 'BI-0005', fileName: 'karyawan-cabang-surabaya.csv', importStatus: 'VALIDATED', totalRows: 20, successCount: 0, failedCount: 2, seededPtkpDefaultCount: 1, selectionHash: null, submittedBy: 'Rina Hartono', submittedAt: '2026-10-14T09:12:00+07:00', approvedBy: null, approvedAt: null },
  { id: 'BI-0004', fileName: 'karyawan-baru-oktober.csv', importStatus: 'VALIDATED', totalRows: 8, successCount: 0, failedCount: 0, seededPtkpDefaultCount: 0, selectionHash: null, submittedBy: CURRENT_USER, submittedAt: '2026-10-13T14:30:00+07:00', approvedBy: null, approvedAt: null },
  { id: 'BI-0003', fileName: 'karyawan-cabang-bandung.csv', importStatus: 'PARTIAL', totalRows: 24, successCount: 21, failedCount: 3, seededPtkpDefaultCount: 2, selectionHash: fakeHash(), submittedBy: 'Rina Hartono', submittedAt: '2026-09-07T09:12:00+07:00', approvedBy: CURRENT_USER, approvedAt: '2026-09-07T09:40:00+07:00' },
  { id: 'BI-0002', fileName: 'karyawan-hq.xlsx.csv', importStatus: 'REJECTED_FILE', totalRows: 0, successCount: 0, failedCount: 0, seededPtkpDefaultCount: 0, selectionHash: null, submittedBy: 'Dewi Anggraini', submittedAt: '2026-09-02T10:05:00+07:00', approvedBy: null, approvedAt: null },
  { id: 'BI-0001', fileName: 'karyawan-cabang-medan.csv', importStatus: 'PROCESSED', totalRows: 12, successCount: 12, failedCount: 0, seededPtkpDefaultCount: 0, selectionHash: fakeHash(), submittedBy: 'Dewi Anggraini', submittedAt: '2026-08-28T08:00:00+07:00', approvedBy: CURRENT_USER, approvedAt: '2026-08-28T08:30:00+07:00' },
];

const rowsById: Record<string, ImportRow[]> = {
  'BI-0005': seedRows(20, { 5: 'golongan tidak ditemukan, lebih dari satu, atau bukan tingkat Class', 14: 'nomor identitas duplikat pada baris 14 dan 18' }, 'pre'),
  'BI-0004': seedRows(8, {}, 'pre'),
  'BI-0003': seedRows(24, { 4: 'email tidak valid', 9: 'cabang wajib diisi untuk mode kerja WFO', 17: 'tanggal_masuk harus yyyy-MM-dd' }, 'post'),
  'BI-0002': [],
  'BI-0001': seedRows(12, {}, 'post'),
};

/** Klaim Idempotency-Key → id batch (pengiriman ulang unggahan yang sama tidak melahirkan batch kedua). */
const claims = new Map<string, string>();

const find = (id: string) => {
  const batch = batches.find((row) => row.id === id);
  if (!batch) throw new Error('404 — batch impor tidak ditemukan.');
  return batch;
};

const requireValidated = (batch: ImportBatch) => {
  if (batch.importStatus !== 'VALIDATED') {
    throw new Error('409 — batch sudah diputuskan pengguna lain. Status dimuat ulang.');
  }
};

const IDENTITY_TYPES = ['KTP', 'PASSPORT', 'KITAS', 'KITAP'];

/** Pemeriksaan baris dummy — hanya kolom wajib & format dasar (TSD §7.16.3). */
function checkRow(cells: string[], seen: Map<string, number>, row: number): string | null {
  const [nama, jenis, nomor, email, hp, , tanggal] = cells;
  if (!nama || !jenis || !nomor || !email || !hp || !tanggal) return 'kolom wajib kosong';
  if (!IDENTITY_TYPES.includes(jenis)) return 'jenis_identitas harus KTP/PASSPORT/KITAS/KITAP';
  if (!/^\S+@\S+\.\S+$/.test(email)) return 'email tidak valid';
  if (!hp.startsWith('+62')) return 'nomor_hp harus diawali +62';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return 'tanggal_masuk harus yyyy-MM-dd';
  const first = seen.get(nomor);
  if (first) return `nomor identitas duplikat pada baris ${first} dan ${row}`;
  seen.set(nomor, row);
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
        batches.unshift({ id, fileName: file.name, importStatus: 'REJECTED_FILE', totalRows: 0, successCount: 0, failedCount: 0, seededPtkpDefaultCount: 0, selectionHash: null, submittedBy: CURRENT_USER, submittedAt: nowIso(), approvedBy: null, approvedAt: null });
        rowsById[id] = [];
        claims.set(idempotencyKey, id);
        throw new Error(`422 — ${reason}`);
      };
      if (!file.name.toLowerCase().endsWith('.csv')) reject('hanya berkas CSV polos yang diterima.');
      if (file.size > MAX_BYTES) reject('ukuran berkas melebihi 5 MB.');
      if (header?.join(',') !== TEMPLATE_COLUMNS.join(',')) reject('judul kolom tidak sesuai templat (17 kolom, urutan mengikat).');
      if (lines.length - 1 > MAX_ROWS) reject(`berkas melebihi ${MAX_ROWS} baris.`);
      if (lines.length < 2) reject('berkas tidak memuat baris data.');

      const seen = new Map<string, number>();
      const parsed: ImportRow[] = lines.slice(1).map((line, index) => {
        const cells = line.split(',').map((cell) => cell.trim());
        const row = index + 2;
        const message = checkRow(cells, seen, row);
        return { row, rowState: message ? 'INVALID' : 'VALID', nama: cells[0] ?? '', nomorIdentitas: cells[2] ?? '', employeeId: null, message };
      });
      const batch: ImportBatch = { id, fileName: file.name, importStatus: 'VALIDATING', totalRows: parsed.length, successCount: 0, failedCount: 0, seededPtkpDefaultCount: parsed.filter((_, i) => !lines[i + 1].split(',')[13]?.trim()).length, selectionHash: null, submittedBy: CURRENT_USER, submittedAt: nowIso(), approvedBy: null, approvedAt: null };
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
      if (batch.submittedBy === CURRENT_USER) {
        throw new Error('403 — Anda pengunggah batch ini; persetujuan wajib oleh checker lain.');
      }
      Object.assign(batch, { importStatus: 'PROCESSING', selectionHash: fakeHash(), approvedBy: CURRENT_USER, approvedAt: nowIso() });
      setTimeout(() => {
        const rows = rowsById[id] ?? [];
        rows.forEach((row, index) => {
          if (row.rowState === 'VALID') Object.assign(row, { rowState: 'IMPORTED', employeeId: `EMP-${9500 + index}` });
        });
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
      if (!reason.trim()) throw new Error('422 — alasan pembatalan wajib diisi.');
      const batch = find(id);
      requireValidated(batch);
      batch.importStatus = 'CANCELLED';
      return;
    }
    await api.post(`/employee-imports/${id}/cancel`, { reason });
  },
};
