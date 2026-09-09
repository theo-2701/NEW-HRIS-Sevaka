import { api } from '@/services/api';
import {
  DESTINATION_OPTIONS,
  EMPLOYEE_OPTIONS,
  REASON_OPTIONS,
  SUBTYPE_OPTIONS,
  TARGET_GRADE_OPTIONS,
  labelOf,
} from '@/features/transitions/types';
import type {
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
const MOCK = !import.meta.env.VITE_API_BASE_URL;
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
      task('Create IT accounts', 'IT Jakarta HQ', 'PROVISION', 'COMPLETED', '2026-07-02', '2026-07-10'),
      task('Assign laptop & access card', 'GA Jakarta HQ', 'PROVISION', 'IN_PROGRESS', '2026-07-02', '2026-07-12'),
      task('Payroll & tax registration', 'HR Jakarta HQ', 'PROVISION', 'RELEASED', '2026-07-02', '2026-07-14'),
      task('Confirm equipment received', 'Employee', 'PROVISION', 'PENDING', '', '2026-07-15', {
        dependsOn: 'Assign laptop & access card',
      }),
    ];
  }
  if (type === 'TRANSFER') {
    return [
      task('Handover open work', 'Supervisor Finance Papua', 'RELINQUISH', 'COMPLETED', '2026-12-02', '2026-12-05'),
      task('Return regional assets (laptop)', 'GA Papua', 'RELINQUISH', 'AWAITING_CONFIRM', '2026-12-02', '2026-12-06'),
      task('Verify identity in new unit', 'HR Jakarta HQ', 'PROVISION', 'IN_PROGRESS', '2026-12-02', '2026-12-04', {
        timedOut: true,
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
  const allDone = row.tasks.length > 0 && row.tasks.every((item) => ['COMPLETED', 'WAIVED', 'SKIPPED'].includes(item.status));
  if (allDone && row.type !== 'OFFBOARDING') row.status = 'COMPLETED';
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

  async create(draft: TransitionDraft): Promise<Transition> {
    if (MOCK) {
      await delay();
      const employee = labelOf(EMPLOYEE_OPTIONS, draft.employeeId).split(' — ')[0];
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
        tasks: draft.type === 'TRANSFER' ? [] : spawnTasks(draft.type),
      };
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
      row.status = TWO_PARTY.test(row.name) ? 'AWAITING_CONFIRM' : 'COMPLETED';
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
      findTask(transitionId, taskId).status = 'COMPLETED';
      maybeComplete(find(transitionId));
      return;
    }
    await api.post(`/transitions/${transitionId}/tasks/${taskId}/confirm`);
  },

  /** GAP `PROB-FRONTEND-003` — endpoint waive belum ditegaskan di kontrak. */
  async waiveTask(
    transitionId: string,
    taskId: string,
    payload: { control: 'STANDARD' | 'ELEVATED'; reason: string },
  ): Promise<void> {
    if (MOCK) {
      await delay(200);
      const row = findTask(transitionId, taskId);
      row.status = 'WAIVED';
      row.skipReason = payload.reason;
      row.waiveControl = payload.control;
      maybeComplete(find(transitionId));
      return;
    }
    await api.post(`/transitions/${transitionId}/tasks/${taskId}/waive`, payload);
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
};
