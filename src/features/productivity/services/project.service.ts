import { api, ApiError } from '@/services/api';
import { MOCK } from '@/services/mock';
import { settingsService } from '@/features/settings/services/settings.service';
import {
  CATEGORY_SEED,
  MEMBER_SEED,
  PROJECT_SEED,
  TASK_CHANGE_SEED,
  TASK_SEED,
} from '@/features/productivity/mock-data';
import {
  canAssignTo,
  isFinalStatus,
  isHr,
  isSupervisorOf,
  logsStatusChange,
  nameOf,
  OPEN_STATUSES,
  TASK_TRANSITIONS,
  withinWindow,
} from '@/features/productivity/rules';
import { prodClock } from '@/features/productivity/services/clock';
import { camelize, newIdempotencyKey, snakeize } from '@/features/productivity/services/wire';
import type { WirePage } from '@/features/productivity/services/wire';
import type {
  ProdActor,
  Project,
  ProjectMember,
  ProjectState,
  Task,
  TaskCategory,
  TaskChange,
  TaskChangedField,
  TaskDraft,
  TaskPatch,
  TaskSearch,
} from '@/features/productivity/types';

/**
 * API service Project & Task — UIC-001-PRODUCTIVITY-0.4 §2 (`FT1.01`–`FT1.18`).
 *
 *   /projects (+ /search, /{id}, /{id}/members)  — owner atau HR mengubah; arsip digerbangi task terbuka
 *   /tasks    (+ /search, /{id}, /{id}/history)  — `task_origin` ditentukan server; transisi status beku
 *   /task-categories                            — master HR-only; hapus ditolak bila pernah dipakai
 */
const delay = (ms = 220) => new Promise((resolve) => setTimeout(resolve, ms));

type StoredProject = Omit<Project, 'memberCount' | 'openTaskCount'> & { deletedAt: string | null };
type StoredCategory = Omit<TaskCategory, 'inUse'>;

let projects: StoredProject[] = [];
let members: ProjectMember[] = [];
let tasks: Task[] = [];
let changes: TaskChange[] = [];
let categories: StoredCategory[] = [];
let seq = { project: 3, task: 4, change: 2, category: 6 };

export function resetProjectMocks() {
  projects = PROJECT_SEED.map((row) => ({ ...row }));
  members = MEMBER_SEED.map((row) => ({ ...row }));
  tasks = TASK_SEED.map((row) => ({ ...row }));
  changes = TASK_CHANGE_SEED.map((row) => ({ ...row, createdBy: { ...row.createdBy } }));
  categories = CATEGORY_SEED.map((row) => ({ ...row }));
  seq = { project: 3, task: 4, change: 2, category: 6 };
}
resetProjectMocks();

const fail = (status: number, code: string, message: string): never => {
  throw new ApiError(message, status, code);
};
const pad = (n: number) => String(n).padStart(4, '0');
const nowIso = () => prodClock.now().toISOString();
const entryWindowDays = () => settingsService.numberValue('productivity.entry_window_days', 7);

const withCounts = (row: StoredProject): Project => {
  const { deletedAt: _deleted, ...rest } = row;
  void _deleted;
  return {
    ...rest,
    memberCount: members.filter((item) => item.projectId === row.id && item.isActive).length,
    openTaskCount: tasks.filter((task) => task.projectId === row.id && OPEN_STATUSES.includes(task.status)).length,
  };
};

const findProject = (id: string) =>
  projects.find((row) => row.id === id && !row.deletedAt) ?? fail(404, 'NOT_FOUND', 'Proyek tidak ditemukan.');

const requireOwnerOrHr = (actor: ProdActor, project: StoredProject) => {
  if (project.ownerEmployeeId !== actor.employeeId && !isHr(actor.role))
    fail(403, 'PROD_NOT_OBJECT_OWNER', 'Hanya pemilik proyek atau HR yang dapat mengubah proyek ini.');
};

