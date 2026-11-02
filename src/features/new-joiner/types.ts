import type { SelectOption } from '@/components/form/SelectField';

/**
 * New Joiner Submission — FSD §4.1–4.3 · UIC §4.1–4.3.
 *
 * Alur maker/checker: DRAFT → SUBMITTED → (IN_APPROVAL) → APPROVED
 * → MATERIALIZED. Approve menahan kursi sampai `seatExpiry`; kandidat saingan
 * di posisi yang sama otomatis REJECTED.
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

/** MbV (UIC §1.7): identitas bercabang mengikuti kewarganegaraan. */
export type Nationality = 'CITIZEN' | 'FOREIGNER';

export interface Candidate {
  id: string;
  name: string;
  email: string;
  /** `candidate_phone` (UIC-EMPLOYEE §4.1) — disimpan dalam bentuk `+62…`. */
  phone: string;
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
  /** Baris ATS yang menjadi sumber/tujuan undangan (TSD §7.4.1, RNJ-D2). */
  atsBridgeId?: string;
}

/** Sumber kandidat di Add Candidate (RNJ-D7). */
export type CandidateSource = 'INVITE' | 'ATS';

/** Add Candidate (TSD §7.4.1): tiga isian; data diri diisi kandidat sendiri. */
export interface InviteDraft {
  source: CandidateSource;
  requisitionId: string;
  positionId: string;
  email: string;
  atsBridgeId: string;
}

/** Isian portal kandidat (§7.4.11). KTP 16 digit transient. */
export interface CandidateProfile {
  name: string;
  nationality: Nationality;
  idCardNumber: string;
  passportNumber: string;
  phone: string;
  intendedJoinDate: string;
  cvFileName: string;
  idPhotoFileName: string;
}

/** Requisition → unit (terkunci) → posisi checklist (CATATAN 18 Okt T3). */
export const REQUISITION_DETAIL: Record<string, { unit: string; positions: string[] }> = {
  'REQ-0230': { unit: 'Engineering HQ', positions: ['pos-be'] },
  'REQ-0231': { unit: 'Finance BR-Papua', positions: ['pos-fin'] },
};

export type WorkArrangementChoice = 'WFO' | 'WFH';

/** Payload NJ-CREATE. `idCardNumber` 16 digit transient, bukan bagian `Candidate`. */
export interface CandidateDraft {
  positionId: string;
  requisitionId: string;
  name: string;
  nationality: Nationality;
  idCardNumber: string;
  passportNumber: string;
  email: string;
  phone: string;
  intendedJoinDate: string;
}

export interface MaterializePayload {
  id: string;
  joinDate: string;
  jobGradeId: string;
  contractFileName: string;
  /** Usulan server (`materialize_suggestion`); NIK kembar = peringatan, bukan tolakan. */
  nik: string;
  /** Wajib sejak T59. */
  username: string;
  companyEmail: string;
  /** FRT-2610271835 T1 — pola kerja + flag absen profil. */
  workArrangement: WorkArrangementChoice;
  radiusValidation: boolean;
  isSelfie: boolean;
}

export const STATUS_LABEL: Record<CandidateStatus, string> = {
  WAITING_CANDIDATE: 'Waiting for candidate',
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
  'WAITING_CANDIDATE',
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
