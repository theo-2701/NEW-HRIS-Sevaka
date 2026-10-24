import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import { CURRENT_USER } from '@/features/manpower/types';
import {
  DESTINATION_OPTIONS,
  EMPLOYEE_OPTIONS,
  REASON_LABEL,
  SUBTYPE_LABEL,
  TARGET_GRADE_OPTIONS,
  isApprover,
  isHandler,
  isTaskClosed,
  labelOf,
} from '@/features/transitions/types';
import type {
  EscalationReason,
  OffboardingReason,
  TaskSide,
  TaskStatus,
  Transition,
  TransitionDraft,
  TransitionTask,
  TransitionType,
  TransferSubtype,
} from '@/features/transitions/types';

/**
 * API service Transition (FSD-001-EMPLOYEE 0.83 §5 · §16 · §18–§20 · TSD 0.192 §7.6, §7.22, §7.24–§7.26):
 *   POST /transitions/search                      — TL1, TR-LIST terpadu
 *   GET  /transitions/{id}                        — TR-DASHBOARD
 *   POST /transitions                             — TR-CREATE (+ facility_provided / facility_withdrawn)
 *   POST /transition-tasks/{id}/complete          — petugas selesai (dua-pihak ⇒ AWAITING_CONFIRM)
 *   POST /transition-tasks/{id}/confirm           — karyawan subjek (atau HR bila Deceased)
 *   POST /transition-tasks/{id}/approve | reject  — penyetuju (MT3/MT4); tolak wajib alasan
 *   POST /transition-tasks/{id}/waive             — D3 STANDARD/ELEVATED (juga force-release clearance)
 *   GET  /my-transition-tasks?tab=…               — MT1 (tugas milik orang yang login)
 *   GET  /onboarding-closure-queue · POST …/{employee-id}/close — §7.22
 *   GET  /my-transitions · /my-transitions/{id}   — ES1/ES2 (subjek = karyawan yang login)
 */
const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));
const newId = () => crypto.randomUUID();
const today = () => new Date().toISOString().slice(0, 10);

function task(
  name: string,
  owner: string,
  side: TaskSide,
  status: TaskStatus,
  releasedAt: string,
  dueAt: string,
  extra: Partial<TransitionTask> = {},
): TransitionTask {
  return { id: newId(), name, owner, side, status, releasedAt, dueAt, ...extra };
}

/** Task fasilitas (TSU-D9/D26): dua-pihak dan wajib persetujuan; lahir hanya bila catatan diisi. */
function facilityTask(side: 'PROVISION' | 'RELINQUISH', status: TaskStatus = 'RELEASED'): TransitionTask {
  return task(side === 'PROVISION' ? 'Facility provided' : 'Facility withdrawn', 'GA Jakarta HQ', side, status, today(), '', {
    code: side === 'PROVISION' ? 'FACILITY_PROVIDED' : 'FACILITY_WITHDRAWN',
    handlers: ['Doni Prabowo', 'Nur Aisyah'],
    approvers: ['Tony Stark', 'Sari Dewanti'],
    requiresApproval: true,
    twoParty: true,
  });
}

