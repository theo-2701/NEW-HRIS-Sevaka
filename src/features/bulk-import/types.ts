/**
 * Bulk Import karyawan, bentuk email-saja (TSD-001-EMPLOYEE 0.212 §7.16).
 * Unggah → periksa per baris → persetujuan orang kedua yang sekaligus mengirim
 * undangan (baris ATS `source=BULK_IMPORT`). Berkasnya sendiri tidak disimpan.
 */
export type ImportStatus =
  | 'VALIDATING'
  | 'VALIDATED'
  | 'REJECTED_FILE'
  | 'APPROVED'
  | 'CANCELLED'
  | 'PROCESSING'
  | 'PROCESSED'
  | 'PARTIAL';
export type RowState = 'VALID' | 'INVALID' | 'IMPORTED' | 'FAILED';
export type ImportRole = 'HR_STAFF' | 'HR_MANAGER';

export interface ImportSession {
  employeeId: string;
  role: ImportRole;
}

export interface ImportBatch {
  id: string;
  importStatus: ImportStatus;
  fileName: string;
  totalRows: number;
  successCount: number;
  failedCount: number;
  emailDomain: string | null;
  submittedBy: string;
  submittedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  cancelReason: string | null;
}

export interface ImportRow {
  /** Nomor baris DI BERKAS: judul = 1, data pertama = 2. */
  row: number;
  rowState: RowState;
  email: string;
  atsBridgeId: string | null;
  message: string | null;
}

export const IMPORT_STATUS_LABEL: Record<ImportStatus, string> = {
  VALIDATING: 'Checking',
  VALIDATED: 'Awaiting approval',
  REJECTED_FILE: 'File rejected',
  APPROVED: 'Approved',
  CANCELLED: 'Cancelled',
  PROCESSING: 'Sending invitations',
  PROCESSED: 'Completed',
  PARTIAL: 'Completed with failures',
};

export const ROW_STATE_LABEL: Record<RowState, string> = {
  VALID: 'Valid',
  INVALID: 'Invalid',
  IMPORTED: 'Invited',
  FAILED: 'Failed',
};

export const MAX_ROWS = 2000;
export const MAX_BYTES = 5 * 1024 * 1024;
export const TEMPLATE_CSV = 'email\ncandidate.one@example.com\ncandidate.two@example.com\n';
