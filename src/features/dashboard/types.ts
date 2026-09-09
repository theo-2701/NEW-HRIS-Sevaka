export interface GenderSlice {
  label: string;
  value: number;
  color: string;
}

export interface SeriesPoint {
  label: string;
  value: number;
}

export interface JobLevelSlice {
  label: string;
  count: number;
  percent: number;
  color: string;
}

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
  gender: GenderSlice[];
  staffActive: SeriesPoint[];
  turnover: SeriesPoint[];
  jobLevels: JobLevelSlice[];
  totalEmployees: number;
  leave: LeaveBalance;
  whosOff: WhosOffEntry[];
  lockedAccounts: LockedAccount[];
  contracts: ContractRow[];
}
