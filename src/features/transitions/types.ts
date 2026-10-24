import type { SelectOption } from '@/components/form/SelectField';

/**
 * Transition — satu kerangka untuk Onboarding, Transfer (Mutation/Promotion/Demotion), dan Offboarding
 * (FSD-001-EMPLOYEE 0.83 §5 · §18–§20 · UIC §5).
 *
 * Setiap transisi melahirkan task dari paket di menu Materialization; tiap task punya petugas (handlers)
 * dan, bila perlu, penyetuju (approvers). Transfer punya dua bagian: **Out** (unit asal) dan **In** (unit
 * tujuan). Perpindahan struktural terjadi atomik pada tanggal efektif setelah task wajib selesai.
 */
export type TransitionType = 'ONBOARDING' | 'TRANSFER' | 'OFFBOARDING';

/** `emp_transition.status` — 4 varian (FSD §5.4). */
export type TransitionStatus = 'IN_APPROVAL' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

/** `emp_transition_task.task_status` — TIDAK boleh diratakan (FSD §5.4; `AWAITING_APPROVAL` TSD §6.6). */
export type TaskStatus =
  | 'PENDING'
  | 'RELEASED'
  | 'IN_PROGRESS'
  | 'AWAITING_CONFIRM'
  | 'AWAITING_APPROVAL'
  | 'COMPLETED'
  | 'WAIVED'
  | 'SKIPPED';

/** Bagian task: RELINQUISH = Out (unit asal), PROVISION = In (unit tujuan). */
export type TaskSide = 'RELINQUISH' | 'PROVISION' | 'NONE';

export type TransferSubtype = 'LATERAL' | 'PROMOTION' | 'DEMOTION' | 'RELOCATION' | 'MUTUAL_TRANSFER';

export type OffboardingReason =
  | 'RESIGN'
  | 'CONTRACT_END'
  | 'TERMINATION'
  | 'LAYOFF'
  | 'RETIREMENT'
  | 'DECEASED'
  | 'CANCELLED_BEFORE_START';

/** Alasan antrean Escalations (FSD §18.1). */
export type EscalationReason = 'NO_SETUP' | 'NO_ASSIGNEE' | 'CONFLICT' | 'PAST_EFFECTIVE';

/** Alasan antrean Onboarding Closure (FSD §16.1). */
export type ClosureReason = 'ACCESS_CANCELLED' | 'MOVED_POSITION' | 'APPROVAL_CANCELLED';

export interface TransitionTask {
  id: string;
  name: string;
  /** Kode task (paket Materialization). */
  code?: string;
  /** Tim / petugas utama yang tampil di kartu. */
  owner: string;
  /** Petugas berurutan (FSD §17.2). */
  handlers?: string[];
  /** Penyetuju berurutan — ada bila task wajib persetujuan. */
  approvers?: string[];
  requiresApproval?: boolean;
  /** Dua-pihak: petugas selesai ⇒ karyawan subjek mengonfirmasi. */
  twoParty?: boolean;
  side: TaskSide;
  status: TaskStatus;
  releasedAt: string;
  dueAt: string;
  /** Menahan status terminal offboarding sampai bersih (TR-CLEARANCE). */
  clearanceBlocking?: boolean;
  /** Task lain yang harus selesai lebih dulu. */
  dependsOn?: string;
  /** Alasan SKIPPED/WAIVED — ikut tercatat di audit. */
  skipReason?: string;
  /** Alasan penyetuju mengembalikan task (MTT-REJECT). */
  rejectReason?: string;
  /** Kelas kontrol saat di-waive (D3): STANDARD / ELEVATED. */
  waiveControl?: 'STANDARD' | 'ELEVATED';
  /** Task asset: selesai otomatis dari event Asset; aksi = buka menu Asset (TSU-D31). */
  asset?: boolean;
  /** `timed_out_at` — flag pendamping, TANPA mengubah `task_status`. */
  timedOut?: boolean;
}

