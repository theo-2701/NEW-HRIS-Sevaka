import type { SelectOption } from '@/components/form/SelectField';

/**
 * New Joiner Submission — FSD-001-EMPLOYEE 0.46 §4 · UIC §4.
 *
 * Alur: undangan email → WAITING_CANDIDATE → (kandidat mengisi portal) DRAFT → SUBMITTED
 * → (IN_APPROVAL) → APPROVED → MATERIALIZED. Sumber From ATS langsung lahir DRAFT.
 * Approve menahan kursi sampai `seatExpiry`; kandidat saingan di posisi yang sama otomatis REJECTED.
 */
export type CandidateStatus =
  | 'WAITING_CANDIDATE'
  | 'DRAFT'
  | 'SUBMITTED'
  | 'IN_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'MATERIALIZED'
  | 'CANCELLED'
  | 'EXPIRED';

/** Sumber calon di NJ-CREATE (FSD 0.46 §4.1). */
export type CandidateSource = 'EMAIL' | 'ATS';

/** MbV (UIC §1.7): identitas bercabang mengikuti kewarganegaraan. */
export type Nationality = 'CITIZEN' | 'FOREIGNER';

export interface Candidate {
  id: string;
  /** Kosong selama WAITING_CANDIDATE — diisi kandidat sendiri lewat portal. */
  name: string;
  email: string;
  /** `candidate_phone` (UIC-EMPLOYEE §4.1) — disimpan dalam bentuk `+62…`. */
  phone: string;
  positionId: string;
  requisitionId: string;
  /** '' selama WAITING_CANDIDATE. */
  nationality: Nationality | '';
  /**
   * KTP dikirim **transient** — tidak pernah disimpan mentah (UIC §1.7).
   * Yang tersimpan hanya 4 digit terakhir untuk dedup identitas.
   */
  idCardLast4: string;
  passportNumber: string;
  /** `visa_number` — wajib bila FOREIGNER, `[A-Z0-9]{6,20}` (FSD 0.20). */
  visaNumber: string;
  intendedJoinDate: string;
  status: CandidateStatus;
  maker: string;
  /**
   * ID pembuat — `created by` lama hanya snapshot nama, jadi SoD & bucket "My candidates" dicocokkan
   * lewat ID (Notulen 12 Okt 2026 §3).
   */
  makerId: string;
  /** Waktu diajukan (ISO) — antrean persetujuan diurutkan terlama dulu; kosong selama DRAFT. */
  submittedAt?: string;
  /** Diisi saat APPROVED — kursi ditahan sampai tanggal ini. */
  seatExpiry?: string;
  checkerNote?: string;
  jobGradeId?: string;
  /** Baris ATS Bridge yang memasok data calon (undangan email atau From ATS). */
  atsBridgeId?: string;
}

/** Payload NJ-CREATE 0.46: Requisition → Unit (terkunci) → Posisi, lalu sumber calon. */
export interface InviteDraft {
  requisitionId: string;
  positionId: string;
  source: CandidateSource;
  email: string;
  atsBridgeId: string;
}

/** Payload NJ-CREATE. `idCardNumber` 16 digit transient, bukan bagian `Candidate`. */
export interface CandidateDraft {
  positionId: string;
  requisitionId: string;
  name: string;
  /** '' = radio belum dipilih — keadaan awal NJ-CREATE (FSD 0.23 L2). */
  nationality: Nationality | '';
  idCardNumber: string;
  passportNumber: string;
  visaNumber: string;
  email: string;
  phone: string;
  intendedJoinDate: string;
}

export interface MaterializePayload {
  id: string;
  joinDate: string;
  jobGradeId: string;
  contractFileName: string;
  /** Wajib, maksimal 50, format bebas; kembar hanya peringatan (FSD 0.46 §4.3). */
  nik: string;
  username: string;
  companyEmail: string;
}

export const STATUS_LABEL: Record<CandidateStatus, string> = {
  WAITING_CANDIDATE: 'Waiting for Candidate',
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  IN_APPROVAL: 'In approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  MATERIALIZED: 'Materialised',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
};

