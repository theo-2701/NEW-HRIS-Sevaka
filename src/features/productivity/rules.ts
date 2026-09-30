import { PROD_EMPLOYEES } from '@/features/productivity/mock-data';
import type {
  AudienceScope,
  CorrectionMode,
  FormState,
  IdentityMode,
  Obligation,
  ProdActor,
  ProdRole,
  TaskOrigin,
  TaskPriority,
  TaskStatus,
  QuestionType,
  TimesheetPeriodState,
  WorklogOrigin,
} from '@/features/productivity/types';

export const employeeOf = (employeeId: string | null | undefined) =>
  PROD_EMPLOYEES.find((row) => row.employeeId === employeeId);

export const nameOf = (employeeId: string | null | undefined) => employeeOf(employeeId)?.name ?? '—';

export const isHr = (role: ProdRole) => role === 'ROLE_HR_MANAGER' || role === 'ROLE_HR_STAFF';

/** Atasan berjenjang = siapa pun di rantai `parent_id` di atas karyawan itu (PD-9), bukan hanya atasan langsung. */
export function isSupervisorOf(supervisorId: string, employeeId: string): boolean {
  let cursor = employeeOf(employeeId)?.supervisorId ?? null;
  const seen = new Set<string>();
  while (cursor && !seen.has(cursor)) {
    if (cursor === supervisorId) return true;
    seen.add(cursor);
    cursor = employeeOf(cursor)?.supervisorId ?? null;
  }
  return false;
}

export const subordinatesOf = (supervisorId: string) =>
  PROD_EMPLOYEES.filter((row) => isSupervisorOf(supervisorId, row.employeeId));

/**
 * Diagram beku `task_status` (TSD-001-PRODUCTIVITY-0.18 §9.1–§9.5, dikoreksi PROB-SERVICE-298): BELUM tidak boleh
 * langsung TERTAHAN; pembukaan-kembali dari keadaan akhir hanya berpindah SELESAI ↔ DIBATALKAN, dalam jendela.
 */
export const TASK_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  BELUM_DIKERJAKAN: ['SEDANG_DIKERJAKAN', 'SELESAI', 'DIBATALKAN'],
  SEDANG_DIKERJAKAN: ['TERTAHAN', 'SELESAI', 'DIBATALKAN'],
  TERTAHAN: ['SEDANG_DIKERJAKAN', 'SELESAI', 'DIBATALKAN'],
  SELESAI: ['DIBATALKAN'],
  DIBATALKAN: ['SELESAI'],
};

export const isFinalStatus = (status: TaskStatus) => status === 'SELESAI' || status === 'DIBATALKAN';

/** `log_task_change` STATUS hanya untuk masuk/keluar TERTAHAN & pembukaan-kembali (PD-68). */
export const logsStatusChange = (from: TaskStatus, to: TaskStatus) =>
  from === 'TERTAHAN' || to === 'TERTAHAN' || isFinalStatus(from);

export const OPEN_STATUSES: TaskStatus[] = ['BELUM_DIKERJAKAN', 'SEDANG_DIKERJAKAN', 'TERTAHAN'];

export const STATUS_META: Record<TaskStatus, { label: string; tone: 'mute' | 'info' | 'warn' | 'ok' | 'err' }> = {
  BELUM_DIKERJAKAN: { label: 'Not started', tone: 'mute' },
  SEDANG_DIKERJAKAN: { label: 'In progress', tone: 'info' },
  TERTAHAN: { label: 'On hold', tone: 'warn' },
  SELESAI: { label: 'Done', tone: 'ok' },
  DIBATALKAN: { label: 'Cancelled', tone: 'err' },
};

export const PRIORITIES: TaskPriority[] = ['RENDAH', 'SEDANG', 'TINGGI', 'MENDESAK'];

export const PRIORITY_META: Record<TaskPriority, { label: string; tone: 'mute' | 'info' | 'warn' | 'err' }> = {
  RENDAH: { label: 'Low', tone: 'mute' },
  SEDANG: { label: 'Medium', tone: 'info' },
  TINGGI: { label: 'High', tone: 'warn' },
  MENDESAK: { label: 'Urgent', tone: 'err' },
};

export const ORIGIN_LABEL: Record<TaskOrigin, string> = { DIBUAT_SENDIRI: 'self-created', DITUGASKAN: 'assigned' };

