import type { BadgeTone } from '@/components/StatusBadge';

/**
 * Recruitment — TANPA dokumen kontrak (belum ada FSD/UIC/TSD Recruitment). Bentuk data diturunkan dari
 * prototype `_prototype/recruitment-*.html` untuk keperluan demo desain; nama field & endpoint wajib
 * diselaraskan begitu dokumen terbit.
 */

export type JobStatus = 'PUBLISHED' | 'DRAFT' | 'UNPUBLISHED' | 'CLOSED';

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  PUBLISHED: 'Published',
  DRAFT: 'Draft',
  UNPUBLISHED: 'Unpublished',
  CLOSED: 'Closed',
};

export const JOB_STATUS_TONE: Record<JobStatus, BadgeTone> = {
  PUBLISHED: 'ok',
  DRAFT: 'warn',
  UNPUBLISHED: 'mute',
  CLOSED: 'err',
};

export const JOB_STATUSES = Object.keys(JOB_STATUS_LABEL) as JobStatus[];

export interface JobListing {
  id: string;
  title: string;
  position: string;
  organization: string;
  branch: string;
  employmentStatus: string;
  workplaceType: string;
  hired: number;
  headcount: number;
  newCandidates: number;
  inProcess: number;
  status: JobStatus;
  platform: string | null;
  publishedAt: string | null;
  durationDays: number | null;
  createdAt: string;
  createdBy: string;
  hiringTeam: string[];
}

export interface JobFilter {
  status?: JobStatus;
  keyword?: string;
  branch?: string[];
  organization?: string[];
  employmentStatus?: string[];
  workplaceType?: string[];
  platform?: string[];
  hiringTeam?: string[];
}

export type InterviewStage = 'HR_SCREENING' | 'TECHNICAL' | 'PANEL' | 'FINAL';

export const STAGE_LABEL: Record<InterviewStage, string> = {
  HR_SCREENING: 'HR Screening',
  TECHNICAL: 'Technical',
  PANEL: 'Panel',
  FINAL: 'Final',
};

export const STAGE_TONE: Record<InterviewStage, BadgeTone> = {
  HR_SCREENING: 'warn',
  TECHNICAL: 'info',
  PANEL: 'brand',
  FINAL: 'ok',
};

export interface Interview {
  id: string;
  candidateName: string;
  jobTitle: string;
  stage: InterviewStage;
  startAt: string;
  durationMin: number;
  /** Online = nama aplikasi rapat; on-site = nama ruangan. */
  online: boolean;
  place: string;
  meetingUrl: string | null;
  interviewers: string[];
}

export interface RecruitmentOverview {
  newCandidates: number;
  unscheduledInterviews: number;
  unresponsiveOffers: number;
  closingSoon: number;
  inDraft: number;
  lowPerformance: number;
}

/** Satu baris Step 2 — field formulir lamaran yang bisa diaktifkan & diwajibkan. */
export interface FormFieldSetting {
  name: string;
  group: string;
  type: string;
  on: boolean;
  mandatory: boolean;
  /** Field inti: selalu aktif dan selalu wajib (gembok di prototype). */
  locked: boolean;
}

export interface CustomQuestion {
  id: string;
  question: string;
  type: string;
  description: string;
  required: boolean;
  options: string[];
}

export interface HiringStage {
  id: string;
  name: string;
  /** Kosong = tahap tanpa asesmen. */
  assessment: string;
}

export interface HiringProcess {
  id: string;
  name: string;
  stages: HiringStage[];
}

export type TeamRole = 'recruiter' | 'manager' | 'interviewer';

/** Isi lengkap wizard Create Job Listing — juga sumber tampilan Job Listing Detail. */
export interface JobDetails {
  title: string;
  position: string;
  branch: string;
  province: string;
  city: string;
  organization: string;
  employmentStatus: string;
  workplaceType: string;
  headcount: number;
  showHeadcount: boolean;
  salaryMin: number;
  salaryMax: number;
  showSalary: boolean;
  salaryDescription: string;
  description: string;
  requirements: string;
  benefits: string;
  summary: string;
  education: string;
  experienceLevel: string;
  minExperience: number | '';
  gender: string;
  ageMin: number;
  ageMax: number;
  formFields: FormFieldSetting[];
  questions: CustomQuestion[];
  screeningAssessment: string;
  autoReject: boolean;
  autoRejectBelow: number;
  autoRejectEmail: boolean;
  processes: HiringProcess[];
  team: Record<TeamRole, string[]>;
  publishedDate: string;
  noClosingDate: boolean;
  closingDate: string;
  autoClose: boolean;
  restrictOne: boolean;
  /** Bulan (string, nilai select). */
  reapplyMonths: string;
  platforms: string[];
}

export interface JobRecord {
  listing: JobListing;
  details: JobDetails;
}

export type ImportStatus = 'PROCESSING' | 'COMPLETED' | 'FAILED';

export const IMPORT_STATUS_LABEL: Record<ImportStatus, string> = {
  PROCESSING: 'In process',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
};

export const IMPORT_STATUS_TONE: Record<ImportStatus, BadgeTone> = {
  PROCESSING: 'info',
  COMPLETED: 'ok',
  FAILED: 'err',
};

/** Satu baris CSV impor (kolom templat Import Job Listing). */
export interface ImportRow {
  title: string;
  position: string;
  organization: string;
  branch: string;
  employmentStatus: string;
  workplaceType: string;
  headcount: number;
}

export interface ImportLog {
  id: string;
  uploadedAt: string;
  uploadedBy: string;
  fileName: string;
  sizeKb: number;
  status: ImportStatus;
  rows: ImportRow[];
  errors: string[];
}

/** Riwayat pendidikan / pelatihan / kerja — satu bentuk, field dipakai sesuai jenisnya. */
export interface CandidateEntry {
  id: string;
  title: string;
  organization: string;
  detail: string;
  from: string;
  to: string;
}

export interface CandidateInput {
  jobId: string;
  stage: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  placeOfBirth: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  bloodType: string;
  religion: string;
  nik: string;
  passportNumber: string;
  passportExpiry: string;
  postalCode: string;
  citizenAddress: string;
  residentialAddress: string;
  sameAddress: boolean;
  formalEducation: CandidateEntry[];
  informalEducation: CandidateEntry[];
  workExperience: CandidateEntry[];
  currentSalary: number | '';
  expectedSalary: number | '';
  profilePicture: string;
  portfolioMode: 'file' | 'link';
  portfolio: string;
  resume: string;
  notes: string;
}

export interface Candidate extends CandidateInput {
  id: string;
  createdAt: string;
}