export interface Transition {
  id: string;
  employee: string;
  employeeNik?: string;
  branch?: string;
  requester?: string;
  type: TransitionType;
  subtype?: TransferSubtype;
  reason?: OffboardingReason;
  from: string;
  to: string;
  detail: string;
  effectiveDate: string;
  status: TransitionStatus;
  targetJobGradeId?: string;
  /** Catatan fasilitas (FSD §19.2) — hanya terbaca petugas, penyetuju, HR, dan karyawan subjek. */
  facilityProvided?: string;
  facilityWithdrawn?: string;
  /** Transfer: bagian In terbuka sesudah seluruh Out selesai (TSU-D5). */
  inOpensAfterOut?: boolean;
  escalation?: EscalationReason;
  /** Onboarding yang berakhir sebelum semua task selesai (antrean Onboarding Closure). */
  closure?: { reason: ClosureReason; queuedAt: string };
  tasks: TransitionTask[];
}

export interface TransitionDraft {
  type: TransitionType;
  employeeId: string;
  subtype: string;
  destinationPositionId: string;
  targetJobGradeId: string;
  reason: string;
  effectiveDate: string;
  facilityProvided: string;
  facilityWithdrawn: string;
}

/** Tombol ajukan di TR-LIST (FSD §19.1): Onboarding lahir dari materialisasi, bukan dari sini. */
export type CreateKind = 'OFFBOARDING' | 'MUTATION' | 'PROMOTION' | 'DEMOTION';

export const CREATE_KIND_LABEL: Record<CreateKind, string> = {
  OFFBOARDING: 'New offboarding',
  MUTATION: 'New mutation',
  PROMOTION: 'New promotion',
  DEMOTION: 'New demotion',
};

export const TYPE_LABEL: Record<TransitionType, string> = {
  ONBOARDING: 'Onboarding',
  TRANSFER: 'Transfer',
  OFFBOARDING: 'Offboarding',
};

export const SUBTYPE_LABEL: Record<TransferSubtype, string> = {
  LATERAL: 'Lateral',
  PROMOTION: 'Promotion',
  DEMOTION: 'Demotion',
  RELOCATION: 'Relocation',
  MUTUAL_TRANSFER: 'Mutual transfer',
};

export const TRANSITION_STATUS_LABEL: Record<TransitionStatus, string> = {
  IN_APPROVAL: 'In approval',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  PENDING: 'Pending',
  RELEASED: 'Released',
  IN_PROGRESS: 'In progress',
  AWAITING_CONFIRM: 'Awaiting confirmation',
  AWAITING_APPROVAL: 'Awaiting approval',
  COMPLETED: 'Completed',
  WAIVED: 'Waived',
  SKIPPED: 'Skipped',
};

export const SIDE_LABEL: Record<TaskSide, string> = { RELINQUISH: 'Out', PROVISION: 'In', NONE: '—' };

export const ESCALATION_LABEL: Record<EscalationReason, string> = {
  NO_SETUP: 'No setup for this branch',
  NO_ASSIGNEE: 'No eligible assignee',
  CONFLICT: 'Conflict of interest left nobody',
  PAST_EFFECTIVE: 'Past the effective date',
};

export const CLOSURE_REASON_LABEL: Record<ClosureReason, string> = {
  ACCESS_CANCELLED: "The employee's access was cancelled",
  MOVED_POSITION: 'The employee moved to a new position',
  APPROVAL_CANCELLED: 'The onboarding approval was cancelled',
};

/** Urutan daur hidup yang dipakai stepper detail. */
export const STEP_ORDER: TransitionStatus[] = ['IN_APPROVAL', 'IN_PROGRESS', 'COMPLETED'];

export const STEP_SUB: Record<string, string> = {
  IN_APPROVAL: 'Parent-chain review',
  IN_PROGRESS: 'Tasks running',
  COMPLETED: 'Move applied',
};

export const EMPLOYEE_OPTIONS: SelectOption[] = [
  { value: 'emp-eka', label: 'Eka Saputra — Staff Finance, BR-Papua' },
  { value: 'emp-dimas', label: 'Dimas Prabowo — Backend Engineer, HQ' },
  { value: 'emp-nadia', label: 'Nadia Rahman — Sales Executive, BR-Surabaya' },
  { value: 'emp-fajar', label: 'Fajar Nugroho — Ops Coordinator, BR-Jakarta' },
];

export const SUBTYPE_OPTIONS: SelectOption[] = (Object.keys(SUBTYPE_LABEL) as TransferSubtype[]).map((value) => ({
  value,
  label: SUBTYPE_LABEL[value],
}));

