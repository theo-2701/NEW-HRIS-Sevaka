import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import {
  DESTINATION_OPTIONS,
  EMPLOYEE_OPTIONS,
  REASON_OPTIONS,
  SUBTYPE_OPTIONS,
  TARGET_GRADE_OPTIONS,
  labelOf,
} from '@/features/transitions/types';
import { isEligible, pickSetup } from '@/features/transitions/services/setup.service';
import { employeeName as personName } from '@/features/time-off/mock-data';
import type { MaterializationSetup } from '@/features/transitions/setup-types';
import { HANDLER_OPEN } from '@/features/transitions/types';
import type {
  HrQueueReason,
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
 * API service Transition.
 *
 * Endpoint kontrak (FSD §5 · UIC §5):
 *   GET  /transitions                        — TR-DASHBOARD (list)
 *   GET  /transitions/{id}                   — detail + task
 *   POST /transitions                        — TR-CREATE-ONB/TRF/OFF
 *   POST /transitions/{id}/tasks/{taskId}/complete   — PIC menandai selesai
 *   POST /transitions/{id}/tasks/{taskId}/confirm    — konfirmasi dua pihak
 *   POST /transitions/{id}/force-release             — TR-CLEARANCE (elevated)
 *
 * `PROB-FRONTEND-003`: endpoint **waive task** (kontrol D3) belum eksplisit di
 * TSD §7.6 walau perilakunya jelas di model data (§6.6/§12). Jalur waive di
 * bawah sudah disiapkan lengkap dengan kelas kontrol + alasan audit, dan
 * ditandai GAP di UI sampai kontraknya ditegaskan.
 */
const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));
const newId = () => crypto.randomUUID();

/** Task dua pihak: PIC menandai selesai, karyawan yang mengonfirmasi. */
const TWO_PARTY = /return|receiv|kembali|terima|aset|asset|laptop|perangkat/i;

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

/** Cetakan task per tipe transisi — di backend ini lahir dari template task. */
export function spawnTasks(type: TransitionType): TransitionTask[] {
  if (type === 'ONBOARDING') {
    return [
      task('Create IT accounts', 'IT Jakarta HQ', 'PROVISION', 'COMPLETED', '2026-07-02', '2026-07-10', { handlerId: 'emp-rina' }),
      task('Assign laptop & access card', 'GA Jakarta HQ', 'PROVISION', 'IN_PROGRESS', '2026-07-02', '2026-07-12', {
        handlerId: 'emp-budi',
        approverId: 'emp-hendra',
        approvalRequired: true,
        twoParty: true,
      }),
      task('Payroll & tax registration', 'HR Jakarta HQ', 'PROVISION', 'RELEASED', '2026-07-02', '2026-07-14', { handlerId: 'emp-sari' }),
      task('Confirm equipment received', 'Employee', 'PROVISION', 'PENDING', '', '2026-07-15', {
        dependsOn: 'Assign laptop & access card',
      }),
    ];
  }
  if (type === 'TRANSFER') {
    return [
      task('Handover open work', 'Supervisor Finance Papua', 'RELINQUISH', 'COMPLETED', '2026-12-02', '2026-12-05', { handlerId: 'emp-sari' }),
      task('Return regional assets (laptop)', 'GA Papua', 'RELINQUISH', 'AWAITING_CONFIRM', '2026-12-02', '2026-12-06', {
        handlerId: 'emp-budi',
        twoParty: true,
      }),
      task('Verify identity in new unit', 'HR Jakarta HQ', 'PROVISION', 'AWAITING_APPROVAL', '2026-12-02', '2026-12-04', {
        timedOut: true,
        handlerId: 'emp-sari',
        approverId: 'emp-hendra',
        approvalRequired: true,
      }),
      task('Provision system access', 'IT Jakarta HQ', 'PROVISION', 'PENDING', '', '', {
        dependsOn: 'Verify identity in new unit',
      }),
      task('Prepare desk & new assets', 'GA Jakarta HQ', 'PROVISION', 'RELEASED', '2026-12-02', '2026-12-08'),
      task('Relocation approver seat', '', 'PROVISION', 'SKIPPED', '', '', { skipReason: 'VACANT' }),
    ];
  }
  return [
    task('Knowledge handover', 'Manager Ops', 'RELINQUISH', 'COMPLETED', '2026-07-02', '2026-07-09'),
    task('Return company laptop', 'GA Jakarta', 'RELINQUISH', 'IN_PROGRESS', '2026-07-02', '2026-07-10', {
      timedOut: true,
      clearanceBlocking: true,
      handlerId: 'emp-budi',
      twoParty: true,
    }),
    task('Revoke building access', 'GA Jakarta', 'RELINQUISH', 'RELEASED', '2026-07-02', '2026-07-12', {
      clearanceBlocking: true,
    }),
    task('Exit interview', 'HR — Dewi', 'RELINQUISH', 'WAIVED', '2026-07-02', '2026-07-08', {
      skipReason: 'Karyawan menolak',
    }),
    task('Parking permit return', 'GA', 'RELINQUISH', 'SKIPPED', '', '', { skipReason: 'OPTIONAL' }),
  ];
}