/** Paket task per tipe transisi — di backend lahir dari setup Materialization versi beku. */
export function spawnTasks(type: TransitionType): TransitionTask[] {
  if (type === 'ONBOARDING') {
    return [
      task('SEVAKA HRIS access', 'System', 'NONE', 'COMPLETED', '2026-07-02', '2026-07-02', { code: 'HRIS_ACCESS' }),
      task('Create IT accounts', 'IT Jakarta HQ', 'NONE', 'COMPLETED', '2026-07-02', '2026-07-10', {
        code: 'IT_ACCOUNT',
        handlers: ['Yoga Pratama', 'Nur Aisyah'],
      }),
      task('Assign laptop & access card', 'GA Jakarta HQ', 'NONE', 'IN_PROGRESS', '2026-07-02', '2026-07-12', {
        code: 'ASSET_HANDOVER',
        handlers: ['Doni Prabowo', 'Tony Stark'],
        twoParty: true,
        asset: true,
      }),
      task('Payroll & tax registration', 'HR Jakarta HQ', 'NONE', 'RELEASED', '2026-07-02', '2026-07-14', {
        code: 'PAYROLL_REG',
        handlers: ['Tony Stark', 'Lia Permata'],
        approvers: ['Sari Dewanti', 'Eka Saputra'],
        requiresApproval: true,
      }),
      task('Orientation day', 'HR Jakarta HQ', 'NONE', 'PENDING', '', '2026-07-15', {
        code: 'ORIENTATION',
        handlers: ['Lia Permata', 'Tony Stark'],
        dependsOn: 'Assign laptop & access card',
      }),
    ];
  }
  if (type === 'TRANSFER') {
    return [
      task('Handover open work', 'Supervisor Finance Papua', 'RELINQUISH', 'COMPLETED', '2026-12-02', '2026-12-05', {
        code: 'WORK_HANDOVER',
        handlers: ['Lia Permata', 'Nur Aisyah'],
      }),
      task('Return regional assets (laptop)', 'GA Papua', 'RELINQUISH', 'AWAITING_CONFIRM', '2026-12-02', '2026-12-06', {
        code: 'ASSET_RETURN',
        handlers: ['Doni Prabowo', 'Tony Stark'],
        twoParty: true,
        asset: true,
      }),
      task('Verify identity in new unit', 'HR Jakarta HQ', 'PROVISION', 'IN_PROGRESS', '2026-12-02', '2026-12-04', {
        code: 'ID_VERIFY',
        handlers: ['Tony Stark', 'Lia Permata'],
        timedOut: true,
      }),
      task('Provision system access', 'IT Jakarta HQ', 'PROVISION', 'PENDING', '', '', {
        code: 'IT_ACCESS',
        handlers: ['Yoga Pratama', 'Nur Aisyah'],
        dependsOn: 'Verify identity in new unit',
      }),
      task('Prepare desk & new assets', 'GA Jakarta HQ', 'PROVISION', 'RELEASED', '2026-12-02', '2026-12-08', {
        code: 'DESK_PREP',
        handlers: ['Doni Prabowo', 'Nur Aisyah'],
      }),
      task('Relocation approver seat', '', 'PROVISION', 'SKIPPED', '', '', { skipReason: 'Vacant seat' }),
    ];
  }
  return [
    task('Knowledge handover', 'Manager Ops', 'RELINQUISH', 'COMPLETED', '2026-07-02', '2026-07-09', {
      code: 'WORK_HANDOVER',
      handlers: ['Lia Permata', 'Nur Aisyah'],
    }),
    task('Return company laptop', 'GA Jakarta', 'RELINQUISH', 'IN_PROGRESS', '2026-07-02', '2026-07-10', {
      code: 'ASSET_RETURN',
      handlers: ['Doni Prabowo', 'Tony Stark'],
      twoParty: true,
      asset: true,
      timedOut: true,
      clearanceBlocking: true,
    }),
    task('Revoke building access', 'GA Jakarta', 'RELINQUISH', 'AWAITING_APPROVAL', '2026-07-02', '2026-07-12', {
      code: 'ACCESS_REVOKE',
      handlers: ['Doni Prabowo', 'Lia Permata'],
      approvers: ['Tony Stark', 'Sari Dewanti'],
      requiresApproval: true,
      clearanceBlocking: true,
    }),
    task('Exit interview', 'HR — Dewi', 'RELINQUISH', 'WAIVED', '2026-07-02', '2026-07-08', {
      code: 'EXIT_INTERVIEW',
      skipReason: 'The employee declined',
    }),
    task('Parking permit return', 'GA', 'RELINQUISH', 'SKIPPED', '', '', { skipReason: 'Optional' }),
  ];
}

