import type { SelectOption } from '@/components/form/SelectField';

/**
 * New Joiner Submission — FSD §4.1–4.3 · UIC §4.1–4.3.
 *
 * Alur maker/checker: DRAFT → SUBMITTED → (IN_APPROVAL) → APPROVED
 * → MATERIALIZED. Approve menahan kursi sampai `seatExpiry`; kandidat saingan
 * di posisi yang sama otomatis REJECTED.
 */
export type CandidateStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'IN_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'MATERIALIZED'
  | 'CANCELLED'
  | 'EXPIRED';

/** MbV (UIC §1.7): identitas bercabang mengikuti kewarganegaraan. */
export type Nationality = 'CITIZEN' | 'FOREIGNER';

export interface Candidate {
  id: string;
  name: string;
  email: string;
  positionId: string;
  requisitionId: string;
  nationality: Nationality;
  /**
   * KTP dikirim **transient** — tidak pernah disimpan mentah (UIC §1.7).
   * Yang tersimpan hanya 4 digit terakhir untuk dedup identitas.
   */
  idCardLast4: string;
  passportNumber: string;
  intendedJoinDate: string;
  status: CandidateStatus;
  maker: string;
  /** Diisi saat APPROVED — kursi ditahan sampai tanggal ini. */
  seatExpiry?: string;
  checkerNote?: string;
  jobGradeId?: string;
}

/** Payload NJ-CREATE. `idCardNumber` 16 digit transient, bukan bagian `Candidate`. */
export interface CandidateDraft {
  positionId: string;
  requisitionId: string;
  name: string;
  nationality: Nationality;
  idCardNumber: string;
  passportNumber: string;
  email: string;
  intendedJoinDate: string;
}

export interface MaterializePayload {
  id: string;
  joinDate: string;
  jobGradeId: string;
  contractFileName: string;
}

export const STATUS_LABEL: Record<CandidateStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  IN_APPROVAL: 'In approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  MATERIALIZED: 'Materialised',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
};

/** Urutan tampil: yang menunggu aksi lebih dulu. */
export const STATUS_ORDER: CandidateStatus[] = [
  'SUBMITTED',
  'IN_APPROVAL',
  'APPROVED',
  'MATERIALIZED',
  'DRAFT',
  'REJECTED',
  'EXPIRED',
  'CANCELLED',
];

export const NATIONALITY_LABEL: Record<Nationality, string> = {
  CITIZEN: 'Citizen (WNI)',
  FOREIGNER: 'Foreigner (WNA)',
};

export const POSITION_OPTIONS: SelectOption[] = [
  { value: 'pos-be', label: 'Backend Engineer — Engineering HQ' },
  { value: 'pos-fin', label: 'Staff Finance — BR-Papua' },
  { value: 'pos-hrbp', label: 'HRBP — People Ops HQ' },
  { value: 'pos-sales', label: 'Sales Executive — BR-Surabaya' },
];

/** Kosong = kursi vacant; Radix Select tidak menerima item bernilai '', jadi
 *  keadaan "tanpa requisition" diwakili placeholder. */
export const REQUISITION_OPTIONS: SelectOption[] = [
  { value: 'REQ-0230', label: 'REQ-0230 — Engineering HQ' },
  { value: 'REQ-0231', label: 'REQ-0231 — Finance BR-Papua' },
];

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