let mockRows: Transition[] = [
  {
    id: 'TR-2026-0417',
    employee: 'Eka Saputra',
    employeeId: 'emp-eka',
    requesterId: 'emp-sari',
    branch: 'BR-Papua',
    type: 'TRANSFER',
    subtype: 'PROMOTION',
    from: 'Staff Finance — Papua',
    to: 'Senior Finance — Jakarta HQ',
    detail: 'Promotion → Senior Finance, Jakarta HQ',
    effectiveDate: '2027-01-01',
    status: 'IN_PROGRESS',
    targetJobGradeId: 'gr-4a',
    tasks: spawnTasks('TRANSFER'),
  },
  {
    id: 'TR-2026-0411',
    employee: 'Fajar Nugroho',
    employeeId: 'emp-fajar',
    requesterId: 'emp-sari',
    branch: 'BR-Jakarta',
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
    employeeId: 'emp-maya-k',
    requesterId: 'emp-sari',
    branch: 'HQ',
    type: 'ONBOARDING',
    from: '—',
    to: 'Backend Engineer — Jakarta HQ',
    detail: 'New joiner onboarding',
    effectiveDate: '2026-07-16',
    status: 'IN_PROGRESS',
    tasks: spawnTasks('ONBOARDING'),
  },
  {
    id: 'TR-2026-0398',
    employee: 'Dimas Prabowo',
    employeeId: 'emp-dimas',
    requesterId: 'emp-hendra',
    branch: 'HQ',
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
    id: 'TR-2026-0362',
    employee: 'Rina Melati',
    employeeId: 'emp-rina-m',
    requesterId: 'emp-sari',
    branch: 'BR-Surabaya',
    type: 'OFFBOARDING',
    reason: 'RETIREMENT',
    from: 'Warehouse Supervisor — BR-Surabaya',
    to: '—',
    detail: 'Retirement',
    effectiveDate: '2026-06-30',
    status: 'COMPLETED',
    tasks: spawnTasks('OFFBOARDING').map((row) => ({ ...row, status: 'COMPLETED' as TaskStatus })),
  },
  {
    // §7.22: ONBOARDING tertutup otomatis oleh promosi ⇒ task terbuka masuk antrean HR Manager.
    id: 'TR-2026-0390',
    employee: 'Gilang Pratama',
    employeeId: 'emp-gilang',
    requesterId: 'emp-sari',
    branch: 'HQ',
    type: 'ONBOARDING',
    from: '—',
    to: 'Data Analyst — Jakarta HQ',
    detail: 'New joiner onboarding',
    effectiveDate: '2026-10-05',
    status: 'CANCELLED',
    tasks: [
      task('Create IT accounts', 'IT', 'PROVISION', 'COMPLETED', '2026-10-01', '2026-10-04', { handlerId: 'emp-rina' }),
      task('Assign laptop & access card', 'GA', 'PROVISION', 'SKIPPED', '2026-10-01', '2026-10-06', {
        handlerId: 'emp-budi',
        skipReason: 'CANCELLED',
        hrQueue: { reason: 'STRUCTURAL_TRANSITION', at: '2026-10-20T09:00:00+07:00', status: 'PENDING' },
      }),
    ],
  },
];

function find(id: string): Transition {
  const row = mockRows.find((item) => item.id === id);
  if (!row) throw new Error('Transisi tidak ditemukan.');
  return row;
}

function findTask(transitionId: string, taskId: string): TransitionTask {
  const row = find(transitionId).tasks.find((item) => item.id === taskId);
  if (!row) throw new Error('Task tidak ditemukan.');
  return row;
}

/**
 * Menutup transisi begitu seluruh task selesai — kecuali OFFBOARDING, yang
 * status terminalnya ditahan gerbang clearance (FSD §5.3).
 */