let mockRows: Transition[] = [
  {
    id: 'TR-2026-0417',
    employee: 'Eka Saputra',
    employeeNik: 'NIK-0005',
    branch: 'BR-Papua',
    requester: 'Lia Permata',
    type: 'TRANSFER',
    subtype: 'PROMOTION',
    from: 'Staff Finance — Papua',
    to: 'Senior Finance — Jakarta HQ',
    detail: 'Promotion → Senior Finance, Jakarta HQ',
    effectiveDate: '2027-01-01',
    status: 'IN_PROGRESS',
    targetJobGradeId: 'gr-4a',
    facilityProvided: 'Official car for the regional finance role.',
    inOpensAfterOut: false,
    tasks: [...spawnTasks('TRANSFER'), facilityTask('PROVISION', 'AWAITING_APPROVAL')],
  },
  {
    id: 'TR-2026-0411',
    employee: 'Fajar Nugroho',
    employeeNik: 'NIK-0040',
    branch: 'HO-Jakarta',
    requester: 'Tony Stark',
    type: 'OFFBOARDING',
    reason: 'RESIGN',
    from: 'Ops Coordinator — BR-Jakarta',
    to: '—',
    detail: 'Resignation (voluntary)',
    effectiveDate: '2026-07-20',
    status: 'IN_PROGRESS',
    tasks: spawnTasks('OFFBOARDING'),
  },
  {
    id: 'TR-2026-0405',
    employee: 'Maya Kusuma',
    employeeNik: 'NIK-0108',
    branch: 'HO-Jakarta',
    requester: 'System',
    type: 'ONBOARDING',
    from: '—',
    to: 'Backend Engineer — Jakarta HQ',
    detail: 'New joiner onboarding',
    effectiveDate: '2026-07-16',
    status: 'IN_PROGRESS',
    tasks: spawnTasks('ONBOARDING'),
  },
  {
    id: 'TR-2026-0402',
    employee: 'Rudi Hartanto',
    employeeNik: 'NIK-0115',
    branch: 'BR-Bandung',
    requester: 'System',
    type: 'ONBOARDING',
    from: '—',
    to: 'Sales Executive — BR-Bandung',
    detail: 'New joiner onboarding',
    effectiveDate: '2026-11-03',
    status: 'IN_PROGRESS',
    escalation: 'NO_SETUP',
    tasks: [],
  },
  {
    id: 'TR-2026-0398',
    employee: 'Dimas Prabowo',
    employeeNik: 'NIK-0044',
    branch: 'HO-Jakarta',
    requester: 'Lia Permata',
    type: 'TRANSFER',
    subtype: 'LATERAL',
    from: 'Backend Engineer — HQ',
    to: 'Team Lead Ops — BR-Jakarta',
    detail: 'Lateral → Team Lead Ops, BR-Jakarta',
    effectiveDate: '2026-08-01',
    status: 'IN_APPROVAL',
    tasks: [],
  },
  {
    id: 'TR-2026-0390',
    employee: 'Bagus Wicaksono',
    employeeNik: 'NIK-0021',
    branch: 'HO-Jakarta',
    requester: 'System',
    type: 'ONBOARDING',
    from: '—',
    to: 'Software Engineer — Jakarta HQ',
    detail: 'New joiner onboarding',
    effectiveDate: '2026-10-20',
    status: 'CANCELLED',
    closure: { reason: 'ACCESS_CANCELLED', queuedAt: '2026-10-22T09:15:00+07:00' },
    tasks: spawnTasks('ONBOARDING').map((item) =>
      isTaskClosed(item) ? item : { ...item, status: 'SKIPPED' as TaskStatus, skipReason: 'Access cancelled before start' },
    ),
  },
  {
    id: 'TR-2026-0362',
    employee: 'Rina Melati',
    employeeNik: 'NIK-0018',
    branch: 'BR-Surabaya',
    requester: 'Tony Stark',
    type: 'OFFBOARDING',
    reason: 'RETIREMENT',
    from: 'Warehouse Supervisor — BR-Surabaya',
    to: '—',
    detail: 'Retirement',
    effectiveDate: '2026-06-30',
    status: 'COMPLETED',
    tasks: spawnTasks('OFFBOARDING').map((row) => ({ ...row, status: 'COMPLETED' as TaskStatus })),
  },
];

function find(id: string): Transition {
  const row = mockRows.find((item) => item.id === id);
  if (!row) throw new Error('404 — Transition not found.');
  return row;
}

function findTask(transitionId: string, taskId: string): TransitionTask {
  const row = find(transitionId).tasks.find((item) => item.id === taskId);
  if (!row) throw new Error('404 — Task not found.');
  return row;
}