/** "New mutation" = transfer tanpa naik/turun golongan. */
export const MUTATION_SUBTYPES: TransferSubtype[] = ['LATERAL', 'RELOCATION', 'MUTUAL_TRANSFER'];

export const DESTINATION_OPTIONS: SelectOption[] = [
  { value: 'pos-senior-fin', label: 'Senior Finance — HQ' },
  { value: 'pos-lead-ops', label: 'Team Lead Ops — BR-Jakarta' },
  { value: 'pos-regional-sales', label: 'Regional Sales — BR-Bali' },
];

export const TARGET_GRADE_OPTIONS: SelectOption[] = [
  { value: 'gr-3b', label: 'Class III-B · Staff' },
  { value: 'gr-4a', label: 'Class IV-A · Specialist' },
  { value: 'gr-5a', label: 'Class V-A · Supervisor' },
  { value: 'gr-6a', label: 'Class VI-A · Manager' },
];

export const REASON_LABEL: Record<OffboardingReason, string> = {
  RESIGN: 'Resignation (voluntary)',
  CONTRACT_END: 'Contract end',
  TERMINATION: 'Termination (with cause)',
  LAYOFF: 'Layoff',
  RETIREMENT: 'Retirement',
  DECEASED: 'Deceased',
  CANCELLED_BEFORE_START: 'Access cancelled before start',
};

/** Pilihan form — `CANCELLED_BEFORE_START` hanya lahir dari Cancel access, bukan dari form. */
export const REASON_OPTIONS: SelectOption[] = (
  ['RESIGN', 'CONTRACT_END', 'TERMINATION', 'LAYOFF', 'RETIREMENT', 'DECEASED'] as OffboardingReason[]
).map((value) => ({ value, label: REASON_LABEL[value] }));

/** Sub-tipe yang mewajibkan target job grade (bukan sekadar posisi struktural). */
export const GRADE_REQUIRED_SUBTYPES = ['PROMOTION', 'DEMOTION'];

/** Catatan alur per tipe — ditampilkan di modal pembuatan. */
export const FLOW_NOTE: Record<TransitionType, string> = {
  ONBOARDING: 'Creates the IT, GA and HR tasks set up in Materialization. The employee confirms two-party tasks such as receiving a laptop.',
  TRANSFER:
    'Creates Out tasks for the old unit and In tasks for the new unit, as set up in Materialization. Blocked while the employee has another open structural transition.',
  OFFBOARDING:
    'Runs the clearance tasks. The final status waits until every clearance-blocking task is done, unless an HR Manager force-releases it.',
};

/** Penjelasan daur hidup per tipe — ditampilkan di halaman detail. */
export const LIFECYCLE_NOTE: Record<TransitionType, string> = {
  TRANSFER:
    'Two-sided move: the old unit hands over (Out) and the new unit prepares (In). The position moves on the effective date once every required task is done. Only one open structural transition per employee.',
  ONBOARDING:
    'Started when a New Joiner is materialized. Tasks prepare access and assets; the employment status turns Active on the start date — finishing tasks does not change it directly.',
  OFFBOARDING:
    'The reason decides the path: resignation, contract end and retirement run a notice period; termination and layoff take effect immediately. Deceased revokes access at once and HR confirms the handover tasks.',
};

const CLOSED_TASK: TaskStatus[] = ['COMPLETED', 'WAIVED', 'SKIPPED'];

export function isTaskClosed(task: TransitionTask): boolean {
  return CLOSED_TASK.includes(task.status);
}

export function doneCount(transition: Transition): number {
  return transition.tasks.filter(isTaskClosed).length;
}

export function progressPct(transition: Transition): number {
  if (transition.tasks.length === 0) return 0;
  return Math.round((doneCount(transition) / transition.tasks.length) * 100);
}

export function labelOf(options: SelectOption[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

/** Task milik `person` sebagai petugas (kolom handlers, atau owner lama). */
export const isHandler = (task: TransitionTask, person: string) => task.owner === person || Boolean(task.handlers?.includes(person));
export const isApprover = (task: TransitionTask, person: string) => Boolean(task.approvers?.includes(person));