/** Arti tiap status untuk legenda kolom Status — bahasa HR, bukan istilah teknis. */
export const STATUS_MEANING: Record<CandidateStatus, string> = {
  WAITING_CANDIDATE: 'The invitation was sent. The candidate has not submitted their data yet.',
  DRAFT: 'The data is in. Check it, set the intended join date, then submit.',
  SUBMITTED: 'Submitted and waiting for a checker.',
  IN_APPROVAL: 'A checker is reviewing it.',
  APPROVED: 'Approved. The seat is held until the expiry date; materialize once the contract is signed.',
  REJECTED: 'Rejected automatically because another candidate for the same position was approved.',
  MATERIALIZED: 'Now an employee with status Waiting and an Onboarding transition.',
  CANCELLED: 'Cancelled before materializing. Any invitation link no longer works.',
  EXPIRED: 'The seat hold ran out before the employee was created.',
};

/** Urutan tampil: yang menunggu aksi lebih dulu. */
export const STATUS_ORDER: CandidateStatus[] = [
  'SUBMITTED',
  'IN_APPROVAL',
  'APPROVED',
  'MATERIALIZED',
  'DRAFT',
  'WAITING_CANDIDATE',
  'REJECTED',
  'EXPIRED',
  'CANCELLED',
];

export const NATIONALITY_LABEL: Record<Nationality, string> = {
  CITIZEN: 'Citizen (WNI)',
  FOREIGNER: 'Foreigner (WNA)',
};

/** Posisi per unit organisasi (dummy company-service) — pilihan NJ-CREATE disaring menurut unit requisition. */
export const POSITIONS = [
  { value: 'pos-be', code: 'ENG-BE', name: 'Backend Engineer', unitId: 'unit-eng-hq', unit: 'Engineering HQ' },
  { value: 'pos-fe', code: 'ENG-FE', name: 'Frontend Engineer', unitId: 'unit-eng-hq', unit: 'Engineering HQ' },
  { value: 'pos-fin', code: 'FIN-STF', name: 'Staff Finance', unitId: 'unit-fin-papua', unit: 'BR-Papua' },
  { value: 'pos-hrbp', code: 'PPL-HRBP', name: 'HRBP', unitId: 'unit-people-hq', unit: 'People Ops HQ' },
  { value: 'pos-hradm', code: 'PPL-ADM', name: 'HR Administrator', unitId: 'unit-people-hq', unit: 'People Ops HQ' },
  { value: 'pos-sales', code: 'SLS-EXE', name: 'Sales Executive', unitId: 'unit-sales-sby', unit: 'BR-Surabaya' },
];

/** Label "Posisi — Unit" (Directory membaca unit dari bagian sesudah " — "). */
export const POSITION_OPTIONS: SelectOption[] = POSITIONS.map((p) => ({ value: p.value, label: `${p.name} — ${p.unit}` }));

/** Maker NJ = Super Admin · HR Manager · HR Staff; checker = HR Manager · Super Admin (FSD §4.3). */
export const isNjMaker = (role?: string) =>
  role === 'ROLE_SUPER_ADMIN' || role === 'ROLE_HR_MANAGER' || role === 'ROLE_HR_STAFF';
export const isNjChecker = (role?: string) => role === 'ROLE_HR_MANAGER' || role === 'ROLE_SUPER_ADMIN';

export const JOB_GRADE_OPTIONS: SelectOption[] = [
  { value: 'gr-2c', label: 'Class II-C · Pelaksana' },
  { value: 'gr-3a', label: 'Class III-A · Staff' },
  { value: 'gr-3b', label: 'Class III-B · Staff' },
  { value: 'gr-4a', label: 'Class IV-A · Specialist' },
  { value: 'gr-5a', label: 'Class V-A · Supervisor' },
];

export function labelOf(options: SelectOption[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value ?? '—';
}

/** Aktor yang sedang login — dipakai untuk aturan SoD (maker ≠ checker). */
export const CURRENT_USER = 'Tony Stark';
export const CURRENT_USER_ID = 'usr-tony-stark';

/** Kandidat buatan akun login — dicocokkan lewat ID. */
export const isOwnCandidate = (row: Pick<Candidate, 'makerId'>) => row.makerId === CURRENT_USER_ID;
