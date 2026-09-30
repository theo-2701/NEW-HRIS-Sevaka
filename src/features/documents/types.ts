/**
 * Company Management › Files + ESS › Files — FSD-001-DOCUMENT-0.8 §1–§4, §6 ·
 * UIC-001-DOCUMENT-0.6 §2 (A3/A4/A2/A16), §3 (A8a–A8e, A9), §4 (A15, A10 jalur mandiri).
 *
 * Empat layar berkas berbagi SATU katalog dan SATU pintu baca — pembedanya hanya `owner_type`
 * (+`owner_id`) yang tiap layar kirim. Nol unggah dan nol hapus di seluruh Document Service.
 */

export const DOCUMENT_PATHS = {
  company: '/company-management/files/company',
  employee: '/company-management/files/employee',
  other: '/company-management/files/other',
  templates: '/company-management/files/templates',
  ess: '/me/files',
} as const;

export type DocRole =
  | 'ROLE_SUPER_ADMIN'
  | 'ROLE_SYSTEM_ADMIN'
  | 'ROLE_HR_MANAGER'
  | 'ROLE_HR_STAFF'
  | 'ROLE_DEPARTMENT_MANAGER'
  | 'ROLE_HEALTH_DATA_OFFICER'
  | 'ROLE_FINANCE_OFFICER'
  | 'ROLE_GA_STAFF'
  | 'ROLE_EMPLOYEE';

export interface DocActor {
  employeeId: string;
  label: string;
  role: DocRole;
  /** Unit yang dipimpin — hanya bermakna untuk ROLE_DEPARTMENT_MANAGER. */
  unit?: string;
}

export type OwnerType = 'PERUSAHAAN' | 'KARYAWAN' | 'OBJEK_LAIN';
export type OwnerObjectKind = 'ASET' | 'VENDOR' | 'CABANG';
export type Origin = 'DIUNGGAH' | 'DILAHIRKAN_SISTEM';
export type ScanState = 'MENUNGGU_PEMERIKSAAN' | 'BERSIH' | 'KOTOR' | 'TIDAK_DIPERIKSA';
export type StorageTier = 'PANAS' | 'DINGIN';
export type ConfidentialityClass = 'BIASA' | 'SENSITIF';
export type RetentionRegime = 'TEMPORARY' | 'PERMANENT';

export const ORIGIN_LABEL: Record<Origin, string> = { DIUNGGAH: 'Uploaded', DILAHIRKAN_SISTEM: 'System-generated' };
export const SCAN_LABEL: Record<ScanState, string> = {
  MENUNGGU_PEMERIKSAAN: 'Pending scan',
  BERSIH: 'Clean',
  KOTOR: 'Infected',
  TIDAK_DIPERIKSA: 'Not scanned',
};
export const STORAGE_LABEL: Record<StorageTier, string> = { PANAS: 'Hot', DINGIN: 'Cold' };
export const CLASS_LABEL: Record<ConfidentialityClass, string> = { BIASA: 'Regular', SENSITIF: 'Sensitive' };
export const OBJECT_KIND_LABEL: Record<OwnerObjectKind, string> = { ASET: 'Asset', VENDOR: 'Vendor', CABANG: 'Branch' };

/** `mst_document_category` — `A16` hanya memberi `id` + `category_name`; sisanya milik `A6a`. */
export interface DocCategory {
  id: string;
  categoryName: string;
  confidentialityClass: ConfidentialityClass;
  retentionRegime: RetentionRegime;
  isActive: boolean;
  shownInSelfService: boolean;
}

export interface DocVersion {
  versionId: string;
  versionNo: number;
  originalFilename: string;
  sizeBytes: number;
  detectedMime: string;
  scanState: ScanState;
  storageTier: StorageTier;
  scannedAt: string | null;
  createdAt: string;
}

/** Blok `letter` di `A4` — terisi hanya bila `origin=DILAHIRKAN_SISTEM`. */
export interface LetterInfo {
  letterId: string;
  letterNo: string | null;
  letterTarget: LetterTarget;
  letterIssuanceState: LetterIssuanceState;
  letterState: 'BERLAKU' | 'DIBATALKAN' | null;
  issuedAt: string | null;
  templateId: string;
  templateVersionId: string;
}

/** Item `A3`. Kelas dihitung server; nama wadah, checksum, dan identitas pemilik sengaja absen. */
export interface DocumentItem {
  documentId: string;
  categoryId: string;
  categoryName: string;
  origin: Origin;
  ownerType: OwnerType;
  ownerObjectKind: OwnerObjectKind | null;
  ownerId: string | null;
  confidentialityClassEffective: ConfidentialityClass;
  activeVersion: DocVersion;
  createdAt: string;
  updatedAt: string | null;
}

/** `A4` — objek datar + riwayat versi utuh (append-only, tanpa paginasi). */
export interface DocumentDetail extends Omit<DocumentItem, 'activeVersion'> {
  activeVersionId: string;
  versions: DocVersion[];
  letter: LetterInfo | null;
}

