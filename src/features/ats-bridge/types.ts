/**
 * ATS Bridge (TSD-001-EMPLOYEE 0.212 §7.4.12; CATATAN-PERUBAHAN 19 Okt 2026 T6/T11).
 * Satu tabel ditulis tiga pintu (ATS · New Joiner · Bulk Import); kolom `source`
 * membedakannya. Data pribadi kandidat (KTP/paspor/alamat) sengaja tidak tampil.
 */
export type AtsStatus = 'WAITING_CANDIDATE' | 'COMPLETED' | 'USED';
export type AtsSource = 'ATS' | 'NEW_JOINER' | 'BULK_IMPORT';
export type ConsentStatus = 'AGREED' | 'DECLINED';
export type AtsRole = 'HR_STAFF' | 'HR_MANAGER';

export interface AtsCandidate {
  id: string;
  candidateEmail: string;
  /** Kosong sampai kandidat mengisi lewat portal. */
  candidateName: string | null;
  source: AtsSource;
  atsStatus: AtsStatus;
  consentStatus: ConsentStatus | null;
  requestorEmployeeId: string;
  linkSentAt: string | null;
  linkSendCount: number;
  tokenExpiresAt: string | null;
  completedAt: string | null;
  /** Data sebelumnya yang digantikan (RNJ-D6). */
  parentId: string | null;
  usedEmployeeId: string | null;
  /** Potret domain pilihan checker Bulk Import (§7.16.4). */
  emailDomain: string | null;
  createdAt: string;
}

export interface MaterializeDraft {
  joinDate: string;
  jobGradeId: string;
  nik: string;
  username: string;
  companyEmail: string;
}

export interface MaterializeResult {
  employeeId: string;
  username: string;
  companyEmail: string | null;
  /** Dikembalikan SEKALI untuk tim IT support; tidak disimpan di mana pun. */
  mailboxInitialPassword: string;
}

export const ATS_STATUS_LABEL: Record<AtsStatus, string> = {
  WAITING_CANDIDATE: 'Waiting for candidate',
  COMPLETED: 'Completed',
  USED: 'Used',
};

export const ATS_STATUS_MEANING: Record<AtsStatus, string> = {
  WAITING_CANDIDATE: 'Invitation sent; the candidate has not submitted their data yet. The link is valid for 24 hours and can be resent.',
  COMPLETED: 'The candidate agreed and submitted their data. Ready to be picked by a New Joiner — or, for Bulk Import, turned into an employee here.',
  USED: 'Already became an employee. Cannot be deleted.',
};

export const SOURCE_LABEL: Record<AtsSource, string> = {
  ATS: 'ATS',
  NEW_JOINER: 'New Joiner',
  BULK_IMPORT: 'Bulk Import',
};

export const canDelete = (role: AtsRole, row: AtsCandidate) => role === 'HR_MANAGER' && row.atsStatus !== 'USED';
export const canMaterialize = (row: AtsCandidate) => row.source === 'BULK_IMPORT' && row.atsStatus === 'COMPLETED';
