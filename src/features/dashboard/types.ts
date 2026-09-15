export interface LeaveBalance {
  annualLeaveDays: number;
  sickLeaveUsedDays: number;
}

export interface LockedAccount {
  id: string;
  name: string;
  username: string;
  email: string;
  lockedAt: string;
  failedAttempts: number;
}

export interface WhosOffEntry {
  id: string;
  name: string;
  reason: string;
}

export type ContractStatus = 'PROBATION' | 'CONTRACT' | 'PERMANENT';

export interface ContractRow {
  id: string;
  employee: string;
  employeeId: string;
  status: ContractStatus;
  endDate: string;
  duration: string;
}

export interface DashboardSummary {
  leave: LeaveBalance;
  whosOff: WhosOffEntry[];
  lockedAccounts: LockedAccount[];
  contracts: ContractRow[];
}

/** Nilai lima kartu HOME dua lapis (FSD-AUTH §2.9). `null` = kartu gagal/kosong. */
export interface HomeStats {
  periodYear: number;
  leaveBalanceDays: number | null;
  /** `yyyy-MM` */
  month: string;
  presentDays: number | null;
  activeEmployees: number | null;
  workDate: string;
  presentToday: number | null;
  onLeaveToday: number | null;
}

/** Bagian `GET /api/v1/auth/me` yang dipakai sapaan HOME. */
export interface AuthMe {
  fullName: string;
  nickname: string | null;
  role: string;
}
