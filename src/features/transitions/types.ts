import type { SelectOption } from '@/components/form/SelectField';

/**
 * Transition — satu kerangka untuk Onboarding, Transfer/Promosi, dan
 * Offboarding (FSD §5 · UIC §5).
 *
 * Setiap transisi melahirkan task ber-PIC. Perpindahan struktural terjadi
 * **atomik pada tanggal efektif** setelah task wajib selesai.
 */
export type TransitionType = 'ONBOARDING' | 'TRANSFER' | 'OFFBOARDING';

/** `emp_transition.status` — 4 varian (FSD §5.4). */
export type TransitionStatus = 'IN_APPROVAL' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

/** `emp_transition_task.task_status` — 7 varian, TIDAK boleh diratakan (FSD §5.4). */
export type TaskStatus =
  | 'PENDING'
  | 'RELEASED'
  | 'IN_PROGRESS'
  | 'AWAITING_CONFIRM'
  | 'COMPLETED'
  | 'WAIVED'
  | 'SKIPPED';

/** Sisi task: unit asal melepas, unit tujuan menyiapkan. */
export type TaskSide = 'RELINQUISH' | 'PROVISION' | 'NONE';

export type TransferSubtype = 'LATERAL' | 'PROMOTION' | 'DEMOTION' | 'RELOCATION' | 'MUTUAL';

export type OffboardingReason = 'RESIGN' | 'CONTRACT_END' | 'TERMINATION' | 'LAYOFF' | 'RETIREMENT';

export interface TransitionTask {
  id: string;
  name: string;
  owner: string;
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
  /** Kelas kontrol saat di-waive (D3): STANDARD / ELEVATED. */
  waiveControl?: 'STANDARD' | 'ELEVATED';
  /**
   * `timed_out_at` — flag pendamping (UIC §5.3). Menandai "lewat tenggat"
   * TANPA mengubah `task_status`.
   */
  timedOut?: boolean;
}

export interface Transition {
  id: string;
  employee: string;
  type: TransitionType;
  subtype?: TransferSubtype;
  reason?: OffboardingReason;
  from: string;
  to: string;
  detail: string;
  effectiveDate: string;
  status: TransitionStatus;
  targetJobGradeId?: string;
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
}

export const TYPE_LABEL: Record<TransitionType, string> = {
  ONBOARDING: 'Onboarding',
  TRANSFER: 'Transfer',
  OFFBOARDING: 'Offboarding',
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
  AWAITING_CONFIRM: 'Awaiting confirm',
  COMPLETED: 'Completed',
  WAIVED: 'Waived',
  SKIPPED: 'Skipped',
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

export const SUBTYPE_OPTIONS: SelectOption[] = [
  { value: 'LATERAL', label: 'Lateral' },
  { value: 'PROMOTION', label: 'Promotion' },
  { value: 'DEMOTION', label: 'Demotion' },
  { value: 'RELOCATION', label: 'Relocation' },
  { value: 'MUTUAL', label: 'Mutual transfer' },
];

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

export const REASON_OPTIONS: SelectOption[] = [
  { value: 'RESIGN', label: 'Resignation (voluntary)' },
  { value: 'CONTRACT_END', label: 'Contract end' },
  { value: 'TERMINATION', label: 'Termination (with cause)' },
  { value: 'LAYOFF', label: 'Layoff' },
  { value: 'RETIREMENT', label: 'Retirement' },
];

/** Sub-tipe yang mewajibkan target job grade (bukan sekadar posisi struktural). */
export const GRADE_REQUIRED_SUBTYPES = ['PROMOTION', 'DEMOTION'];

/** Catatan alur per tipe — ditampilkan di modal pembuatan. */
export const FLOW_NOTE: Record<TransitionType, string> = {
  ONBOARDING:
    'Melahirkan task IT, GA, dan HR. Karyawan mengonfirmasi penerimaan perangkat untuk menutup task dua pihak.',
  TRANSFER:
    'Melahirkan task dua sisi — unit asal melepas, unit tujuan menyiapkan. Diblokir bila masih ada transisi struktural lain yang terbuka.',
  OFFBOARDING:
    'Menjalankan task clearance. Status terminal ditahan sampai task clearance-blocking bersih atau di-force-release oleh approver elevated.',
};

/** Penjelasan daur hidup per tipe — ditampilkan di halaman detail. */
export const LIFECYCLE_NOTE: Record<TransitionType, string> = {
  TRANSFER:
    'Perpindahan dua sisi — unit asal melepas, unit tujuan menyiapkan. Posisi berpindah atomik saat tanggal efektif tiba dan seluruh task wajib selesai. Diblokir bila ada transisi struktural lain yang terbuka (maksimal satu per karyawan).',
  ONBOARDING:
    'Dipicu setelah materialisasi New Joiner (kontrak ditandatangani). Task menyiapkan akses dan aset; status kepegawaian berubah aktif otomatis pada tanggal mulai — menyelesaikan task tidak mengubahnya langsung.',
  OFFBOARDING:
    'reason_category menentukan jalurnya: resign / contract-end / retirement menjalani notice period (tetap dibayar sampai tanggal keluar); termination-with-cause berlaku seketika (akses dicabut). Task clearance-blocking menahan status terminal.',
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
