/** Announcement (FSD-001-COMPANY §11 · UIC-001-COMPANY §3C). */

export const ANNOUNCEMENT_LIST_PATH = '/company-management/announcements';
export const announcementDetailPath = (id: string) => `${ANNOUNCEMENT_LIST_PATH}/detail?id=${id}`;
export const MY_ANNOUNCEMENTS_PATH = '/me/announcements';

export type AnnouncementStatus = 'DRAFT' | 'PUBLISHED';

/** Daftar tertutup `ck_mst_announcement_category` — nol nilai bawaan. */
export type AnnouncementCategory = 'POLICY' | 'HOLIDAY' | 'EVENT' | 'GENERAL';

export const CATEGORY_OPTIONS: { value: AnnouncementCategory; label: string }[] = [
  { value: 'POLICY', label: 'Policy' },
  { value: 'HOLIDAY', label: 'Holiday' },
  { value: 'EVENT', label: 'Event' },
  { value: 'GENERAL', label: 'General' },
];

/** Daftar peran baku (STD §14) yang boleh jadi sasaran. "Seluruh karyawan" = `ROLE_EMPLOYEE`. */
export const RECIPIENT_ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'ROLE_EMPLOYEE', label: 'Seluruh karyawan' },
  { value: 'ROLE_DEPT_MANAGER', label: 'Department Manager' },
  { value: 'ROLE_HR_STAFF', label: 'HR Staff' },
  { value: 'ROLE_HR_MANAGER', label: 'HR Manager' },
  { value: 'ROLE_FINANCE_OFFICER', label: 'Finance Officer' },
  { value: 'ROLE_PAYROLL_OFFICER', label: 'Payroll Officer' },
  { value: 'ROLE_SUPER_ADMIN', label: 'Super Admin' },
];

export const STATUS_LABEL: Record<AnnouncementStatus, string> = { DRAFT: 'Draft', PUBLISHED: 'Published' };

export interface PersonRef {
  employeeId: string;
  name: string;
  nik: string;
}

export interface AnnouncementRow {
  id: string;
  title: string;
  category: AnnouncementCategory;
  recipientRole: string | null;
  status: AnnouncementStatus;
  createdBy: PersonRef;
  createdAt: string;
  /** Dibaca dari jejak terbit terbaru; `null` = belum pernah terbit. */
  lastPublishedAt: string | null;
}

export interface AnnouncementAttachment {
  attachmentId: string;
  documentId: string;
  createdBy: PersonRef;
  createdAt: string;
}

export interface PublishLogEntry {
  publishedAt: string;
  recipientRole: string;
  publishedBy: PersonRef;
  contentHash: string;
}

export interface AnnouncementDetail extends AnnouncementRow {
  content: string;
  attachments: AnnouncementAttachment[];
  publishLog: PublishLogEntry[];
}

export interface AnnouncementDraft {
  title: string;
  content: string;
  category: AnnouncementCategory | '';
  recipientRole: string;
}

export interface AnnouncementFilter {
  status?: AnnouncementStatus;
  category?: AnnouncementCategory;
  keyword?: string;
  page: number;
  size: number;
}

/** Berkas Company Files (document-service, jenis pemilik PERUSAHAAN) — nama/ukuran/jenis dibaca terpisah. */
export interface CompanyFile {
  documentId: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
}

export interface MyAnnouncementRow {
  id: string;
  title: string;
  publishedAt: string;
}

export interface MyAnnouncementDetail {
  title: string;
  content: string;
  publishedAt: string;
  attachments: { documentId: string }[];
}

export const recipientLabel = (role: string | null) =>
  role ? (RECIPIENT_ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role) : null;

export const categoryLabel = (category: AnnouncementCategory) =>
  CATEGORY_OPTIONS.find((option) => option.value === category)?.label ?? category;
