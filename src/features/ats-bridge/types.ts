/**
 * ATS Bridge (FSD-001-EMPLOYEE 0.46 §4A, UIC §4A, TSD §7.4.12) dan Portal Kandidat publik
 * (FSD §4B, UIC §4B, TSD §7.4.10–§7.4.11). Satu baris `emp_ats_bridge` per undangan kandidat.
 */

export type AtsStatus = 'WAITING_CANDIDATE' | 'COMPLETED' | 'INACTIVE' | 'USED';
export type AtsSource = 'ATS' | 'NEW_JOINER' | 'BULK_IMPORT';
export type ConsentStatus = 'AGREED' | 'DECLINED';

export const ATS_STATUS_LABEL: Record<AtsStatus, string> = {
  WAITING_CANDIDATE: 'Waiting for Candidate',
  COMPLETED: 'Completed',
  INACTIVE: 'Inactive',
  USED: 'Used',
};

export const ATS_STATUS_MEANING: Record<AtsStatus, string> = {
  WAITING_CANDIDATE: 'The invitation link was sent; the candidate has not submitted their data yet.',
  COMPLETED: 'The candidate agreed to the consent, filled in their data and uploaded the documents.',
  INACTIVE: 'Replaced by a newer record with the same email or ID card number.',
  USED: 'The candidate has become an employee; the record can no longer be picked.',
};

export const ATS_SOURCE_LABEL: Record<AtsSource, string> = {
  ATS: 'ATS Bridge',
  NEW_JOINER: 'New Joiner',
  BULK_IMPORT: 'Bulk Import',
};

export const CONSENT_LABEL = { AGREED: 'Agreed', DECLINED: 'Declined', NONE: 'Not answered' } as const;

export type Nationality = 'CITIZEN' | 'FOREIGNER';

/** Isian kandidat di portal (UIC §4B.2 #3) — snake_case di API, camelCase di layar. */
export interface CandidateProfile {
  candidateName: string;
  nationality: Nationality | '';
  idCardNumber: string;
  passportNumber: string;
  visaNumber: string;
  candidatePhone: string;
  placeOfBirth: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  lastEducation: string;
  religion: string;
  bloodType: string;
  homeOwnershipStatus: string;
  disabilityStatus: string;
  motherMaidenName: string;
  npwp: string;
  npwpName: string;
  bpjsTenagaKerjaNumber: string;
  bpjsKesehatanNumber: string;
  idCardAddress: string;
  idCardZip: ZipArea | null;
  isDomicileSameAsIdCard: boolean;
  domicileAddress: string;
  domicileZip: ZipArea | null;
}

export interface ZipArea {
  zipId: string;
  zip: string;
  provinceName: string;
  regencyName: string;
  districtName: string;
  villageName: string;
}

export interface AtsBridge {
  id: string;
  source: AtsSource;
  atsStatus: AtsStatus;
  candidateEmail: string;
  candidateName: string | null;
  consentStatus: ConsentStatus | null;
  requestorEmployeeId: string;
  requestorName: string;
  requestorNik: string;
  /** Baris lama yang digantikan (email/KTP kembar). */
  parentId: string | null;
  linkSentAt: string | null;
  linkSendCount: number;
  tokenExpiresAt: string | null;
  completedAt: string | null;
  createdAt: string;
  cvUploaded: boolean;
  idPhotoUploaded: boolean;
  usedEmployeeId: string | null;
}

export interface AtsFilter {
  keyword?: string;
  atsStatus?: AtsStatus;
  source?: AtsSource;
  consentStatus?: ConsentStatus;
}

export interface MaterializeInput {
  joinDate: string;
  jobGradeId: string;
  nik: string;
  username: string;
  companyEmail: string;
}

export type PortalStep = 'CONSENT' | 'PROFILE' | 'DOCUMENTS' | 'READY' | 'DONE';

export interface PortalState {
  step: PortalStep;
  candidateEmail: string;
  companyCode: string;
  expiresAt: string;
  consentStatus: ConsentStatus | null;
  consent: { versionNo: string; content: string } | null;
  profile: CandidateProfile;
  cvUploaded: boolean;
  idPhotoUploaded: boolean;
}

export const isAtsManager = (role?: string) =>
  role === 'ROLE_SUPER_ADMIN' || role === 'ROLE_HR_MANAGER' || role === 'ROLE_HR_STAFF';
/** Hapus kandidat: HR Manager dan Super Admin saja (UIC §4A). */
export const canDeleteAts = (role?: string) => role === 'ROLE_SUPER_ADMIN' || role === 'ROLE_HR_MANAGER';