export interface DocumentSearch {
  ownerType: OwnerType;
  ownerId?: string;
  ownerObjectKind?: OwnerObjectKind;
  categoryId?: string;
  origin?: Origin;
  keyword?: string;
  startDate?: string;
  endDate?: string;
}

/** Hasil `A2` — byte ditarik lewat satu komponen bersama lalu ditampilkan dari memori (blob URL). */
export interface DocumentContent {
  blob: Blob;
  filename: string;
  mime: string;
  confidentialityClass: ConfidentialityClass;
}

// ---------- Pustaka Naskah (Document Templates) ----------

export type LetterTarget = 'PERORANGAN' | 'EDARAN';
export type SignerScope = 'KANTOR_PUSAT' | 'CABANG';
export type TemplateVersionState = 'MENUNGGU_PERSETUJUAN' | 'DISETUJUI' | 'DITOLAK';
export type LetterIssuanceState = 'MENUNGGU_PERSETUJUAN' | 'TERBIT' | 'DITOLAK';

export const TARGET_LABEL: Record<LetterTarget, string> = { PERORANGAN: 'Individual', EDARAN: 'Circular' };
export const SCOPE_LABEL: Record<SignerScope, string> = { KANTOR_PUSAT: 'Head office', CABANG: 'Branch' };
export const VERSION_STATE_LABEL: Record<TemplateVersionState, string> = {
  MENUNGGU_PERSETUJUAN: 'Pending approval',
  DISETUJUI: 'Approved',
  DITOLAK: 'Rejected',
};

export interface PersonSnapshot {
  employeeId: string;
  nama: string;
  nik: string;
}

export interface TemplateVersion {
  versionId: string;
  versionNo: number;
  templateVersionState: TemplateVersionState;
  isActiveVersion: boolean;
  body: string;
  createdBy: PersonSnapshot;
  createdAt: string;
  approvedBy: PersonSnapshot | null;
  approvedAt: string | null;
}

/** Baris `A8a`. */
export interface TemplateListItem {
  id: string;
  templateName: string;
  letterTarget: LetterTarget;
  signerScope: SignerScope;
  isSelfRequestable: boolean;
  requiresApproval: boolean;
  activeVersionId: string | null;
  activeVersionNo: number | null;
}

/** `A8e`. */
export interface TemplateDetail extends TemplateListItem {
  categoryId: string;
  categoryName: string;
  categoryRetentionRegime: RetentionRegime;
  isActive: boolean;
  createdAt: string;
  versions: TemplateVersion[];
}

export interface TemplateDraft {
  templateName: string;
  categoryId: string;
  letterTarget: LetterTarget;
  signerScope: SignerScope;
  isSelfRequestable: boolean;
  requiresApproval: boolean;
  body: string;
}

/** Item `A15` — `effective_requires_approval` = kategori PERMANENT ATAU `requires_approval`. */
export interface IssuableTemplate {
  id: string;
  templateName: string;
  letterTarget: LetterTarget;
  effectiveRequiresApproval: boolean;
  activeVersionNo: number;
}

export interface LetterResult {
  letterId: string;
  letterIssuanceState: LetterIssuanceState;
  letterNo: string | null;
  documentId: string | null;
}

/** `log_document_access` — satu baris per `A2`, ditulis sebelum byte pertama. */
export interface AccessLogRow {
  documentId: string;
  accessorEmployeeId: string;
  accessGranularity: 'PER_PEMBUKAAN' | 'PER_PERMINTAAN';
  accessedAt: string;
}

// ---------- Penerbitan surat (Letter Issuance, A10–A14) ----------

export type LetterState = 'BERLAKU' | 'DIBATALKAN';
export type BatchState = 'MENUNGGU_PERSETUJUAN' | 'DISETUJUI' | 'BERJALAN' | 'SELESAI' | 'DITOLAK';
export type BatchItemState = 'MENUNGGU' | 'BERHASIL' | 'GAGAL';

export const ISSUANCE_LABEL: Record<LetterIssuanceState, string> = {
  MENUNGGU_PERSETUJUAN: 'Awaiting approval',
  TERBIT: 'Issued',
  DITOLAK: 'Rejected',
};
export const BATCH_STATE_LABEL: Record<BatchState, string> = {
  MENUNGGU_PERSETUJUAN: 'Awaiting approval',
  DISETUJUI: 'Approved',
  BERJALAN: 'Running',
  SELESAI: 'Finished',
  DITOLAK: 'Rejected',
};
export const BATCH_ITEM_LABEL: Record<BatchItemState, string> = {
  MENUNGGU: 'Waiting',
  BERHASIL: 'Succeeded',
  GAGAL: 'Failed',
};

/** Respons Letter (`A10`/`A11`/`A12`) — dua bentuk: bergerbang (nomor & berkas null) vs terbit. */
export interface Letter {
  letterId: string;
  templateId: string;
  templateName: string;
  templateVersionNo: number;
  categoryId: string;
  letterTarget: LetterTarget;
  letterIssuanceState: LetterIssuanceState;
  letterState: LetterState | null;
  subjectEmployeeId: string | null;
  branchId: string | null;
  letterNo: string | null;
  verificationCode: string | null;
  issuedAt: string | null;
  documentId: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdBy: PersonSnapshot;
  createdAt: string;
}

