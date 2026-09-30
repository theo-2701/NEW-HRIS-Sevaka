import { PROD_EMPLOYEES } from '@/features/productivity/mock-data';
import type { ProdActor, ProdRole, TaskOrigin, TaskPriority, TaskStatus } from '@/features/productivity/types';

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