const canSeeProject = (actor: ProdActor, project: StoredProject) =>
  isHr(actor.role) ||
  project.ownerEmployeeId === actor.employeeId ||
  members.some((row) => row.projectId === project.id && row.employeeId === actor.employeeId && row.isActive);

const findTask = (id: string) => tasks.find((row) => row.id === id) ?? fail(404, 'NOT_FOUND', 'Task tidak ditemukan.');

/** Rezim baca 4-tingkat: self · atasan berjenjang · HR · anggota Project. */
const canReadTask = (actor: ProdActor, task: Task) =>
  task.assigneeEmployeeId === actor.employeeId ||
  task.assignerEmployeeId === actor.employeeId ||
  isSupervisorOf(actor.employeeId, task.assigneeEmployeeId) ||
  isHr(actor.role) ||
  Boolean(
    task.projectId &&
    members.some((row) => row.projectId === task.projectId && row.employeeId === actor.employeeId && row.isActive),
  );

function logChange(
  actor: ProdActor,
  task: Task,
  field: TaskChangedField,
  oldValue: string | null,
  newValue: string | null,
  reason?: string,
) {
  seq.change += 1;
  changes.push({
    id: `lg-${pad(seq.change)}`,
    taskId: task.id,
    changedField: field,
    oldValue,
    newValue,
    changeReason: reason?.trim() || null,
    createdBy: { employeeId: actor.employeeId, name: nameOf(actor.employeeId) },
    createdAt: nowIso(),
  });
}

