import type { SelectOption } from '@/components/form/SelectField';

/**
 * PTKP Adjustment — menetapkan status penghasilan tidak kena pajak seorang
 * karyawan (FSD §2.1–2.2 · UIC §8.1).
 *
 * Aturan kontrak yang mengikat:
 *  • Membuka periode baru **otomatis menutup** periode berjalan (H-1).
 *  • Checkbox **atestasi wajib** — tanpa itu simpan ditolak 422.
 *  • **Verifier ≠ pemohon**; karyawan tidak boleh mengubah PTKP-nya sendiri (403).
 *  • Basis pajak **immutable**: riwayat bersifat append-only, aktor dicap server
 *    dari token, tidak ada edit/hapus baris.
 */
export type PtkpCode = 'TK0' | 'TK1' | 'K0' | 'K1' | 'K2' | 'K3';

export type PeriodStatus = 'ACTIVE' | 'CLOSED';

export interface PtkpSubject {
  id: string;
  name: string;
  nik: string;
  position: string;
  branch: string;
  companyId: string;
}

export interface PtkpPeriod {
  id: string;
  code: PtkpCode;
  effectiveFrom: string;
  /** Kosong = periode berjalan (open-ended). */
  effectiveUntil: string;
  status: PeriodStatus;
  changedBy: string;
  /** Cap waktu server, sudah termasuk zona waktu. */
  recordedAt: string;
  eventDate?: string;
  eventNote?: string;
  remarks?: string;
  /** Id dokumen buram dari Document Service — bukan URL. */
  documentId?: string;
}

export interface PtkpAdjustmentDraft {
  code: string;
  effectiveFrom: string;
  eventDate: string;
  remarks: string;
  documentName: string;
  attestation: boolean;
}

/** Master `cnf_ptkp_effective` — kode di luar daftar ini ditolak server. */
export const PTKP_CODE_OPTIONS: SelectOption[] = [
  { value: 'TK0', label: 'TK/0 — Lajang, tanpa tanggungan' },
  { value: 'TK1', label: 'TK/1 — Lajang, 1 tanggungan' },
  { value: 'K0', label: 'K/0 — Menikah, tanpa tanggungan' },
  { value: 'K1', label: 'K/1 — Menikah, 1 tanggungan' },
  { value: 'K2', label: 'K/2 — Menikah, 2 tanggungan' },
  { value: 'K3', label: 'K/3 — Menikah, 3 tanggungan' },
];

/** Bentuk pendek untuk chip: TK0 → TK/0. */
export function shortCode(code: string): string {
  return code.replace(/^([A-Z]+)(\d)$/, '$1/$2');
}

/**
 * Tahun pajak yang sudah dikunci. Backdate melewati batas ini ditolak server;
 * UI menahannya lebih dulu supaya galatnya jelas di form.
 */
export const LOCKED_TAX_YEAR_UNTIL = '2025-12-31';

export function labelOf(options: SelectOption[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

/** Aktor yang sedang login — dipakai untuk aturan verifier ≠ pemohon. */
export const CURRENT_USER = { id: 'emp-tony', name: 'Tony Stark' };