/** Menutup transisi begitu seluruh task selesai — kecuali OFFBOARDING, yang ditahan gerbang clearance. */
function maybeComplete(row: Transition) {
  const allDone = row.tasks.length > 0 && row.tasks.every(isTaskClosed);
  if (allDone && row.type !== 'OFFBOARDING') row.status = 'COMPLETED';
}

/** Task sesudah selesai/konfirmasi: menunggu persetujuan bila wajib, selain itu COMPLETED. */
const afterWork = (row: TransitionTask): TaskStatus => (row.requiresApproval ? 'AWAITING_APPROVAL' : 'COMPLETED');

const OPEN_STATUSES = ['IN_APPROVAL', 'IN_PROGRESS'];
/** Transisi struktural = pindah/keluar. Onboarding adalah awal kerja, bukan perpindahan. */
const STRUCTURAL: TransitionType[] = ['TRANSFER', 'OFFBOARDING'];

const copy = (row: Transition): Transition => ({ ...row, tasks: row.tasks.map((item) => ({ ...item })) });

/** Alasan eskalasi: tersimpan (setup/petugas tak ada), atau berjalan melewati tanggal efektif. */
export function escalationOf(row: Transition): EscalationReason | null {
  if (row.escalation) return row.escalation;
  if (row.status === 'IN_PROGRESS' && row.effectiveDate < today() && row.tasks.some((item) => !isTaskClosed(item))) {
    return 'PAST_EFFECTIVE';
  }
  return null;
}

/**
 * Koneksi antar modul (tanpa API): materialisasi New Joiner memulai transisi ONBOARDING. Task lahir
 * segar — yang punya dependensi PENDING, sisanya RELEASED.
 */
export function startOnboardingForNewJoiner(input: { name: string; positionLabel: string; effectiveDate: string }): Transition {
  const row: Transition = {
    id: `TR-2026-0${600 + mockRows.length}`,
    employee: input.name,
    requester: 'System',
    type: 'ONBOARDING',
    from: '—',
    to: input.positionLabel,
    detail: 'New joiner onboarding',
    effectiveDate: input.effectiveDate,
    status: 'IN_PROGRESS',
    tasks: spawnTasks('ONBOARDING').map((item) =>
      item.code === 'HRIS_ACCESS'
        ? item
        : { ...item, status: item.dependsOn ? 'PENDING' : 'RELEASED', releasedAt: item.dependsOn ? '' : today() },
    ),
  };
  mockRows = [row, ...mockRows];
  return row;
}

/**
 * Koneksi antar modul: Cancel access (FSD-001-EMPLOYEE 0.83 §14.4, TSD §7.21) memulai OFFBOARDING
 * `CANCELLED_BEFORE_START` yang menunggu persetujuan. Onboarding karyawan itu ditutup otomatis: task yang
 * belum selesai menjadi SKIPPED dan karyawan masuk antrean Onboarding Closure (§16).
 */
export function startOffboardingForCancelledAccess(input: { name: string; reasonLabel: string }): Transition {
  const onboarding = mockRows.find((item) => item.employee === input.name && item.type === 'ONBOARDING' && OPEN_STATUSES.includes(item.status));
  if (onboarding) {
    onboarding.tasks.forEach((item) => {
      if (!isTaskClosed(item)) Object.assign(item, { status: 'SKIPPED', skipReason: 'Access cancelled before start' });
    });
    onboarding.status = 'CANCELLED';
    onboarding.closure = { reason: 'ACCESS_CANCELLED', queuedAt: new Date().toISOString() };
  }
  const row: Transition = {
    id: `TR-2026-0${700 + mockRows.length}`,
    employee: input.name,
    requester: CURRENT_USER,
    type: 'OFFBOARDING',
    reason: 'CANCELLED_BEFORE_START',
    from: '—',
    to: '—',
    detail: `Access cancelled before start · ${input.reasonLabel}`,
    effectiveDate: today(),
    status: 'IN_APPROVAL',
    tasks: [],
  };
  mockRows = [row, ...mockRows];
  return row;
}

export interface MyTaskRow {
  task: TransitionTask;
  transition: Transition;
}

