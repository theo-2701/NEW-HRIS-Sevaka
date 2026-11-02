import type { TaskSide, TransitionType } from '@/features/transitions/types';

/**
 * Materialization — setup paket tugas transisi (TSD-001-EMPLOYEE 0.212 §7.23) dan
 * penanda role materialisasi (§7.23.10). Simpan = versi baru; transisi yang sudah
 * berjalan memakai versi yang dibekukan saat lahir.
 */
export type SetupStatus = 'COMPLETE' | 'UNDERSTAFFED' | 'INCOMPLETE';
export type SetupType = Exclude<TransitionType, never>;

export interface SetupTask {
  code: string;
  name: string;
  /** RELINQUISH = bagian OUT/Keluar, PROVISION = bagian IN/Masuk. */
  side: Exclude<TaskSide, 'NONE'>;
  durationDays: number;
  approvalRequired: boolean;
  twoParty: boolean;
  /** Item bawaan "SEVAKA HRIS access" — tidak bisa diubah/dihapus. */
  locked: boolean;
  handlers: string[];
  approvers: string[];
}

export interface MaterializationSetup {
  setupId: string;
  type: SetupType;
  /** null = semua subtipe. */
  subtype: string | null;
  /** null = setup bawaan perusahaan. */
  branch: string | null;
  isCompanyDefault: boolean;
  outFirstGate: boolean;
  status: SetupStatus;
  version: number;
  updatedAt: string;
  updatedBy: string;
  tasks: SetupTask[];
}

export interface SetupAudit {
  setupId: string;
  version: number;
  at: string;
  by: string;
  summary: string;
}

export interface MaterializeRole {
  accessId: string;
  accessCode: string;
  accessName: string;
  isMaterialize: boolean;
  updatedAt: string;
}

export const SETUP_STATUS_LABEL: Record<SetupStatus, string> = {
  COMPLETE: 'Complete',
  UNDERSTAFFED: 'Understaffed',
  INCOMPLETE: 'Incomplete',
};

/** Minimal petugas (dan penyetuju bila wajib) per tugas — §7.23.3. */
export const MIN_ASSIGNEES = 2;
