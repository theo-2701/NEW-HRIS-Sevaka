/**
 * System › Settings › Configuration — FSD-001-SETTINGS-0.21 §1 (Waktu) & §8 (Karyawan) ·
 * UIC-001-SETTINGS-0.12 §1 (`A1` baca) & §2 (`A2` tulis).
 *
 * Delapan Menu setelan berbagi SATU pintu baca dan SATU pintu tulis — pembedanya hanya subset
 * `setup_code` yang tiap layar render/kirim. Katalog kode Waktu mengikuti `TSD-001-TIME-1.23`.
 */

export type SettingsMenuId = 'time' | 'employee';

export type SettingsRole =
  'ROLE_SUPER_ADMIN' | 'ROLE_HR_MANAGER' | 'ROLE_HR_STAFF' | 'ROLE_FINANCE_OFFICER' | 'ROLE_EMPLOYEE';

export interface SettingsActor {
  id: string;
  label: string;
  role: SettingsRole;
}

/** Kelas jawaban `A1`: PENUH (nilai + penawaran), R‡ (penawaran di-omit), atau nol akses (403). */
export type AccessClass = 'FULL' | 'READ' | 'NONE';

export type SetupValue = number | string;

export type SetupOptions =
  { jenis: 'INTERVAL'; min?: number; max?: number; satuan?: string } | { jenis: 'DAFTAR'; pilihan: string[] };

/** Baris `A1`. `setupOptions` absen (undefined) = di-omit untuk kelas R‡; `null` = penawaran belum tersusun. */
export interface SettingRow {
  setupCode: string;
  setupValue: SetupValue[] | null;
  setupOptions?: SetupOptions | null;
  description: string | null;
  label: string | null;
  isRetired: boolean;
}

export interface SettingChange {
  setupCode: string;
  setupValue: SetupValue[];
}

/** Baris jawaban `A2` sukses — `changed:false` ⇒ `versionNumber:null`. */
export interface SettingWriteRow {
  setupCode: string;
  setupValue: SetupValue[];
  versionNumber: number | null;
  changed: boolean;
  updatedAt: string;
}

export type SettingErrorCode =
  | 'SETUP_CODE_LOCKED'
  | 'FORBIDDEN'
  | 'SETUP_CODE_UNKNOWN'
  | 'SETUP_PREFIX_UNREGISTERED'
  | 'SETUP_VALUE_NOT_OFFERED'
  | 'VALIDATION_ERROR';

export interface SettingRowError {
  field: string;
  code: SettingErrorCode;
  message: string;
}

/** Galat `A2` — seluruh baris ditolak dilaporkan sekaligus; status tingkat atas = kode paling keras. */
export class SettingsWriteError extends Error {
  status: number;
  code: SettingErrorCode;
  errors: SettingRowError[];

  constructor(status: number, code: SettingErrorCode, errors: SettingRowError[], message: string) {
    super(message);
    this.name = 'SettingsWriteError';
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}