export const transitionService = {
  async list(): Promise<Transition[]> {
    if (MOCK) {
      await delay();
      return mockRows.map(copy);
    }
    const { data } = await api.post<{ items: Transition[] }>('/employee/transitions/search', { page: 0, size: 100 });
    return data.items;
  },

  async get(id: string): Promise<Transition> {
    if (MOCK) {
      await delay(200);
      return copy(find(id));
    }
    const { data } = await api.get<Transition>(`/employee/transitions/${id}`);
    return data;
  },

  async create(draft: TransitionDraft): Promise<Transition> {
    if (draft.facilityProvided.length > 500 || draft.facilityWithdrawn.length > 500) {
      throw new Error('422 — A facility note is at most 500 characters.');
    }
    if (MOCK) {
      await delay();
      const employee = labelOf(EMPLOYEE_OPTIONS, draft.employeeId).split(' — ')[0];

      // Guard server UIC-EMPLOYEE §5.1 — form sudah memvalidasi, server tetap menegakkan.
      if (draft.type === 'TRANSFER' && !draft.subtype) throw new Error('422 — transition_subtype is required for a transfer.');
      if (draft.type === 'TRANSFER' && (draft.subtype === 'PROMOTION' || draft.subtype === 'DEMOTION') && !draft.targetJobGradeId) {
        throw new Error('422 — target_job_grade_id is required for a promotion or demotion.');
      }
      if (draft.type === 'OFFBOARDING' && !draft.reason) throw new Error('422 — reason_category is required for offboarding.');
      if (
        STRUCTURAL.includes(draft.type) &&
        mockRows.some((row) => row.employee === employee && STRUCTURAL.includes(row.type) && OPEN_STATUSES.includes(row.status))
      ) {
        throw new Error(`409 — ${employee} already has an open structural transition; only one per employee.`);
      }
      const destination = draft.destinationPositionId ? labelOf(DESTINATION_OPTIONS, draft.destinationPositionId) : 'same position';
      let detail = 'New joiner onboarding';
      if (draft.type === 'TRANSFER') {
        detail = `${SUBTYPE_LABEL[draft.subtype as TransferSubtype]} → ${destination}`;
        if (draft.targetJobGradeId) detail += ` · ${labelOf(TARGET_GRADE_OPTIONS, draft.targetJobGradeId)}`;
      }
      if (draft.type === 'OFFBOARDING') detail = REASON_LABEL[draft.reason as OffboardingReason];

      const transfer = draft.type === 'TRANSFER';
      // Transfer menunggu persetujuan parent-chain sebelum task lahir; fasilitas ikut lahir bersama paketnya.
      const facilities = [
        ...(draft.facilityProvided.trim() ? [facilityTask('PROVISION')] : []),
        ...(draft.facilityWithdrawn.trim() ? [facilityTask('RELINQUISH')] : []),
      ];
      const row: Transition = {
        id: `TR-2026-0${500 - mockRows.length}`,
        employee,
        requester: CURRENT_USER,
        type: draft.type,
        subtype: transfer ? (draft.subtype as TransferSubtype) : undefined,
        reason: draft.type === 'OFFBOARDING' ? (draft.reason as OffboardingReason) : undefined,
        from: '—',
        to: transfer ? destination : '—',
        detail,
        effectiveDate: draft.effectiveDate,
        status: transfer ? 'IN_APPROVAL' : 'IN_PROGRESS',
        targetJobGradeId: draft.targetJobGradeId || undefined,
        facilityProvided: draft.facilityProvided.trim() || undefined,
        facilityWithdrawn: draft.facilityWithdrawn.trim() || undefined,
        inOpensAfterOut: transfer ? true : undefined,
        tasks: transfer ? [] : [...spawnTasks(draft.type), ...facilities],
      };
      mockRows = [row, ...mockRows];
      return copy(row);
    }
    // L2: isian yang tidak tampil untuk jenis ini tidak dikirim.
    const { subtype, destinationPositionId, targetJobGradeId, reason, facilityProvided, facilityWithdrawn, ...core } = draft;
    const facility = {
      facility_provided: facilityProvided.trim() || undefined,
      facility_withdrawn: facilityWithdrawn.trim() || undefined,
    };
    const body =
      draft.type === 'TRANSFER'
        ? { ...core, ...facility, subtype, destinationPositionId: destinationPositionId || undefined, targetJobGradeId: targetJobGradeId || undefined }
        : draft.type === 'OFFBOARDING'
          ? { ...core, ...facility, reason }
          : core;
    const { data } = await api.post<Transition>('/employee/transitions', body);
    return data;
  },

  /** Petugas menandai selesai. Dua-pihak ⇒ AWAITING_CONFIRM; wajib persetujuan ⇒ AWAITING_APPROVAL. */
  async completeTask(transitionId: string, taskId: string): Promise<TaskStatus> {
    if (MOCK) {
      await delay(200);
      const row = findTask(transitionId, taskId);
      if (row.status !== 'RELEASED' && row.status !== 'IN_PROGRESS') {
        throw new Error(`409 — The task is ${row.status}; only a released or in-progress task can be completed.`);
      }
      row.status = row.twoParty ? 'AWAITING_CONFIRM' : afterWork(row);
      delete row.rejectReason;
      maybeComplete(find(transitionId));
      return row.status;
    }
    const { data } = await api.post<{ status: TaskStatus }>(`/employee/transition-tasks/${taskId}/complete`, {});
    return data.status;
  },

  /** Karyawan subjek (atau HR bila Deceased) mengonfirmasi task dua-pihak. */
  async confirmTask(transitionId: string, taskId: string): Promise<void> {
    if (MOCK) {
      await delay(200);
      const row = findTask(transitionId, taskId);
      if (row.status !== 'AWAITING_CONFIRM') throw new Error(`409 — The task is ${row.status}; only a task awaiting confirmation can be confirmed.`);
      row.status = afterWork(row);
      maybeComplete(find(transitionId));
      return;
    }
    await api.post(`/employee/transition-tasks/${taskId}/confirm`, {});
  },

  /** Penyetuju menyetujui (MT3): bukan pelaksana tugas yang sama (EMP-BIZ-671). */
  async approveTask(transitionId: string, taskId: string, approver = CURRENT_USER): Promise<void> {
    if (MOCK) {
      await delay(200);
      const row = findTask(transitionId, taskId);
      if (!isApprover(row, approver)) throw new Error('403 — You are not an approver of this task.');
      if (row.status !== 'AWAITING_APPROVAL') throw new Error('409 — This task is not waiting for approval.');
      row.status = 'COMPLETED';
      maybeComplete(find(transitionId));
      return;
    }
    await api.post(`/employee/transition-tasks/${taskId}/approve`, {});
  },

  /** Penyetuju menolak (MT4): tugas kembali ke petugas dengan alasan; alasan kosong 422 (EMP-VAL-717). */
  async rejectTask(transitionId: string, taskId: string, reason: string, approver = CURRENT_USER): Promise<void> {
    if (!reason.trim()) throw new Error('422 — Enter the reason for rejecting.');
    if (MOCK) {
      await delay(200);
      const row = findTask(transitionId, taskId);
      if (!isApprover(row, approver)) throw new Error('403 — You are not an approver of this task.');
      if (row.status !== 'AWAITING_APPROVAL') throw new Error('409 — This task is not waiting for approval.');
      Object.assign(row, { status: 'IN_PROGRESS', rejectReason: reason.trim() });
      return;
    }
    await api.post(`/employee/transition-tasks/${taskId}/reject`, { reason: reason.trim() });
  },

  /** `POST /transition-tasks/{id}/waive` — task yang sudah terminal ditolak 409. */
  async waiveTask(transitionId: string, taskId: string, payload: { control: 'STANDARD' | 'ELEVATED'; reason: string }): Promise<void> {
    if (MOCK) {
      await delay(200);
      const row = findTask(transitionId, taskId);
      // TSD §7.6.4: state terbuka, atau SKIPPED hanya bila clearance-blocking.
      if (row.status === 'COMPLETED' || row.status === 'WAIVED' || (row.status === 'SKIPPED' && !row.clearanceBlocking)) {
        throw new Error('409 — Only an open task, or a skipped clearance-blocking task, can be waived.');
      }
      Object.assign(row, { status: 'WAIVED', skipReason: payload.reason, waiveControl: payload.control });
      maybeComplete(find(transitionId));
      return;
    }
    await api.post(`/employee/transition-tasks/${taskId}/waive`, { waive_reason: payload.reason, waive_control_class: payload.control });
  },

  /**
   * TR-CLEARANCE force-release = waive ELEVATED untuk tiap task clearance-blocking yang belum selesai —
   * BUKAN endpoint terpisah (TSD §7.6.4).
   */
  async forceRelease(transitionId: string, reason: string): Promise<void> {
    const blocking = find(transitionId).tasks.filter((item) => item.clearanceBlocking && item.status !== 'COMPLETED' && item.status !== 'WAIVED');
    if (MOCK) {
      await delay();
      const row = find(transitionId);
      blocking.forEach((item) => Object.assign(item, { status: 'WAIVED', skipReason: reason, waiveControl: 'ELEVATED' }));
      row.status = 'COMPLETED';
      return;
    }
    for (const item of blocking) {
      await api.post(`/employee/transition-tasks/${item.id}/waive`, { waive_reason: reason, waive_control_class: 'ELEVATED' });
    }
  },

  /** MT1 — tugas milik `person` sebagai petugas (`tasks`) atau penyetuju (`approvals`). */
  async myTasks(tab: 'tasks' | 'approvals', person = CURRENT_USER): Promise<MyTaskRow[]> {
    if (MOCK) {
      await delay();
      return mockRows
        .filter((row) => row.status !== 'CANCELLED')
        .flatMap((row) =>
          row.tasks
            .filter((item) => (tab === 'tasks' ? isHandler(item, person) : isApprover(item, person)))
            .map((item) => ({ task: { ...item }, transition: copy(row) })),
        );
    }
    const { data } = await api.get<MyTaskRow[]>(`/employee/my-transition-tasks?tab=${tab}`);
    return data;
  },

  /** Antrean Escalations (HR Manager · Super Admin). */
  async escalations(): Promise<{ transition: Transition; reason: EscalationReason }[]> {
    if (MOCK) {
      await delay();
      return mockRows.flatMap((row) => {
        const reason = escalationOf(row);
        return reason ? [{ transition: copy(row), reason }] : [];
      });
    }
    const { data } = await api.get('/employee/my-transition-tasks?tab=escalations');
    return data;
  },

  /** §7.22 — onboarding yang berakhir sebelum semua task selesai. */
  async closureQueue(): Promise<Transition[]> {
    if (MOCK) {
      await delay();
      return mockRows.filter((row) => row.type === 'ONBOARDING' && row.closure).map(copy);
    }
    const { data } = await api.get<Transition[]>('/employee/onboarding-closure-queue');
    return data;
  },

  /** Menutup onboarding: task SKIPPED ditandai tertutup (WAIVED + catatan), karyawan keluar dari antrean. */
  async closeOnboarding(transitionId: string, note: string): Promise<number> {
    if (note.length > 500) throw new Error('422 — The note is at most 500 characters.');
    if (MOCK) {
      await delay(300);
      const row = find(transitionId);
      if (!row.closure) throw new Error('404 — This employee is no longer in the queue.');
      const open = row.tasks.filter((item) => item.status === 'SKIPPED');
      open.forEach((item) => Object.assign(item, { status: 'WAIVED', skipReason: note.trim() || 'Closed in Onboarding Closure' }));
      delete row.closure;
      return open.length;
    }
    const { data } = await api.post<{ closed: number }>(`/employee/onboarding-closure-queue/${transitionId}/close`, { note: note.trim() || undefined });
    return data.closed;
  },

  /** ES1 — transisi milik karyawan yang login (subjek); milik orang lain 404. */
  async myTransitions(employee: string): Promise<Transition[]> {
    if (MOCK) {
      await delay();
      return mockRows.filter((row) => row.employee === employee && row.status !== 'CANCELLED').map(copy);
    }
    const { data } = await api.get<Transition[]>('/employee/my-transitions');
    return data;
  },
};
