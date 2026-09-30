/**
 * Productivity — FSD-001-PRODUCTIVITY-0.2 · UIC-001-PRODUCTIVITY-0.4 · TSD-001-PRODUCTIVITY-0.18.
 *
 * productivity-service tidak menghitung dan tidak membayar (PD-78/PD-41): seluruh layar hanya menampilkan menit,
 * nol nominal uang.
 */

export type ProdRole =
  'ROLE_EMPLOYEE' | 'ROLE_DEPT_MANAGER' | 'ROLE_HR_MANAGER' | 'ROLE_HR_STAFF' | 'ROLE_HEALTH_DATA_OFFICER';

export interface ProdEmployee {
  employeeId: string;
  name: string;
  nik: string;
  positionId: string;
  positionName: string;
  /** Atasan langsung — rantai `parent_id` untuk "atasan berjenjang". */
  supervisorId: string | null;
}

export interface ProdActor {
  employeeId: string;
  role: ProdRole;
  label: string;
}

export interface AuditRef {
  employeeId: string;
  name: string;
}

/* ── Project & Task (`FT1`) ────────────────────────────────────────────────────────────────── */

export type ProjectState = 'AKTIF' | 'ARSIP';

export interface Project {
  id: string;
  code: string;
  projectName: string;
  state: ProjectState;
  ownerEmployeeId: string;
  archivedAt: string | null;
  archivedAtTimezone: string | null;
  createdAt: string;
  updatedAt: string | null;
  /** Turunan tampilan grid — bukan medan kontrak. */
  memberCount: number;
  openTaskCount: number;
}

export interface ProjectMember {
  projectId: string;
  employeeId: string;
  isActive: boolean;
  createdAt: string;
}

export type TaskStatus = 'BELUM_DIKERJAKAN' | 'SEDANG_DIKERJAKAN' | 'TERTAHAN' | 'SELESAI' | 'DIBATALKAN';
export type TaskOrigin = 'DIBUAT_SENDIRI' | 'DITUGASKAN';
export type TaskPriority = 'RENDAH' | 'SEDANG' | 'TINGGI' | 'MENDESAK';

export interface Task {
  id: string;
  code: string;
  projectId: string | null;
  taskCategoryId: string | null;
  assigneeEmployeeId: string;
  assignerEmployeeId: string | null;
  taskOrigin: TaskOrigin;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  originalDueDate: string;
  taskTitle: string;
  description: string | null;
  createdAt: string;
  updatedAt: string | null;
  /** Kapan masuk keadaan akhir terakhir — jangkar jendela pembukaan-kembali. */
  closedAt: string | null;
}

export type TaskChangedField = 'STATUS' | 'DUE_DATE' | 'TASK_CATEGORY' | 'PARENT_PROJECT' | 'ASSIGNEE';

export interface TaskChange {
  id: string;
  taskId: string;
  changedField: TaskChangedField;
  oldValue: string | null;
  newValue: string | null;
  changeReason: string | null;
  createdBy: AuditRef;
  createdAt: string;
}

export interface TaskDraft {
  taskTitle: string;
  description: string;
  assigneeEmployeeId: string;
  projectId: string;
  taskCategoryId: string;
  priority: TaskPriority;
  dueDate: string;
}

export interface TaskPatch {
  taskTitle?: string;
  description?: string | null;
  priority?: TaskPriority;
  taskCategoryId?: string | null;
  projectId?: string | null;
  assigneeEmployeeId?: string;
  dueDate?: string;
  status?: TaskStatus;
  changeReason?: string;
}

export type TaskScope = 'MINE' | 'ASSIGNED_BY_ME' | 'TEAM' | 'ALL';

export interface TaskSearch {
  scope: TaskScope;
  keyword?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  projectId?: string;
  taskCategoryId?: string;
}

export interface TaskCategory {
  id: string;
  categoryName: string;
  isActive: boolean;
  createdAt: string;
  /** Pernah dipakai `emp_task` (termasuk task lama) — hapus permanen ditolak 409. */
  inUse: boolean;
}
