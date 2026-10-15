/** Bulk Import Karyawan — FSD-001-EMPLOYEE 0.24 §8 · UIC-001-EMPLOYEE 0.42 §6A (TSD §7.16). */

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
  VALIDATING: 'Diperiksa',
  VALIDATED: 'Siap ditinjau',
  REJECTED_FILE: 'Berkas ditolak',
  APPROVED: 'Disetujui',
  PROCESSING: 'Diproses',
  PROCESSED: 'Selesai',
  PARTIAL: 'Selesai sebagian',
  CANCELLED: 'Dibatalkan',
};

export const ROW_STATE_LABEL: Record<RowState, string> = {
  VALID: 'Valid',
  INVALID: 'Tidak valid',
  IMPORTED: 'Terimpor',
  FAILED: 'Gagal',
};

/** Satu baris grid `BI-HISTORY` sekaligus ringkasan `BI-DETAIL` (§7.16.6). */
export interface ImportBatch {
  id: string;
  fileName: string;
  importStatus: ImportStatus;
  totalRows: number;
  successCount: number;
  failedCount: number;
  seededPtkpDefaultCount: number;
  selectionHash: string | null;
  submittedBy: string;
  submittedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
}

export interface ImportRow {
  row: number;
  rowState: RowState;
  nama: string;
  nomorIdentitas: string;
  employeeId: string | null;
  message: string | null;
}

export interface ImportFilter {
  keyword?: string;
  importStatus?: ImportStatus[];
  startDate?: string;
  endDate?: string;
}

/** Urutan kolom templat CSV mengikat (UIC §6A.3). */
export const TEMPLATE_COLUMNS = [
  'nama',
  'jenis_identitas',
  'nomor_identitas',
  'email',
  'nomor_hp',
  'username',
  'tanggal_masuk',
  'cabang',
  'golongan',
  'jenis_kepegawaian',
  'mode_kerja',
  'cost_center',
  'sbu',
  'ptkp_code',
  'kode_bank',
  'nomor_rekening',
  'nama_pemilik_rekening',
] as const;

/** Batas berkas (TSD §7.16.2). */
export const MAX_ROWS = 2000;
export const MAX_BYTES = 5 * 1024 * 1024;

/** Akun login dummy — sama dengan modul Mass Resignation. */
export const CURRENT_USER = 'Tony Stark';
