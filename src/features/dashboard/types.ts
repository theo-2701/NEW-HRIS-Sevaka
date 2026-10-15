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

export interface LockedAccount {
  id: string;
  name: string;
  username: string;
  email: string;
  lockedAt: string;
  failedAttempts: number;
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

export type MyRequestKind = 'LEAVE' | 'OVERTIME' | 'CLAIM' | 'CASH_ADVANCE' | 'LOAN';

/** Satu pengajuan milik pemanggil di panel "Pengajuan saya" — dinormalkan dari lima modul. */
export interface MyRequest {
  id: string;
  kind: MyRequestKind;
  title: string;
  detail: string;
  statusLabel: string;
  tone: 'ok' | 'warn' | 'err' | 'mute';
  /** Belum final (menunggu keputusan, atau disetujui tapi masih berjalan mis. belum dipertanggungjawabkan). */
  open: boolean;
  submittedAt: string;
  /** Halaman modul tempat pengajuan dikelola. */
  to: string;
  /** Pengajuan ini menuntut tindakan SAYA — ikut dihitung di "Perlu tindak lanjut" (tugas pribadi). */
  todo?: MyRequestTodo;
}

export type MyRequestTodo = 'ACK_LOAN' | 'SETTLE_ADVANCE' | 'RESUBMIT_CLAIM';

export interface MyRequests {
  rows: MyRequest[];
  /** Ada sumber yang gagal dimuat — panel tetap tampil, kosong-berketerangan untuk sisanya. */
  partial: boolean;
}

/** Bagian `GET /api/v1/auth/me` yang dipakai sapaan HOME. */
export interface AuthMe {
  fullName: string;
  nickname: string | null;
  role: string;
}
