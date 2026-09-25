import type {
  ConfidentialityClass,
  DocActor,
  DocRole,
  OwnerObjectKind,
  OwnerType,
  ScanState,
  TemplateDraft,
} from '@/features/documents/types';

/**
 * Matriks aktor per layar (FSD-DOCUMENT peta menu — diambil dari matriks aktor TSD karena matriks
 * izin STD belum memuat kolom Document, `PROB-SERVICE-342`).
 */
const SCREEN_ROLES: Record<OwnerType, DocRole[]> = {
  PERUSAHAAN: ['ROLE_SYSTEM_ADMIN', 'ROLE_HR_MANAGER', 'ROLE_SUPER_ADMIN'],
  KARYAWAN: [
    'ROLE_HR_MANAGER',
    'ROLE_HR_STAFF',
    'ROLE_SUPER_ADMIN',
    'ROLE_DEPARTMENT_MANAGER',
    'ROLE_HEALTH_DATA_OFFICER',
    'ROLE_FINANCE_OFFICER',
    'ROLE_EMPLOYEE',
  ],
  OBJEK_LAIN: ['ROLE_GA_STAFF', 'ROLE_SUPER_ADMIN'],
};

export const canReadCatalog = (role: DocRole, ownerType: OwnerType) => SCREEN_ROLES[ownerType].includes(role);

/** GA Staff hanya berkas aset & vendor (FSD §3 cakupan akses). */
export const readableObjectKinds = (role: DocRole): OwnerObjectKind[] =>
  role === 'ROLE_GA_STAFF' ? ['ASET', 'VENDOR'] : ['ASET', 'VENDOR', 'CABANG'];

/**
 * Penyaring hak baca per baris (server — baris yang tak boleh dibuka tidak muncul, bukan disaring
 * layar). Kelas SENSITIF: HR Staff tanpa berkas sensitif; Health Data Officer hanya berkas sensitif.
 */
export function canSeeRow(actor: DocActor, cls: ConfidentialityClass): boolean {
  if (actor.role === 'ROLE_HR_STAFF') return cls === 'BIASA';
  if (actor.role === 'ROLE_HEALTH_DATA_OFFICER') return cls === 'SENSITIF';
  return true;
}

/** Siapa yang boleh mengalirkan isi berkas SENSITIF (`DOC-24`/`DOC-28`); pemilik lewat ESS. */
const SENSITIVE_READERS: DocRole[] = ['ROLE_HR_MANAGER', 'ROLE_HEALTH_DATA_OFFICER', 'ROLE_SUPER_ADMIN'];

export function canOpenContent(actor: DocActor, cls: ConfidentialityClass, ownerId: string | null): boolean {
  if (cls === 'BIASA') return true;
  if (actor.role === 'ROLE_EMPLOYEE') return ownerId === actor.employeeId;
  return SENSITIVE_READERS.includes(actor.role);
}

/** Hanya versi BERSIH/TIDAK_DIPERIKSA yang dapat diambil; lainnya 404 seragam di `A2`. */
export const isRetrievable = (scan: ScanState) => scan === 'BERSIH' || scan === 'TIDAK_DIPERIKSA';

// ---------- Pustaka Naskah ----------

export const canReadTemplates = (role: DocRole) => role === 'ROLE_HR_MANAGER' || role === 'ROLE_SUPER_ADMIN';
/** Buat / naskah baru / nonaktifkan — HR Manager saja. */
export const canEditTemplates = (role: DocRole) => role === 'ROLE_HR_MANAGER';
/** Orang kedua — Super Admin saja; penilai ≠ penyunting ditegakkan server. */
export const canApproveTemplates = (role: DocRole) => role === 'ROLE_SUPER_ADMIN';

const TEMPLATE_NAME = /^[A-Za-z0-9][A-Za-z0-9 .,'()&/-]{2,149}$/;
const PLACEHOLDER = /%%[a-z0-9_]+%%/g;
/** Ungkapan mesin templat yang ditolak. `{{letter_no}}` tetap sah (contoh naskah UIC §3.4). */
const ENGINE_EXPRESSION = /(\$\{|<%|\{%)/;

export function bodyErrors(body: string): string | null {
  if (!body.trim()) return '422 VALIDATION_ERROR — naskah wajib diisi.';
  if (body.length > 100_000) return '422 VALIDATION_ERROR — naskah maksimal 100.000 karakter.';
  if ((body.match(PLACEHOLDER) ?? []).length > 200) return '422 VALIDATION_ERROR — maksimal 200 penanda %%nama%%.';
  if (ENGINE_EXPRESSION.test(body)) {
    return '422 VALIDATION_ERROR — naskah tidak boleh memuat ungkapan mesin templat; pakai penanda %%nama%%.';
  }
  return null;
}

export function templateDraftErrors(draft: TemplateDraft): string | null {
  if (!TEMPLATE_NAME.test(draft.templateName.trim())) {
    return '422 VALIDATION_ERROR — nama templat 3–150 karakter, diawali huruf atau angka.';
  }
  if (!draft.categoryId) return '422 VALIDATION_ERROR — kategori wajib dipilih.';
  if (draft.isSelfRequestable && draft.requiresApproval) {
    return '422 VALIDATION_ERROR — "Bisa diminta sendiri" dan "Wajib persetujuan" tidak boleh menyala bersamaan.';
  }
  return bodyErrors(draft.body);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
