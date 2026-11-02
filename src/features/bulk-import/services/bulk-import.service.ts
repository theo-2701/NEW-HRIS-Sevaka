import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import { hasWaitingInvite, inviteAtsCandidate } from '@/features/ats-bridge/services/ats-bridge.service';
import { MAX_BYTES, MAX_ROWS } from '@/features/bulk-import/types';
import type { ImportBatch, ImportRow, ImportSession, RowState } from '@/features/bulk-import/types';

/**
 * Endpoint kontrak (§7.16): POST /employee-imports (multipart, Idempotency-Key) ·
 * POST …/{id}/approve · POST …/{id}/cancel · GET …/{id} · GET …/{id}/rows ·
 * POST /employee-imports/search · GET /employee-imports/template
 */
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));
/** Mock: lama pemeriksaan/pengiriman latar sebelum status berpindah. */
const BACKGROUND_MS = 1500;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

let batches: ImportBatch[] = [];
let rowsByBatch = new Map<string, ImportRow[]>();
let keys = new Map<string, string>();

export function resetBulkImportMocks() {
  batches = [];
  rowsByBatch = new Map();
  keys = new Map();
}

function find(id: string) {
  const batch = batches.find((row) => row.id === id);
  if (!batch) throw new Error('404 — batch impor tidak ditemukan.');
  return batch;
}

/** Validasi per baris §7.16.3: bentuk email, kembar di berkas, undangan menunggu. */
export function checkRows(emails: string[]): ImportRow[] {
  const lower = emails.map((email) => email.trim().toLowerCase());
  const counts = lower.reduce((map, email) => map.set(email, (map.get(email) ?? 0) + 1), new Map<string, number>());
  return lower.map((email, index) => {
    let message: string | null = null;
    if (!email || email.length > 150 || !EMAIL.test(email)) message = 'email is empty, malformed, or longer than 150 characters';
    else if ((counts.get(email) ?? 0) > 1) message = 'email is duplicated within this file';
    else if (hasWaitingInvite(email)) {
      message = 'this email already has an invitation waiting for the candidate -- resend that link from the ATS Bridge menu';
    }
    return { row: index + 2, rowState: message ? 'INVALID' : 'VALID', email: emails[index].trim(), atsBridgeId: null, message };
  });
}

/** Penolakan berkas utuh = 422 (bukan laporan baris): jenis, judul kolom, nol baris, atap. */
export function parseCsv(text: string, size: number): string[] {
  if (size > MAX_BYTES) throw new Error('422 — berkas melebihi 5 MB.');
  if (text.includes('\u0000') || /^PK/.test(text)) throw new Error('422 — hanya CSV teks polos yang diterima.');
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim() !== '');
  if (!lines.length || lines[0].trim().toLowerCase() !== 'email') {
    throw new Error('422 — judul kolom harus tepat satu: email.');
  }
  const data = lines.slice(1).map((line) => line.replace(/^"|"$/g, ''));
  if (!data.length) throw new Error('422 — berkas tidak punya baris data.');
  if (data.length > MAX_ROWS) throw new Error(`422 — maksimal ${MAX_ROWS} baris; pecah berkasnya.`);
  return data;
}

/** FileReader: tersedia di semua peramban dan di jsdom (tidak seperti `File.text`). */
const readText = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('422 — berkas tidak dapat dibaca.'));
    reader.readAsText(file);
  });

const counts = (rows: ImportRow[], states: RowState[]) => rows.filter((row) => states.includes(row.rowState)).length;