function maybeComplete(row: Transition) {
  // Gerbang OUT dulu (§7.23.4): bagian IN baru dibuka sesudah seluruh OUT tuntas.
  const outOpen = row.tasks.some((item) => item.side === 'RELINQUISH' && !['COMPLETED', 'WAIVED', 'SKIPPED'].includes(item.status));
  if (!outOpen) {
    const today = new Date().toISOString().slice(0, 10);
    row.tasks.forEach((item) => {
      if (item.side === 'PROVISION' && item.status === 'PENDING' && !item.dependsOn) {
        item.status = 'RELEASED';
        item.releasedAt = today;
      }
    });
  }
  const allDone = row.tasks.length > 0 && row.tasks.every((item) => ['COMPLETED', 'WAIVED', 'SKIPPED'].includes(item.status));
  if (allDone && row.type !== 'OFFBOARDING') row.status = 'COMPLETED';
}

const OPEN_STATUSES = ['IN_APPROVAL', 'IN_PROGRESS'];

export interface MyTask {
  transitionId: string;
  transitionType: TransitionType;
  subjectName: string;
  effectiveDate: string;
  task: TransitionTask;
  isOverdue: boolean;
}

export interface Escalation {
  transitionId: string;
  employeeId: string;
  employee: string;
  type: TransitionType;
  tasks: TransitionTask[];
}

const addDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

function queuedTask(name: string, reason: HrQueueReason): TransitionTask {
  return {
    ...task(name, 'HR Manager', 'NONE', 'PENDING', '', ''),
    hrQueue: { reason, at: new Date().toISOString(), status: 'PENDING' },
  };
}

/** Pembagian §7.23.5: orang layak pertama yang bukan subjek/pengaju (dan bukan petugas, untuk penyetuju). */
function pickAssignee(list: string[], exclude: (string | undefined | null)[]): string | null {
  return list.find((id) => isEligible(id) && !exclude.includes(id)) ?? null;
}

/** Pasang paket dari setup terpilih, atau antre NO_SETUP bila tidak ada setup. */
function birthTasks(row: Transition) {
  const setup = pickSetup(row.type, row.branch);
  if (!setup) {
    row.tasks = [queuedTask('No materialization setup', 'NO_SETUP')];
    return;
  }
  row.setupId = setup.setupId;
  row.setupVersion = setup.version;
  row.tasks = tasksFromSetup(setup, row);
}

/** Bekukan isi setup ke transisi (§7.23.4); catatan fasilitas kosong ⇒ tugas fasilitas tidak lahir. */
function tasksFromSetup(setup: MaterializationSetup, tr: Transition): TransitionTask[] {
  const today = new Date().toISOString().slice(0, 10);
  return setup.tasks
    .filter((item) => !item.locked)
    .filter((item) => item.code !== 'FACILITY_PROVISION' || tr.facilityProvidedNote)
    .filter((item) => item.code !== 'FACILITY_WITHDRAWAL' || tr.facilityWithdrawnNote)
    .map((item) => {
      const handlerId = pickAssignee(item.handlers, [tr.employeeId, tr.requesterId]);
      const approverId = item.approvalRequired ? pickAssignee(item.approvers, [tr.employeeId, tr.requesterId, handlerId]) : null;
      const gated = setup.outFirstGate && item.side === 'PROVISION' && setup.tasks.some((other) => other.side === 'RELINQUISH');
      const base = task(item.name, handlerId ? personName(handlerId) : 'Unassigned', item.side, gated ? 'PENDING' : 'RELEASED', gated ? '' : today, addDays(item.durationDays), {
        handlerId,
        approverId,
        approvalRequired: item.approvalRequired,
        twoParty: item.twoParty,
      });
      if (!handlerId || (item.approvalRequired && !approverId)) {
        base.hrQueue = { reason: 'NO_ELIGIBLE_ASSIGNEE', at: new Date().toISOString(), status: 'PENDING' };
      }
      return base;
    });
}
/** Transisi struktural = pindah/keluar. Onboarding adalah awal kerja, bukan perpindahan. */
const STRUCTURAL: TransitionType[] = ['TRANSFER', 'OFFBOARDING'];

/**
 * Koneksi antar modul (tanpa API): materialisasi New Joiner memulai transisi
 * ONBOARDING (UIC-EMPLOYEE §4.4 "onboarding dimulai"). Task lahir segar —
 * yang punya dependensi PENDING, sisanya RELEASED.
 */