export const projectService = {
  /* ── Project ─────────────────────────────────────────────────────────────── */

  /** `FT1.04` — grid proyek per `state`; urut `created_at` terbaru. */
  async projects(actor: ProdActor, state: ProjectState, keyword = ''): Promise<Project[]> {
    if (MOCK) {
      await delay();
      const term = keyword.trim().toLowerCase();
      return projects
        .filter((row) => !row.deletedAt && row.state === state && canSeeProject(actor, row))
        .filter((row) => !term || `${row.code} ${row.projectName}`.toLowerCase().includes(term))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(withCounts);
    }
    const { data } = await api.post(
      '/projects/search',
      snakeize({ filters: { state, projectName: keyword || undefined } }),
    );
    return camelize<WirePage<Project>>(data).data;
  },

  /** `FT1.02` */
  async project(actor: ProdActor, id: string): Promise<Project> {
    if (MOCK) {
      await delay(150);
      const row = findProject(id);
      if (!canSeeProject(actor, row)) fail(403, 'PROD_NOT_OBJECT_OWNER', 'Anda tidak memiliki akses ke proyek ini.');
      return withCounts(row);
    }
    const { data } = await api.get(`/projects/${id}`);
    return camelize<Project>(data);
  },

  /** `FT1.01` — `owner_employee_id` & `state=AKTIF` diisi sistem, bukan klien. */
  async createProject(actor: ProdActor, projectName: string): Promise<Project> {
    if (MOCK) {
      await delay(300);
      if (!projectName.trim()) fail(422, 'VALIDATION_ERROR', 'Nama proyek wajib diisi.');
      if (projectName.trim().length > 150) fail(422, 'VALIDATION_ERROR', 'Nama proyek maksimal 150 karakter.');
      seq.project += 1;
      const row: StoredProject = {
        id: `c1000000-0000-7000-8000-${String(seq.project).padStart(12, '0')}`,
        code: `PRJ-${pad(seq.project)}`,
        projectName: projectName.trim(),
        state: 'AKTIF',
        ownerEmployeeId: actor.employeeId,
        archivedAt: null,
        archivedAtTimezone: null,
        createdAt: nowIso(),
        updatedAt: null,
        deletedAt: null,
      };
      projects.push(row);
      return withCounts(row);
    }
    const { data } = await api.post(
      '/projects',
      { project_name: projectName },
      { headers: { 'Idempotency-Key': newIdempotencyKey() } },
    );
    return camelize<Project>(data);
  },

  /**
   * `FT1.03` — ubah nama/`state`. Arsip hanya lolos bila nol task terbuka (422); reopen bebas gerbang dan
   * mengosongkan `archived_at`. Mesin tidak pernah mengubah status task diam-diam (PD-21).
   */
  async updateProject(actor: ProdActor, id: string, patch: { projectName?: string; state?: ProjectState }) {
    if (MOCK) {
      await delay(280);
      const row = findProject(id);
      requireOwnerOrHr(actor, row);
      if (patch.projectName !== undefined && !patch.projectName.trim())
        fail(422, 'VALIDATION_ERROR', 'Nama proyek tidak boleh kosong.');
      if (patch.state === 'ARSIP' && row.state === 'AKTIF') {
        const open = tasks.filter((task) => task.projectId === id && OPEN_STATUSES.includes(task.status));
        if (open.length)
          fail(
            422,
            'PROD_PROJECT_ARCHIVE_HAS_OPEN_TASK',
            `Masih ada ${open.length} task berstatus BELUM_DIKERJAKAN/SEDANG_DIKERJAKAN/TERTAHAN di dalam proyek ini (${open.map((task) => task.code).join(', ')}).`,
          );
        row.state = 'ARSIP';
        row.archivedAt = nowIso();
        row.archivedAtTimezone = 'Asia/Jakarta';
      } else if (patch.state === 'AKTIF' && row.state === 'ARSIP') {
        row.state = 'AKTIF';
        row.archivedAt = null;
        row.archivedAtTimezone = null;
      }
      if (patch.projectName !== undefined) row.projectName = patch.projectName.trim();
      row.updatedAt = nowIso();
      return withCounts(row);
    }
    const { data } = await api.patch(`/projects/${id}`, snakeize(patch));
    return camelize<Project>(data);
  },

  /** `FT1.05` — soft-delete standar, nol gerbang bisnis khusus. */
  async deleteProject(actor: ProdActor, id: string): Promise<void> {
    if (MOCK) {
      await delay(250);
      const row = findProject(id);
      requireOwnerOrHr(actor, row);
      row.deletedAt = nowIso();
      return;
    }
    await api.delete(`/projects/${id}`);
  },

  /** `FT1.07` — hanya anggota `is_active=true`. */
  async members(projectId: string): Promise<ProjectMember[]> {
    if (MOCK) {
      await delay(150);
      return members.filter((row) => row.projectId === projectId && row.isActive).map((row) => ({ ...row }));
    }
    const { data } = await api.get(`/projects/${projectId}/members`);
    return camelize<{ data: ProjectMember[] }>(data).data;
  },

  /** `FT1.06` — upsert idempoten: baru 201, dipulihkan 200, sudah aktif no-op 200 (bukan 409). */
  async addMember(actor: ProdActor, projectId: string, employeeId: string): Promise<'CREATED' | 'RESTORED' | 'NOOP'> {
    if (MOCK) {
      await delay(200);
      requireOwnerOrHr(actor, findProject(projectId));
      const existing = members.find((row) => row.projectId === projectId && row.employeeId === employeeId);
      if (!existing) {
        members.push({ projectId, employeeId, isActive: true, createdAt: nowIso() });
        return 'CREATED';
      }
      if (!existing.isActive) {
        existing.isActive = true;
        return 'RESTORED';
      }
      return 'NOOP';
    }
    const response = await api.post(`/projects/${projectId}/members`, { employee_id: employeeId });
    return response.status === 201 ? 'CREATED' : 'RESTORED';
  },

  /** `FT1.08` — menonaktifkan, bukan menghapus baris. */
  async removeMember(actor: ProdActor, projectId: string, employeeId: string): Promise<void> {
    if (MOCK) {
      await delay(200);
      requireOwnerOrHr(actor, findProject(projectId));
      const existing = members.find(
        (row) => row.projectId === projectId && row.employeeId === employeeId && row.isActive,
      );
      if (!existing) fail(404, 'NOT_FOUND', 'Anggota tidak ditemukan.');
      existing!.isActive = false;
      return;
    }
    await api.delete(`/projects/${projectId}/members/${employeeId}`);
  },

  /* ── Task ────────────────────────────────────────────────────────────────── */

  /** `FT1.12` — cakupan: task saya · yang saya tugaskan · tim (atasan berjenjang) · semua (HR). */
  async tasks(actor: ProdActor, search: TaskSearch): Promise<Task[]> {
    if (MOCK) {
      await delay();
      if (search.scope === 'ALL' && !isHr(actor.role))
        fail(403, 'PROD_NOT_IN_SUPERVISION_CHAIN', 'Hanya HR yang dapat melihat seluruh task perusahaan.');
      const term = search.keyword?.trim().toLowerCase() ?? '';
      return tasks
        .filter((task) => {
          if (search.scope === 'MINE') return task.assigneeEmployeeId === actor.employeeId;
          if (search.scope === 'ASSIGNED_BY_ME') return task.assignerEmployeeId === actor.employeeId;
          if (search.scope === 'TEAM') return isSupervisorOf(actor.employeeId, task.assigneeEmployeeId);
          return true;
        })
        .filter((task) => !search.status || task.status === search.status)
        .filter((task) => !search.priority || task.priority === search.priority)
        .filter(
          (task) =>
            !search.projectId || (search.projectId === 'NONE' ? !task.projectId : task.projectId === search.projectId),
        )
        .filter((task) => !search.taskCategoryId || task.taskCategoryId === search.taskCategoryId)
        .filter((task) => !term || `${task.code} ${task.taskTitle}`.toLowerCase().includes(term))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((task) => ({ ...task }));
    }
    const filters = {
      taskTitle: search.keyword || undefined,
      status: search.status ? [search.status] : undefined,
      priority: search.priority ? [search.priority] : undefined,
      projectId: search.projectId && search.projectId !== 'NONE' ? search.projectId : undefined,
      hasProject: search.projectId === 'NONE' ? false : undefined,
      taskCategoryId: search.taskCategoryId,
      scope: search.scope,
    };
    const { data } = await api.post('/tasks/search', snakeize({ filters }));
    return camelize<WirePage<Task>>(data).data;
  },

  /** `FT1.10` */
  async task(actor: ProdActor, id: string): Promise<Task> {
    if (MOCK) {
      await delay(150);
      const task = findTask(id);
      if (!canReadTask(actor, task)) fail(403, 'PROD_NOT_OBJECT_OWNER', 'Anda tidak memiliki akses ke task ini.');
      return { ...task };
    }
    const { data } = await api.get(`/tasks/${id}`);
    return camelize<Task>(data);
  },

  /** `FT1.13` — terbaru dulu (pengecualian sadar dari ASC baku). */
  async taskHistory(actor: ProdActor, id: string): Promise<TaskChange[]> {
    if (MOCK) {
      await delay(150);
      const task = findTask(id);
      if (!canReadTask(actor, task)) fail(403, 'PROD_NOT_OBJECT_OWNER', 'Anda tidak memiliki akses ke task ini.');
      return changes
        .filter((row) => row.taskId === id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((row) => ({ ...row, createdBy: { ...row.createdBy } }));
    }
    const { data } = await api.get(`/tasks/${id}/history`);
    return camelize<WirePage<TaskChange>>(data).data;
  },

  /**
   * `FT1.09` — `task_origin` ditentukan server: pengerja = pemohon ⇒ DIBUAT_SENDIRI (penugas NULL), selain itu
   * DITUGASKAN (penugas = pemohon). `original_due_date` disalin dari `due_date`.
   */
  async createTask(actor: ProdActor, draft: TaskDraft): Promise<Task> {
    if (MOCK) {
      await delay(300);
      if (!draft.taskTitle.trim()) fail(422, 'VALIDATION_ERROR', 'Judul task wajib diisi.');
      if (!draft.assigneeEmployeeId) fail(422, 'VALIDATION_ERROR', 'Pengerja wajib dipilih.');
      if (!draft.dueDate) fail(422, 'VALIDATION_ERROR', 'Tenggat wajib diisi.');
      const project = draft.projectId ? findProject(draft.projectId) : null;
      if (project?.state === 'ARSIP')
        fail(
          422,
          'PROD_PROJECT_ARCHIVED',
          `Proyek ${project.code} berstatus ARSIP — task baru tidak dapat ditambahkan.`,
        );
      if (!canAssignTo(actor, draft.assigneeEmployeeId, project?.ownerEmployeeId))
        fail(
          403,
          'PROD_TASK_ASSIGN_NOT_AUTHORIZED',
          'Anda hanya dapat menugaskan ke bawahan berjenjang atau anggota proyek yang Anda pimpin.',
        );
      const self = draft.assigneeEmployeeId === actor.employeeId;
      seq.task += 1;
      const task: Task = {
        id: `e2000000-0000-7000-8000-${String(seq.task).padStart(12, '0')}`,
        code: `TSK-${pad(seq.task)}`,
        projectId: draft.projectId || null,
        taskCategoryId: draft.taskCategoryId || null,
        assigneeEmployeeId: draft.assigneeEmployeeId,
        assignerEmployeeId: self ? null : actor.employeeId,
        taskOrigin: self ? 'DIBUAT_SENDIRI' : 'DITUGASKAN',
        status: 'BELUM_DIKERJAKAN',
        priority: draft.priority,
        dueDate: draft.dueDate,
        originalDueDate: draft.dueDate,
        taskTitle: draft.taskTitle.trim(),
        description: draft.description.trim() || null,
        createdAt: nowIso(),
        updatedAt: null,
        closedAt: null,
      };
      tasks.push(task);
      return { ...task };
    }
    const { data } = await api.post(
      '/tasks',
      snakeize({
        ...draft,
        projectId: draft.projectId || undefined,
        taskCategoryId: draft.taskCategoryId || undefined,
        description: draft.description || undefined,
      }),
      { headers: { 'Idempotency-Key': newIdempotencyKey() } },
    );
    return camelize<Task>(data);
  },

  /**
   * `FT1.11` — wewenang berbeda per medan (TSD §4.5). Tenggat task DITUGASKAN hanya penugas/atasan berjenjang;
   * memundurkan tenggat wajib beralasan. Status mengikuti diagram beku; pembukaan-kembali dari keadaan akhir
   * digerbangi jendela `productivity.entry_window_days`.
   */
  async updateTask(actor: ProdActor, id: string, patch: TaskPatch): Promise<Task> {
    if (MOCK) {
      await delay(300);
      const task = findTask(id);
      const isAssignee = task.assigneeEmployeeId === actor.employeeId;
      const isAssigner = task.assignerEmployeeId === actor.employeeId;
      const isChain = isSupervisorOf(actor.employeeId, task.assigneeEmployeeId);
      if (!isAssignee && !isAssigner && !isChain)
        fail(
          403,
          'PROD_NOT_OBJECT_OWNER',
          'Hanya pengerja, penugas, atau atasan berjenjang yang dapat mengubah task ini.',
        );

      if (patch.taskTitle !== undefined && !patch.taskTitle.trim())
        fail(422, 'VALIDATION_ERROR', 'Judul task tidak boleh kosong.');

      if (patch.dueDate !== undefined && patch.dueDate !== task.dueDate) {
        const allowed = task.taskOrigin === 'DIBUAT_SENDIRI' ? isAssignee || isChain : isAssigner || isChain;
        if (!allowed)
          fail(
            403,
            'PROD_NOT_OBJECT_OWNER',
            'Tenggat task yang ditugaskan hanya dapat diubah penugas atau atasan berjenjang.',
          );
        if (patch.dueDate > task.dueDate && !patch.changeReason?.trim())
          fail(422, 'PROD_TASK_DUE_DATE_REASON_REQUIRED', 'Alasan wajib diisi saat tenggat dimundurkan.');
      }

      if (patch.assigneeEmployeeId !== undefined && patch.assigneeEmployeeId !== task.assigneeEmployeeId) {
        if (!(isAssigner || isChain) || !canAssignTo(actor, patch.assigneeEmployeeId))
          fail(403, 'PROD_TASK_ASSIGN_NOT_AUTHORIZED', 'Anda tidak berwenang memindahkan task ini ke orang tersebut.');
      }

      if (patch.projectId !== undefined && patch.projectId !== task.projectId && patch.projectId) {
        const target = findProject(patch.projectId);
        if (target.state === 'ARSIP')
          fail(
            422,
            'PROD_PROJECT_ARCHIVED',
            `Proyek ${target.code} berstatus ARSIP — task tidak dapat dipindahkan ke sana.`,
          );
      }

      if (patch.status !== undefined && patch.status !== task.status) {
        if (!TASK_TRANSITIONS[task.status].includes(patch.status))
          fail(
            422,
            'PROD_TASK_STATUS_TRANSITION_INVALID',
            `Transisi ${task.status} → ${patch.status} tidak ada di diagram status task.`,
          );
        if (patch.status === 'DIBATALKAN') {
          const allowed = task.taskOrigin === 'DIBUAT_SENDIRI' ? isAssignee : isAssigner || isChain;
          if (!allowed)
            fail(
              403,
              'PROD_NOT_OBJECT_OWNER',
              'Task yang ditugaskan hanya dapat dibatalkan penugas atau atasan berjenjang.',
            );
        }
        if (
          isFinalStatus(task.status) &&
          !withinWindow(task.closedAt ?? task.updatedAt ?? task.createdAt, entryWindowDays(), prodClock.now())
        )
          fail(
            422,
            'PROD_ENTRY_WINDOW_CLOSED',
            `Jendela ${entryWindowDays()} hari sejak task ditutup sudah lewat — task tidak dapat dibuka kembali.`,
          );
      }

      // Seluruh gerbang lolos — tulis perubahan + riwayat dalam satu langkah.
      if (patch.taskTitle !== undefined) task.taskTitle = patch.taskTitle.trim();
      if (patch.description !== undefined) task.description = patch.description?.trim() || null;
      if (patch.priority !== undefined) task.priority = patch.priority;
      if (patch.taskCategoryId !== undefined && (patch.taskCategoryId || null) !== task.taskCategoryId) {
        logChange(actor, task, 'TASK_CATEGORY', task.taskCategoryId, patch.taskCategoryId || null);
        task.taskCategoryId = patch.taskCategoryId || null;
      }
      if (patch.projectId !== undefined && (patch.projectId || null) !== task.projectId) {
        logChange(actor, task, 'PARENT_PROJECT', task.projectId, patch.projectId || null);
        task.projectId = patch.projectId || null;
      }
      if (patch.assigneeEmployeeId !== undefined && patch.assigneeEmployeeId !== task.assigneeEmployeeId) {
        logChange(actor, task, 'ASSIGNEE', task.assigneeEmployeeId, patch.assigneeEmployeeId);
        task.assigneeEmployeeId = patch.assigneeEmployeeId;
      }
      if (patch.dueDate !== undefined && patch.dueDate !== task.dueDate) {
        logChange(actor, task, 'DUE_DATE', task.dueDate, patch.dueDate, patch.changeReason);
        task.dueDate = patch.dueDate;
      }
      if (patch.status !== undefined && patch.status !== task.status) {
        if (logsStatusChange(task.status, patch.status)) logChange(actor, task, 'STATUS', task.status, patch.status);
        task.status = patch.status;
        if (isFinalStatus(patch.status)) task.closedAt = nowIso();
      }
      task.updatedAt = nowIso();
      return { ...task };
    }
    const { data } = await api.patch(`/tasks/${id}`, snakeize(patch));
    return camelize<Task>(data);
  },

  /* ── Kategori Task ───────────────────────────────────────────────────────── */

  /** `FT1.15` — baca terbuka seluruh role. */
  async categories(): Promise<TaskCategory[]> {
    if (MOCK) {
      await delay(150);
      return categories.map((row) => ({ ...row, inUse: tasks.some((task) => task.taskCategoryId === row.id) }));
    }
    const { data } = await api.get('/task-categories');
    return camelize<WirePage<TaskCategory>>(data).data;
  },

  /** `FT1.14`/`FT1.17` — HR saja; nama unik di antara kategori aktif (409 generik). */
  async saveCategory(actor: ProdActor, input: { categoryName: string; isActive?: boolean }, id?: string) {
    if (MOCK) {
      await delay(250);
      if (!isHr(actor.role)) fail(403, 'FORBIDDEN', 'Hanya HR yang dapat mengelola kategori task.');
      const name = input.categoryName.trim();
      if (!name) fail(422, 'VALIDATION_ERROR', 'Nama kategori wajib diisi.');
      if (name.length > 60) fail(422, 'VALIDATION_ERROR', 'Nama kategori maksimal 60 karakter.');
      const clash = categories.find(
        (row) => row.id !== id && row.isActive && row.categoryName.toLowerCase() === name.toLowerCase(),
      );
      if (clash) fail(409, 'DUPLICATE_CONFLICT', `Kategori "${clash.categoryName}" sudah ada.`);
      if (id) {
        const row = categories.find((item) => item.id === id) ?? fail(404, 'NOT_FOUND', 'Kategori tidak ditemukan.');
        row.categoryName = name;
        if (input.isActive !== undefined) row.isActive = input.isActive;
        return { ...row, inUse: tasks.some((task) => task.taskCategoryId === row.id) };
      }
      seq.category += 1;
      const row: StoredCategory = {
        id: `f3000000-0000-7000-8000-${String(seq.category).padStart(12, '0')}`,
        categoryName: name,
        isActive: true,
        createdAt: nowIso(),
      };
      categories.push(row);
      return { ...row, inUse: false };
    }
    const { data } = id
      ? await api.patch(`/task-categories/${id}`, snakeize(input))
      : await api.post('/task-categories', snakeize(input));
    return camelize<TaskCategory>(data);
  },

  /** `FT1.18` — hapus hanya bila belum pernah dipakai task mana pun (termasuk task lama). */
  async deleteCategory(actor: ProdActor, id: string): Promise<void> {
    if (MOCK) {
      await delay(250);
      if (!isHr(actor.role)) fail(403, 'FORBIDDEN', 'Hanya HR yang dapat mengelola kategori task.');
      if (tasks.some((task) => task.taskCategoryId === id))
        fail(
          409,
          'PROD_TASK_CATEGORY_IN_USE',
          'Kategori pernah dipakai task — hapus permanen ditolak. Nonaktifkan kategori ini sebagai gantinya.',
        );
      categories = categories.filter((row) => row.id !== id);
      return;
    }
    await api.delete(`/task-categories/${id}`);
  },

  /** Dipakai timesheet — judul & kategori task tanpa gerbang baca (proyeksi layar milik pemilik jam). */
  taskRef(id: string) {
    return tasks.find((task) => task.id === id);
  },
  categoryRef(id: string | null) {
    return categories.find((row) => row.id === id);
  },
  projectRef(id: string | null) {
    return projects.find((row) => row.id === id);
  },
};
