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