/** Menit apa adanya → "4 h 0 m" — nol pembulatan (PD-25). */
export const formatMinutes = (minutes: number | null | undefined) => {
  if (minutes === null || minutes === undefined) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h ${m} m` : `${m} m`;
};

/** Jendela `productivity.entry_window_days` sejak tanggal jangkar (inklusif hari ke-N). */
export function withinWindow(anchorIso: string, windowDays: number, now: Date = new Date()): boolean {
  const anchor = new Date(anchorIso.length <= 10 ? `${anchorIso}T00:00:00` : anchorIso);
  const limit = new Date(anchor);
  limit.setDate(limit.getDate() + windowDays);
  limit.setHours(23, 59, 59, 999);
  return now.getTime() <= limit.getTime();
}

/** Penugasan ke orang lain hanya oleh atasan berjenjang atau penanggung jawab Project (PD-13). */
export function canAssignTo(actor: ProdActor, assigneeId: string, projectOwnerId?: string | null): boolean {
  if (assigneeId === actor.employeeId) return true;
  if (isSupervisorOf(actor.employeeId, assigneeId)) return true;
  return Boolean(projectOwnerId && projectOwnerId === actor.employeeId);
}

type Tone = 'mute' | 'info' | 'warn' | 'ok' | 'err' | 'brand';

/** Tiga nilai `worklog_origin` — tiga warna, nol flatten (G3). */
export const ORIGIN_META: Record<WorklogOrigin, { label: string; tone: Tone }> = {
  DIUKUR_MESIN: { label: 'Timer', tone: 'info' },
  DIKETIK_MANUSIA: { label: 'Typed', tone: 'brand' },
  DIHENTIKAN_SISTEM: { label: 'Stopped by system', tone: 'err' },
};

export const CORRECTION_META: Record<CorrectionMode, { label: string; tone: Tone }> = {
  DIKOREKSI_PEMILIK: { label: 'Corrected by owner', tone: 'ok' },
  DITERIMA_ATASAN: { label: 'Accepted by supervisor', tone: 'brand' },
};

export const PERIOD_STATE_META: Record<TimesheetPeriodState, { label: string; tone: Tone; meaning: string }> = {
  BELUM_DIAJUKAN: {
    label: 'Not submitted',
    tone: 'mute',
    meaning: 'Hours are recorded but not submitted yet. Entries follow the normal entry window.',
  },
  MENUNGGU_PENGESAHAN: {
    label: 'Awaiting approval',
    tone: 'warn',
    meaning: 'Submitted and frozen while the approval process runs. Only the approval result can move it on.',
  },
  DIKEMBALIKAN: {
    label: 'Returned',
    tone: 'err',
    meaning: 'Rejected, or reopened by the direct supervisor or HR. The owner can fix entries and submit again.',
  },
  DISAHKAN: {
    label: 'Approved',
    tone: 'ok',
    meaning: 'Approved. It becomes permanent once payroll confirms it has used the hours.',
  },
};

/* ── Forms & Survey ─────────────────────────────────────────────────────────────────────────── */

export const IDENTITY_META: Record<IdentityMode, { label: string; tone: Tone }> = {
  BER_IDENTITAS: { label: 'Named', tone: 'info' },
  ANONIM: { label: 'Anonymous', tone: 'brand' },
};

export const OBLIGATION_META: Record<Obligation, { label: string; tone: Tone }> = {
  WAJIB: { label: 'Mandatory', tone: 'warn' },
  SUKARELA: { label: 'Voluntary', tone: 'mute' },
};

export const AUDIENCE_LABEL: Record<AudienceScope, string> = {
  SELURUH_KARYAWAN: 'All employees',
  PER_BAGIAN: 'By position',
};

export const FORM_STATE_META: Record<FormState, { label: string; tone: Tone }> = {
  TERBUKA: { label: 'Open', tone: 'ok' },
  DITUTUP: { label: 'Closed', tone: 'mute' },
};

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  PILIHAN_SATU: 'Single choice',
  PILIHAN_BANYAK: 'Multiple choice',
  ISIAN_TEKS: 'Text',
  ANGKA: 'Number',
  TANGGAL: 'Date',
};

/** Posisi struktural yang dikenal dataset — sumber pemilih audiens PER_BAGIAN (company.cnf_group_struct_pos). */
export const POSITIONS = PROD_EMPLOYEES.filter(
  (row, index, list) => list.findIndex((item) => item.positionId === row.positionId) === index,
).map((row) => ({ value: row.positionId, label: row.positionName }));
