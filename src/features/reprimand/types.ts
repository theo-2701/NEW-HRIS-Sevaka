import type { SelectOption } from '@/components/form/SelectField';

/**
 * Reprimand — surat peringatan lewat alur maker→checker (FSD §6 · UIC §7).
 *
 * Aturan kontrak yang mengikat:
 *  • **Snapshot server-authoritative** — klien TIDAK pernah mengirim
 *    `point` / `validity` / `level_order` / `is_terminal`; server membekukannya
 *    dari konfigurasi saat penerbitan.
 *  • **checker ≠ maker ≠ subjek** — tiga peran harus orang berbeda.
 *  • `reason` bersifat **PII**: disembunyikan di grid lintas-subjek.
 *  • Standing **diturunkan saat dibaca** dari snapshot yang beku, bukan dari
 *    konfigurasi yang berlaku sekarang.
 */
export type ReprimandStatus = 'IN_APPROVAL' | 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'CANCELLED';

/** Potret konfigurasi kategori yang dibekukan di baris reprimand. */
export interface CategorySnapshot {
  code: string;
  label: string;
  /** Poin demerit — dipakai mode ACCUMULATIVE. */
  point: number;
  validityMonths: number;
  levelOrder: number;
  terminal: boolean;
}

export interface Reprimand {
  id: string;
  employeeId: string;
  employeeName: string;
  unit: string;
  categoryCode: string;
  /** Beku sejak diterbitkan — tidak ikut berubah saat konfigurasi diubah. */
  snapshot: CategorySnapshot;
  issuedDate: string;
  expiryDate: string;
  status: ReprimandStatus;
  maker: string;
  /** PII — hanya tampil di layar detail, tidak pernah di grid lintas-subjek. */
  reason: string;
  documentId?: string;
  checkerNote?: string;
}

export interface ReprimandDraft {
  employeeId: string;
  categoryCode: string;
  issuedDate: string;
  reason: string;
  documentName: string;
}

/** Konfigurasi kategori (`cnf_reprimand_category`) — CRU, tanpa hard-delete. */
export interface ReprimandCategory {
  code: string;
  label: string;
  point: number;
  validityMonths: number;
  levelOrder: number;
  terminal: boolean;
  active: boolean;
}

/** Mode kebijakan standing (`cnf_reprimand_policy`) — satu mode per perusahaan. */
export type PolicyMode = 'DIRECT' | 'ACCUMULATIVE';

export const STATUS_LABEL: Record<ReprimandStatus, string> = {
  IN_APPROVAL: 'In approval',
  ACTIVE: 'Active',
  EXPIRED: 'Expired',
  REVOKED: 'Revoked',
  CANCELLED: 'Cancelled',
};

export const EMPLOYEE_OPTIONS: SelectOption[] = [
  { value: 'emp-eka', label: 'Eka Saputra — Staff Finance, BR-Papua' },
  { value: 'emp-dimas', label: 'Dimas Prabowo — Backend Engineer, HQ' },
  { value: 'emp-nadia', label: 'Nadia Rahman — Sales Executive, BR-Surabaya' },
  { value: 'emp-fajar', label: 'Fajar Nugroho — Ops Coordinator, BR-Jakarta' },
];

export type StandingLevel = 'CLEAN' | 'SP1' | 'SP2' | 'FINAL';

export interface Standing {
  employeeId: string;
  employeeName: string;
  unit: string;
  /** Jumlah poin dari reprimand yang masih aktif. */
  points: number;
  /** Level tertinggi dari snapshot aktif — dipakai mode DIRECT. */
  highestLevel: number;
  level: StandingLevel;
  latestIssuedDate: string;
}

export const STANDING_LABEL: Record<StandingLevel, string> = {
  CLEAN: 'Clean',
  SP1: 'Level SP1',
  SP2: 'Level SP2',
  FINAL: 'Final warning',
};

/** Reprimand yang sedang berlaku — hanya ini yang membentuk standing. */
export function isEffective(row: Reprimand): boolean {
  return row.status === 'ACTIVE';
}

/**
 * Menurunkan level standing dari snapshot yang aktif.
 *
 * DIRECT: level = urutan level tertinggi yang aktif.
 * ACCUMULATIVE: level dijumlahkan dari poin demerit terhadap ambang 1/2/3.
 * Snapshot terminal selalu mengunci ke Final warning, apa pun modenya.
 */
export function deriveLevel(
  mode: PolicyMode,
  input: { points: number; highestLevel: number; terminal: boolean },
): StandingLevel {
  if (input.terminal) return 'FINAL';

  const score = mode === 'ACCUMULATIVE' ? input.points : input.highestLevel;
  if (score >= 3) return 'FINAL';
  if (score === 2) return 'SP2';
  if (score === 1) return 'SP1';
  return 'CLEAN';
}

export function labelOf(options: SelectOption[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

/** Aktor yang sedang login — dipakai untuk aturan checker ≠ maker ≠ subjek. */
export const CURRENT_USER = { id: 'emp-tony', name: 'Tony Stark' };
