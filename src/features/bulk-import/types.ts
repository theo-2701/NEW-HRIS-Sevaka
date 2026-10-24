/**
 * Employee Bulk Import — FSD-001-EMPLOYEE 0.46 §8 (bentuk EMAIL-SAJA, request `EMP-2610181639` T11),
 * TSD §7.16. Berkas berisi satu kolom `email`; persetujuan checker mengirim magic link user consent dan
 * melahirkan baris ATS `source=BULK_IMPORT`. Impor tidak lagi membuat karyawan, login, maupun PTKP.
 */

export type ImportStatus =
  | 'VALIDATING'
  | 'VALIDATED'
  | 'REJECTED_FILE'
  | 'APPROVED'
  | 'PROCESSING'
  | 'PROCESSED'
  | 'PARTIAL'
  | 'CANCELLED';

export type RowState = 'VALID' | 'INVALID' | 'IMPORTED' | 'FAILED';

export const IMPORT_STATUS_LABEL: Record<ImportStatus, string> = {
  VALIDATING: 'Being Checked',
  VALIDATED: 'Awaiting Approval',
  REJECTED_FILE: 'File Rejected',
  APPROVED: 'Approved',
  PROCESSING: 'In Progress',
  PROCESSED: 'Completed',
  PARTIAL: 'Partly Completed',
  CANCELLED: 'Cancelled',
};

export const IMPORT_STATUS_MEANING: Record<ImportStatus, string> = {
  VALIDATING: 'The file has been sent and its rows are being checked. No invitation has been sent yet.',
  VALIDATED: 'The check is done. Waiting for someone other than the uploader to approve or cancel it.',
  REJECTED_FILE: 'The file was rejected and no rows were saved. Fix the file and upload it again.',
  APPROVED: 'Approved. Invitations are about to be sent.',
  PROCESSING: 'Invitations are being sent to the rows that passed the check.',
  PROCESSED: 'Every row that passed the check received an invitation.',
  PARTIAL: 'Some invitations were sent; the rest failed the check or could not be sent.',
  CANCELLED: 'Cancelled before approval. No invitation was sent; the rows stay on record.',
};

/** FSD §8.4.3 — label baris bentuk email-saja. */
export const ROW_STATE_LABEL: Record<RowState, string> = {
  VALID: 'Passed Check',
  INVALID: 'Failed Check',
  IMPORTED: 'Invited',
  FAILED: 'Failed to Send',
};

/** Satu baris grid `BI-HISTORY` sekaligus ringkasan `BI-DETAIL` (§7.16.6). */
export interface ImportBatch {
  id: string;
  fileName: string;
  importStatus: ImportStatus;
  totalRows: number;
  successCount: number;
  failedCount: number;
  selectionHash: string | null;
  submittedBy: string;
  submittedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
}

export interface ImportRow {
  /** Nomor baris di berkas asli (judul = baris 1). */
  row: number;
  rowState: RowState;
  email: string;
  message: string | null;
}

export interface ImportFilter {
  keyword?: string;
  importStatus?: ImportStatus[];
  startDate?: string;
  endDate?: string;
}

/** Templat CSV: satu kolom (FSD §8.5.1). */
export const TEMPLATE_COLUMNS = ['email'] as const;

/** Batas berkas (TSD §7.16.2). */
export const MAX_ROWS = 2000;
export const MAX_BYTES = 5 * 1024 * 1024;

/** Akun login dummy — sama dengan modul Mass Resignation. */
export const CURRENT_USER = 'Tony Stark';