export interface LetterDraft {
  templateId: string;
  subjectEmployeeId: string;
  branchId: string;
  reissueOfLetterId: string;
}

export interface LetterBatch {
  id: string;
  code: string;
  templateId: string;
  templateName: string;
  templateVersionNo: number;
  batchState: BatchState;
  recipientCount: number;
  submittedAt: string;
  createdBy: PersonSnapshot;
  approvedAt: string | null;
  approvedBy: PersonSnapshot | null;
  finishedAt: string | null;
}

export interface LetterBatchItem {
  subjectEmployeeId: string;
  batchItemState: BatchItemState;
  letterId: string | null;
  failureReason: string | null;
}

export interface LetterBatchReport extends LetterBatch {
  summary: { waiting: number; succeeded: number; failed: number };
  items: LetterBatchItem[];
}

export interface BatchSearch {
  batchState?: BatchState;
  templateId?: string;
  submittedByEmployeeId?: string;
}

// ---------- Pengaturan Kategori (A6a–A6d, A7) ----------

export type CategoryOrigin = 'INDUK' | 'PERUSAHAAN';

/** Sepuluh peran kanonik registry `STD` — daftar centang pemetaan pembaca. */
export const CANONICAL_ROLES: string[] = [
  'ROLE_SUPER_ADMIN',
  'ROLE_SYSTEM_ADMIN',
  'ROLE_HR_MANAGER',
  'ROLE_HR_STAFF',
  'ROLE_DEPARTMENT_MANAGER',
  'ROLE_FINANCE_OFFICER',
  'ROLE_PAYROLL_OFFICER',
  'ROLE_GA_STAFF',
  'ROLE_HEALTH_DATA_OFFICER',
  'ROLE_EMPLOYEE',
];

export interface CategoryAttributes {
  categoryName: string;
  retentionDays: number | null;
  maxFileSizeBytes: number;
  allowedMimeTypes: string[];
  isReplaceable: boolean;
  isRegenerable: boolean;
  shownInSelfService: boolean;
  isActive: boolean;
}

export interface PendingCategoryChange {
  kind: 'ATTRIBUTES' | 'READERS';
  changes: Partial<CategoryAttributes>;
  readerRoles: string[] | null;
  acknowledgedImpactCount: number;
  proposedBy: PersonSnapshot;
  proposedAt: string;
}

/** Baris `A6a` + ringkasan usulan tertahan (untuk layar penyetuju) + cacah dokumen terdampak (hitungan server). */
export interface CategoryAdmin extends CategoryAttributes {
  id: string;
  categoryCode: string;
  categoryOrigin: CategoryOrigin;
  confidentialityClass: ConfidentialityClass;
  retentionRegime: RetentionRegime;
  hasPendingChange: boolean;
  readerRoles: string[];
  pending: PendingCategoryChange | null;
  impactCount: number;
}

export interface CategoryDraft {
  categoryCode: string;
  categoryName: string;
  retentionRegime: RetentionRegime;
  retentionDays: string;
  maxFileSizeMb: string;
  allowedMimeTypes: string[];
  isReplaceable: boolean;
  isRegenerable: boolean;
  shownInSelfService: boolean;
}

// ---------- Jejak Akses Dokumen (A5) ----------

export type AccessGranularity = 'PER_PEMBUKAAN' | 'PER_PERMINTAAN';

export interface AccessTrailRow {
  id: string;
  accessGranularity: AccessGranularity;
  documentId: string | null;
  versionId: string | null;
  documentIds: { documentId: string; versionId: string }[];
  documentCount: number;
  accessedAt: string;
  accessedAtTimezone: string;
  sourceIp: string;
  flaggedUnreasonable: boolean;
  accessedBy: PersonSnapshot;
}

export interface AccessTrailSearch {
  actorEmployeeId?: string;
  accessGranularity?: AccessGranularity;
  flaggedUnreasonable?: boolean;
  startDate?: string;
  endDate?: string;
}

// ---------- Malware Alerts (A17/A18) ----------

export type MalwareAlertState = 'AKTIF' | 'DITANGANI';

/** Nol nama berkas dalam bentuk apa pun — penunjuk saja (FSD §8A.5). */
export interface MalwareAlert {
  id: string;
  documentId: string;
  versionId: string | null;
  uploaderEmployeeId: string;
  detectedAt: string;
  detectedAtTimezone: string;
  malwareAlertState: MalwareAlertState;
  handledAt: string | null;
  handlingNote: string | null;
  handledBy: PersonSnapshot | null;
}

export interface MalwareSearch {
  malwareAlertState?: MalwareAlertState;
  uploaderEmployeeId?: string;
  startDate?: string;
  endDate?: string;
}

// ---------- Pemeriksaan keaslian publik (C2a–C2c) ----------

export type VerifyResult =
  | { matched: false }
  | {
      matched: true;
      letterType: string;
      issuedAt: string;
      issuedAtTimezone: string;
      letterState: LetterState;
      cancelledAt?: string;
      cancelledAtTimezone?: string;
    };
