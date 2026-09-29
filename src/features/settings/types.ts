/**
 * System › Settings — FSD-001-SETTINGS-0.21 (10 Menu) · UIC-001-SETTINGS-0.12 (`A1`/`A2`/`A3`/`A5`–`A7`).
 *
 * Delapan Menu setelan berbagi SATU pintu baca dan SATU pintu tulis — pembedanya hanya subset
 * `setup_code` yang tiap layar render/kirim. Menu 9 (Riwayat Perubahan) membaca baris versi lintas-setelan;
 * Menu 10 (Permintaan Penghapusan Data) satu-satunya cerita Insert + Read di settings-service.
 */

export type SettingsMenuId =
  'time' | 'finance' | 'payroll' | 'performance' | 'productivity' | 'document' | 'organization' | 'employee';

export type SettingsRole =
  | 'ROLE_SUPER_ADMIN'
  | 'ROLE_HR_MANAGER'
  | 'ROLE_HR_STAFF'
  | 'ROLE_FINANCE_OFFICER'
  | 'ROLE_PAYROLL_OFFICER'
  | 'ROLE_DEPARTMENT_MANAGER'
  | 'ROLE_SYSTEM_ADMIN'
  | 'ROLE_EMPLOYEE';

export interface SettingsActor {
  id: string;
  label: string;
  role: SettingsRole;
  /** Identitas pengubah yang tercatat di baris versi (`created_by{nama,nik}`). */
  nama: string;
  nik: string;
}

/** Kelas jawaban `A1`: PENUH (nilai + penawaran), R‡ (penawaran di-omit), atau nol akses (403). */
export type AccessClass = 'FULL' | 'READ' | 'NONE';

export type SetupValue = number | string;

/**
 * Penawaran. `DAFTAR` dengan `pilihan: []` = enum bernama yang pilihannya belum disusun pemilik makna
 * (FSD §2.8) — layar hanya merender nilai berlaku, tidak mengarang pilihan lain.
 */
export type SetupOptions =
  { jenis: 'INTERVAL'; min?: number; max?: number; satuan?: string } | { jenis: 'DAFTAR'; pilihan: string[] };

/** Medan turunan `A1` (TSD §9.1.4.2) — jenis kekosongan nilai, dibaca apa adanya, bukan disimpulkan layar. */
export type KeadaanNilai = 'BERLAKU' | 'SENGAJA_KOSONG' | 'BAWAAN_SEMENTARA' | 'WAJIB_BERSYARAT';

export interface Jangkauan {
  modul: string;
  gerbang: string;
}

/** Baris `A1`. `setupOptions` absen (undefined) = di-omit untuk kelas R‡; `null` = penawaran belum tersusun. */
export interface SettingRow {
  setupCode: string;
  setupValue: SetupValue[] | null;
  setupOptions?: SetupOptions | null;
  description: string | null;
  label: string | null;
  isRetired: boolean;
  keadaanNilai?: KeadaanNilai;
  /** Wajib terisi bila `keadaanNilai = WAJIB_BERSYARAT` — nama key pasangannya. */
  pasanganKey?: string | null;
  /** Hanya kelas PENUH; deretan kosong = belum terdokumentasi pemilik makna, bukan nol dampak. */
  jangkauan?: Jangkauan[];
}

export interface SettingChange {
  setupCode: string;
  setupValue: SetupValue[];
  /** Hanya sah pada baris berpola R/O/D (Menu Organisasi) — transisi ke `DISABLED`. */
  confirmTransition?: boolean;
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
  | 'VALIDATION_ERROR'
  | 'ASSIGNMENT_GAP_BLOCKS_REQUIRED'
  | 'INTERNAL_ERROR';

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

/* ── Menu 9 · Riwayat Perubahan (`A3`) ─────────────────────────────────────────────────────── */

/** Sembilan modul pada chip penyaring — delapan Menu setelan + baris milik platform. */
export type HistoryModule = SettingsMenuId | 'platform';

export interface VersionRow {
  id: string;
  setupCode: string;
  versionNumber: number;
  setupValue: SetupValue[];
  /** `null` tepat di `versionNumber = 1` — dihitung server. */
  previousSetupValue: SetupValue[] | null;
  createdAt: string;
  createdBy: { nama: string; nik: string };
  isSystemActor: boolean;
  isAnonymizedActor: boolean;
  /** Status TERKINI kunci `setup_code` (bukan snapshot) — lencana TERKUNCI. */
  isLocked: boolean;
}

export interface VersionSearch {
  setupCode?: string;
  setupCodePrefixes?: string[];
  createdByEmployeeId?: string;
  isSystemActor?: boolean;
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
  sortBy?: 'created_at' | 'version_number' | 'setup_code';
  sortDirection?: 'ASC' | 'DESC';
}

export interface Paged<T> {
  data: T[];
  totalData: number;
  totalPage: number;
  currentPage: number;
  size: number;
}

/* ── Menu 10 · Permintaan Penghapusan Data (`A5`/`A6`/`A7`) ─────────────────────────────────── */

export type ErasureStatus = 'REQUESTED' | 'IN_PROGRESS' | 'COMPLETED';
export type ProgressStatus = 'PENDING' | 'HELD' | 'COMPLETED';

export interface ErasureProgress {
  serviceCode: string;
  progressStatus: ProgressStatus;
  broadcastCount: number;
  lastBroadcastAt: string | null;
  completedAt: string | null;
}

/** Baris `A6` — ringkasan angka; rincian pelacak dijawab `A7`. */
export interface ErasureRow {
  id: string;
  employeeId: string;
  /** Medan SUBJEK, ditukar dari authz saat respons disusun — fail-open (boleh null). */
  nama: string | null;
  nik: string | null;
  requestStatus: ErasureStatus;
  requestedAt: string;
  requestedAtTimezone: string;
  completedAt: string | null;
  createdAt: string;
  /** Medan PENCATAT — tidak pernah null, tidak pernah disamarkan. */
  createdBy: { nama: string; nik: string };
  totalService: number;
  completedService: number;
  heldService: number;
}

export interface ErasureDetail extends Omit<ErasureRow, 'totalService' | 'completedService' | 'heldService'> {
  progress: ErasureProgress[];
}

export interface ErasureDraft {
  employeeId: string;
  requestedAt: string;
  requestedAtTimezone: string;
}

export interface ErasureSearch {
  requestStatus?: ErasureStatus;
  requestedAtFrom?: string;
  requestedAtTo?: string;
  employeeId?: string;
  page?: number;
  size?: number;
}

/** Subjek dari PICKER employee-service — penyaring `employment_status IN` (mantan karyawan ikut). */
export interface ErasureSubject {
  employeeId: string;
  nama: string;
  nik: string;
  employmentStatus: 'ACTIVE' | 'RESIGNED' | 'TERMINATED';
}