export const bulkImportService = {
  async list(): Promise<ImportBatch[]> {
    if (MOCK) {
      await delay(150);
      return batches.map((row) => ({ ...row }));
    }
    const { data } = await api.post<{ data: ImportBatch[] }>('/employee-imports/search', { sort_by: 'submitted_at', sort_direction: 'DESC' });
    return data.data;
  },

  async rows(id: string, failedOnly: boolean): Promise<ImportRow[]> {
    if (MOCK) {
      await delay(150);
      const rows = rowsByBatch.get(id) ?? [];
      return rows.filter((row) => !failedOnly || row.rowState === 'INVALID' || row.rowState === 'FAILED').map((row) => ({ ...row }));
    }
    const { data } = await api.get<{ data: ImportRow[] }>(`/employee-imports/${id}/rows`, {
      params: { row_state: failedOnly ? 'INVALID,FAILED' : undefined, size: 200 },
    });
    return data.data;
  },

  /** Unggah: 202 bertiket; pemeriksaan per baris berjalan di latar (VALIDATING → VALIDATED). */
  async upload(session: ImportSession, file: File, idempotencyKey: string): Promise<ImportBatch> {
    if (MOCK) {
      await delay(300);
      const replay = keys.get(`${session.employeeId}:${idempotencyKey}`);
      if (replay) return { ...find(replay) };
      const emails = parseCsv(await readText(file), file.size);
      const batch: ImportBatch = {
        id: `imp-${crypto.randomUUID().slice(0, 8)}`,
        importStatus: 'VALIDATING',
        fileName: file.name,
        totalRows: emails.length,
        successCount: 0,
        failedCount: 0,
        emailDomain: null,
        submittedBy: session.employeeId,
        submittedAt: new Date().toISOString(),
        approvedBy: null,
        approvedAt: null,
        cancelReason: null,
      };
      batches = [batch, ...batches];
      keys.set(`${session.employeeId}:${idempotencyKey}`, batch.id);
      setTimeout(() => {
        const rows = checkRows(emails);
        rowsByBatch.set(batch.id, rows);
        batch.failedCount = counts(rows, ['INVALID']);
        batch.importStatus = 'VALIDATED';
      }, BACKGROUND_MS);
      return { ...batch };
    }
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post<ImportBatch>('/employee-imports', form, { headers: { 'Idempotency-Key': idempotencyKey } });
    return data;
  },

  /** Persetujuan checker (≠ maker) sekaligus mengirim undangan; domain email dibekukan. */
  async approve(session: ImportSession, id: string, emailDomain: string, note: string): Promise<ImportBatch> {
    if (MOCK) {
      await delay(300);
      const batch = find(id);
      if (session.role !== 'HR_MANAGER') throw new Error('403 — persetujuan milik HR Manager atau Super Admin.');
      if (batch.submittedBy === session.employeeId) throw new Error('409 — Checker must not be the same as the uploader (maker != checker).');
      if (batch.importStatus !== 'VALIDATED') throw new Error('409 — hanya batch Awaiting approval yang bisa disetujui.');
      if (!emailDomain) throw new Error('422 EMP-VAL-620 — pilih domain email aktif.');
      void note;
      Object.assign(batch, { importStatus: 'PROCESSING', approvedBy: session.employeeId, approvedAt: new Date().toISOString(), emailDomain });
      setTimeout(() => {
        const rows = rowsByBatch.get(id) ?? [];
        rows.forEach((row) => {
          if (row.rowState !== 'VALID') return;
          // Jaring pengaman lomba: undangan baru muncul sesudah berkas diperiksa.
          if (hasWaitingInvite(row.email)) {
            Object.assign(row, { rowState: 'FAILED', message: 'an invitation waiting for the candidate was created for this email after the file was checked' });
            return;
          }
          const ats = inviteAtsCandidate('BULK_IMPORT', row.email, batch.submittedBy, emailDomain);
          Object.assign(row, { rowState: 'IMPORTED', atsBridgeId: ats.id, message: null });
        });
        batch.successCount = counts(rows, ['IMPORTED']);
        batch.failedCount = counts(rows, ['INVALID', 'FAILED']);
        batch.importStatus = batch.failedCount ? 'PARTIAL' : 'PROCESSED';
      }, BACKGROUND_MS);
      return { ...batch };
    }
    const { data } = await api.post<ImportBatch>(`/employee-imports/${id}/approve`, { approver_note: note || undefined, email_domain: emailDomain });
    return data;
  },

  async cancel(id: string, reason: string): Promise<ImportBatch> {
    if (MOCK) {
      await delay(250);
      const batch = find(id);
      if (batch.importStatus !== 'VALIDATED') throw new Error('409 — hanya batch Awaiting approval yang bisa dibatalkan.');
      batch.importStatus = 'CANCELLED';
      batch.cancelReason = reason.trim() || null;
      return { ...batch };
    }
    const { data } = await api.post<ImportBatch>(`/employee-imports/${id}/cancel`, { reason });
    return data;
  },
};
