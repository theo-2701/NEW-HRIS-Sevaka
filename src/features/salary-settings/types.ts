import type { ApprovalState } from '@/features/payroll-authorization/types';

/**
 * Payroll › Salary Settings (Setelan Gaji) — kontrak FSD-001-PAYROLL §3 · UIC-001-PAYROLL §4 ·
 * TSD-001-PAYROLL-0.25 §15.1 · ERD §6.1–§6.4.
 *
 * Menu milik Penjalan (`ROLE_PAYROLL_OFFICER`): menyusun katalog komponen, mengajukan perubahan
 * nilai, dan menyusun kumpulan perubahan massal. Keputusannya ada di Authorization & Handover.
 */

export type Role = 'ROLE_PAYROLL_OFFICER' | 'ROLE_HR_MANAGER';

export interface Actor {
  employeeId: string;
  role: Role;
}

/** `source_channel` (ERD §6.2). */
export type SourceChannel = 'ONBOARDING' | 'CHANGE' | 'BULK_CHANGE' | 'HISTORY_IMPORT';

/** Baris `ver_emp_salary_component` yang sudah berlaku — riwayat nilai per karyawan. */
export interface EmployeeValue {
  id: string;
  employeeId: string;
  salaryComponentId: string;
  amount: number;
  effectiveFrom: string;
  effectiveUntil: string | null;
  approvalState: ApprovalState;
  sourceChannel: SourceChannel;
}

/** Baris riwayat + turunan `is_current` (tidak disimpan, dihitung saat dibaca). */
export interface EmployeeValueRow extends EmployeeValue {
  isCurrent: boolean;
}

/** `check_point` pemeriksaan UMP (ERD §6.3). */
export type UmpCheckPoint = 'PENETAPAN_ATAU_PERUBAHAN' | 'PERIODE_DIJALANKAN';

/** Daftar tertutup alasan gaji di bawah UMP. */
export type UmpReason = 'USAHA_MIKRO_KECIL' | 'PESERTA_PEMAGANGAN' | 'PEKERJA_PARUH_WAKTU' | 'LAINNYA';

/** `log_salary_ump_attestation` — nol endpoint tulis; barisnya efek samping pengajuan. */
export interface UmpAttestation {
  id: string;
  employeeId: string;
  checkPoint: UmpCheckPoint;
  regionalWageCompared: number;
  salaryBaseCompared: number;
  isBelowUmp: boolean;
  selectedReason: UmpReason | null;
  reasonNote: string | null;
  periodId: string | null;
  createdBy: string;
  createdAt: string;
}

export interface ComponentDraft {
  componentCode: string;
  componentName: string;
  isFixed: boolean;
  /** Dikosongkan berarti mengikuti `isFixed` (diturunkan server). */
  isOvertimeBasis: boolean | null;
  isTaxable: boolean;
  isBpjsDeductible: boolean;
}

/** Minimal satu sifat wajib berbeda dari sifat aktifnya. */
export interface TraitProposalInput {
  isFixed: boolean;
  isOvertimeBasis: boolean;
  isTaxable: boolean;
  isBpjsDeductible: boolean;
}

export interface ValueProposalInput {
  employeeId: string;
  salaryComponentId: string;
  amount: string;
  /** Wajib bila gaji dasar setelah perubahan jatuh di bawah UMP cabang. */
  umpReason: UmpReason | '';
  umpNote: string;
}

export interface BatchItemInput {
  employeeId: string;
  salaryComponentId: string;
  amount: string;
}

export interface UmpFilter {
  employeeId?: string;
  checkPoint?: UmpCheckPoint;
  belowOnly?: boolean;
}

export interface ComponentFilter {
  search?: string;
  proposalStates?: ('AKTIF' | 'MENUNGGU_PERSETUJUAN')[];
}

export const UMP_REASONS: UmpReason[] = [
  'USAHA_MIKRO_KECIL',
  'PESERTA_PEMAGANGAN',
  'PEKERJA_PARUH_WAKTU',
  'LAINNYA',
];

export const UMP_REASON_LABEL: Record<UmpReason, string> = {
  USAHA_MIKRO_KECIL: 'Usaha mikro / kecil',
  PESERTA_PEMAGANGAN: 'Peserta pemagangan',
  PEKERJA_PARUH_WAKTU: 'Pekerja paruh waktu',
  LAINNYA: 'Lainnya',
};

export const CHECK_POINT_LABEL: Record<UmpCheckPoint, string> = {
  PENETAPAN_ATAU_PERUBAHAN: 'PENETAPAN / PERUBAHAN',
  PERIODE_DIJALANKAN: 'PERIODE DIJALANKAN',
};

export const SOURCE_CHANNEL_LABEL: Record<SourceChannel, string> = {
  ONBOARDING: 'ONBOARDING',
  CHANGE: 'CHANGE',
  BULK_CHANGE: 'BULK CHANGE',
  HISTORY_IMPORT: 'HISTORY IMPORT',
};