export function startOnboardingForNewJoiner(input: { name: string; positionLabel: string; effectiveDate: string }): Transition {
  const today = new Date().toISOString().slice(0, 10);
  const row: Transition = {
    id: `TR-2026-0${600 + mockRows.length}`,
    employee: input.name,
    type: 'ONBOARDING',
    from: '—',
    to: input.positionLabel,
    detail: 'New joiner onboarding',
    effectiveDate: input.effectiveDate,
    status: 'IN_PROGRESS',
    tasks: spawnTasks('ONBOARDING').map((item) => ({
      ...item,
      status: item.dependsOn ? 'PENDING' : 'RELEASED',
      releasedAt: item.dependsOn ? '' : today,
    })),
  };
  mockRows = [row, ...mockRows];
  return row;
}

export const transitionService = {
  async list(): Promise<Transition[]> {
    if (MOCK) {
      await delay();
      return mockRows.map((row) => ({ ...row, tasks: row.tasks.map((item) => ({ ...item })) }));
    }
    const { data } = await api.get<{ rows: Transition[] }>('/transitions');
    return data.rows;
  },

  async get(id: string): Promise<Transition> {
    if (MOCK) {
      await delay(200);
      const row = find(id);
      return { ...row, tasks: row.tasks.map((item) => ({ ...item })) };
    }
    const { data } = await api.get<Transition>(`/transitions/${id}`);
    return data;
  },

  async create(draft: TransitionDraft, requesterId?: string): Promise<Transition> {
    if (MOCK) {
      await delay();
      const employee = labelOf(EMPLOYEE_OPTIONS, draft.employeeId).split(' — ')[0];

      // Guard server UIC-EMPLOYEE §5.1 — form sudah memvalidasi, server tetap menegakkan.
      if (draft.type === 'TRANSFER' && !draft.subtype) throw new Error('422 — transition_subtype wajib untuk TRANSFER.');
      if (
        draft.type === 'TRANSFER' &&
        (draft.subtype === 'PROMOTION' || draft.subtype === 'DEMOTION') &&
        !draft.targetJobGradeId
      ) {
        throw new Error('422 — target_job_grade_id wajib untuk PROMOTION/DEMOTION.');
      }
      if (draft.type === 'OFFBOARDING' && !draft.reason) throw new Error('422 — reason_category wajib untuk OFFBOARDING.');
      if (
        STRUCTURAL.includes(draft.type) &&
        mockRows.some((row) => row.employee === employee && STRUCTURAL.includes(row.type) && OPEN_STATUSES.includes(row.status))
      ) {
        throw new Error(`409 — ${employee} masih punya transisi struktural terbuka; hanya satu per karyawan (VAL-HRIS-109).`);
      }
      const destination = labelOf(DESTINATION_OPTIONS, draft.destinationPositionId);
      const subtypeLabel = labelOf(SUBTYPE_OPTIONS, draft.subtype);
      const reasonLabel = labelOf(REASON_OPTIONS, draft.reason);

      let detail = 'New joiner onboarding';
      if (draft.type === 'TRANSFER') {
        detail = `${subtypeLabel} → ${destination}`;
        if (draft.targetJobGradeId) detail += ` · ${labelOf(TARGET_GRADE_OPTIONS, draft.targetJobGradeId)}`;
      }
      if (draft.type === 'OFFBOARDING') detail = reasonLabel;

      const row: Transition = {
        // Transfer masuk antrean persetujuan parent-chain sebelum task lahir.
        id: `TR-2026-0${500 - mockRows.length}`,
        employee,
        type: draft.type,
        subtype: draft.type === 'TRANSFER' ? (draft.subtype as TransferSubtype) : undefined,
        reason: draft.type === 'OFFBOARDING' ? (draft.reason as OffboardingReason) : undefined,
        from: '—',
        to: draft.type === 'TRANSFER' ? destination : '—',
        detail,
        effectiveDate: draft.effectiveDate,
        status: draft.type === 'TRANSFER' ? 'IN_APPROVAL' : 'IN_PROGRESS',
        targetJobGradeId: draft.targetJobGradeId || undefined,
        employeeId: draft.employeeId,
        requesterId: requesterId ?? undefined,
        branch: labelOf(EMPLOYEE_OPTIONS, draft.employeeId).split(', ')[1],
        facilityProvidedNote: draft.facilityProvidedNote?.trim() || undefined,
        facilityWithdrawnNote: draft.facilityWithdrawnNote?.trim() || undefined,
        tasks: [],
      };
      // Transfer menunggu persetujuan parent-chain; paket tugas lahir saat disetujui (§7.23.4).
      if (row.status !== 'IN_APPROVAL') birthTasks(row);
      mockRows = [row, ...mockRows];
      return row;
    }
    const { data } = await api.post<Transition>('/transitions', draft);
    return data;
  },

  /** PIC menandai selesai. Task dua pihak lanjut ke AWAITING_CONFIRM. */
  async completeTask(transitionId: string, taskId: string): Promise<TaskStatus> {
    if (MOCK) {
      await delay(200);
      const row = findTask(transitionId, taskId);
      if (row.status !== 'RELEASED' && row.status !== 'IN_PROGRESS') {
        throw new Error(`409 — task berstatus ${row.status}; hanya task RELEASED/IN_PROGRESS yang bisa diselesaikan.`);
      }
      const twoParty = row.twoParty ?? TWO_PARTY.test(row.name);
      row.status = twoParty ? 'AWAITING_CONFIRM' : row.approvalRequired ? 'AWAITING_APPROVAL' : 'COMPLETED';
      maybeComplete(find(transitionId));
      return row.status;
    }
    const { data } = await api.post<{ status: TaskStatus }>(
      `/transitions/${transitionId}/tasks/${taskId}/complete`,
    );
    return data.status;
  },

  async confirmTask(transitionId: string, taskId: string): Promise<void> {
    if (MOCK) {
      await delay(200);
      const row = findTask(transitionId, taskId);
      if (row.status !== 'AWAITING_CONFIRM') {
        throw new Error(`409 — task berstatus ${row.status}; konfirmasi hanya dari AWAITING_CONFIRM.`);
      }
      row.status = row.approvalRequired ? 'AWAITING_APPROVAL' : 'COMPLETED';
      maybeComplete(find(transitionId));
      return;
    }
    await api.post(`/transition-tasks/${taskId}/confirm`);
  },

  /** `POST /transition-tasks/{id}/waive` (UIC-EMPLOYEE §5.4) — task yang sudah terminal ditolak 409. */
  async waiveTask(
    transitionId: string,
    taskId: string,
    payload: { control: 'STANDARD' | 'ELEVATED'; reason: string },
  ): Promise<void> {
    if (MOCK) {
      await delay(200);
      const row = findTask(transitionId, taskId);
      if (row.status === 'COMPLETED' || row.status === 'WAIVED') {
        throw new Error('409 — task sudah terminal; waive hanya untuk task yang belum selesai.');
      }
      row.status = 'WAIVED';
      row.skipReason = payload.reason;
      row.waiveControl = payload.control;
      maybeComplete(find(transitionId));
      return;
    }
    await api.post(`/transition-tasks/${taskId}/waive`, { waive_reason: payload.reason });
  },

  /** TR-CLEARANCE force-release — elevated, tercatat di audit log. */
  async forceRelease(transitionId: string, reason: string): Promise<void> {
    if (MOCK) {
      await delay();
      const row = find(transitionId);
      row.tasks.forEach((item) => {
        if (item.clearanceBlocking && item.status !== 'COMPLETED') item.status = 'COMPLETED';
      });
      row.status = 'COMPLETED';
      return;
    }
    await api.post(`/transitions/${transitionId}/force-release`, { reason });
  },

  /** §7.24 MT3 — penyetuju ≠ petugas/pengaju; hanya dari AWAITING_APPROVAL. */
  async approveTask(viewer: string, transitionId: string, taskId: string): Promise<void> {
    if (MOCK) {
      await delay(200);
      const tr = find(transitionId);
      const row = findTask(transitionId, taskId);
      if (row.approverId !== viewer) throw new Error('403 EMP-AUZ-711 — Anda bukan penyetuju tugas ini.');
      if (row.status !== 'AWAITING_APPROVAL') throw new Error('409 EMP-BIZ-670 — tugas tidak sedang menunggu persetujuan.');
      if (row.handlerId === viewer || tr.requesterId === viewer) throw new Error('409 EMP-BIZ-671 — penyetuju tidak boleh pelaksana atau pengaju.');
      row.status = 'COMPLETED';
      maybeComplete(tr);
      return;
    }
    await api.post(`/employee/transition-tasks/${taskId}/approve`);
  },

  /** §7.24 MT4 — alasan wajib; tugas kembali IN_PROGRESS, konfirmasi karyawan diulang. */
  async rejectTask(viewer: string, transitionId: string, taskId: string, reason: string): Promise<void> {
    if (!reason.trim()) throw new Error('422 EMP-VAL-717 — alasan penolakan wajib diisi.');
    if (MOCK) {
      await delay(200);
      const row = findTask(transitionId, taskId);
      if (row.approverId !== viewer) throw new Error('403 EMP-AUZ-711 — Anda bukan penyetuju tugas ini.');
      if (row.status !== 'AWAITING_APPROVAL') throw new Error('409 EMP-BIZ-670 — tugas tidak sedang menunggu persetujuan.');
      row.status = 'IN_PROGRESS';
      row.rejectReason = reason.trim();
      return;
    }
    await api.post(`/employee/transition-tasks/${taskId}/reject`, { reason });
  },

  /** §7.24 MT1 — inbox petugas/penyetuju; transisi CANCELLED tidak tampil. */
  async myTasks(viewer: string, tab: 'handler' | 'approver'): Promise<MyTask[]> {
    if (MOCK) {
      await delay(150);
      const today = new Date().toISOString().slice(0, 10);
      return mockRows
        .filter((tr) => tr.status !== 'CANCELLED')
        .flatMap((tr) =>
          tr.tasks
            .filter((item) =>
              tab === 'handler'
                ? item.handlerId === viewer && HANDLER_OPEN.includes(item.status)
                : item.approverId === viewer && item.status === 'AWAITING_APPROVAL',
            )
            .map((item) => ({
              transitionId: tr.id,
              transitionType: tr.type,
              subjectName: tr.employee,
              effectiveDate: tr.effectiveDate,
              task: { ...item },
              isOverdue: Boolean(item.dueAt) && item.dueAt < today && (item.status === 'RELEASED' || item.status === 'IN_PROGRESS'),
            })),
        );
    }
    const { data } = await api.get<MyTask[]>('/employee/my-transition-tasks', { params: { tab } });
    return data;
  },

  /** §7.24 MT2 / §7.22 OQ1 — antrean HR Manager, dikelompokkan per karyawan. */
  async escalations(): Promise<Escalation[]> {
    if (MOCK) {
      await delay(150);
      return mockRows
        .map((tr) => ({
          transitionId: tr.id,
          employeeId: tr.employeeId ?? tr.id,
          employee: tr.employee,
          type: tr.type,
          tasks: tr.tasks.filter((item) => item.hrQueue?.status === 'PENDING').map((item) => ({ ...item })),
        }))
        .filter((row) => row.tasks.length > 0);
    }
    const { data } = await api.get<Escalation[]>('/employee/transition-escalations');
    return data;
  },

  /** §7.22 OQ2 — tutup antrean onboarding satu karyawan; catatan ≤500. */
  async closeQueue(transitionId: string, note: string): Promise<number> {
    if (note.trim().length > 500) throw new Error('422 EMP-VAL-703 — catatan maksimal 500 karakter.');
    if (MOCK) {
      await delay(200);
      const pending = find(transitionId).tasks.filter((item) => item.hrQueue?.status === 'PENDING');
      if (!pending.length) throw new Error('404 EMP-NFD-704 — tidak ada antrean terbuka untuk karyawan ini.');
      pending.forEach((item) => {
        item.hrQueue = { ...item.hrQueue!, status: 'CLOSED', note: note.trim() || undefined };
      });
      return pending.length;
    }
    const tr = find(transitionId);
    const { data } = await api.post<{ closed_tasks: number }>(`/employee/onboarding-closure-queue/${tr.employeeId}/close`, { note });
    return data.closed_tasks;
  },

  /** §7.26 ES1 — transisi milik karyawan login. */
  async myTransitions(employeeId: string): Promise<Transition[]> {
    if (MOCK) {
      await delay(150);
      return mockRows
        .filter((row) => row.employeeId === employeeId)
        .map((row) => ({ ...row, tasks: row.tasks.filter((item) => item.status !== 'SKIPPED').map((item) => ({ ...item })) }));
    }
    const { data } = await api.get<Transition[]>('/employee/my-transitions');
    return data;
  },

  /**
   * Mock saja — pengganti `workflow.process.completed` persetujuan parent-chain (K9):
   * transisi berjalan dan paket tugasnya lahir.
   */
  async completeApprovalWorkflow(transitionId: string): Promise<Transition> {
    await delay(200);
    const row = find(transitionId);
    if (row.status !== 'IN_APPROVAL') throw new Error('409 — transisi ini tidak sedang menunggu persetujuan.');
    row.status = 'IN_PROGRESS';
    birthTasks(row);
    return { ...row, tasks: row.tasks.map((item) => ({ ...item })) };
  },
};
