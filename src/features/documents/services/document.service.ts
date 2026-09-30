import { api, ApiError } from '@/services/api';
import { MOCK } from '@/services/mock';
import {
  CATEGORY_SEED,
  DOCUMENT_SEED,
  EMPLOYEE_PICKER,
  HESTI,
  RINA,
  TEMPLATE_SEED,
} from '@/features/documents/mock-data';
import {
  ACCESS_TRAIL_SEED,
  BATCH_SEED,
  BRANCHES,
  CATEGORY_ADMIN_SEED,
  DOC_PEOPLE,
  EXTRA_TEMPLATE_SEED,
  LETTER_SEED,
  MALWARE_SEED,
} from '@/features/documents/governance-data';
import {
  bodyErrors,
  canApproveTemplates,
  canEditTemplates,
  canOpenContent,
  canReadCatalog,
  canReadTemplates,
  canSeeRow,
  isRetrievable,
  readableObjectKinds,
  templateDraftErrors,
} from '@/features/documents/rules';
import type {
  AccessLogRow,
  AccessTrailRow,
  AccessTrailSearch,
  BatchSearch,
  CategoryAdmin,
  CategoryAttributes,
  CategoryDraft,
  LetterBatch,
  LetterBatchItem,
  LetterBatchReport,
  Letter,
  LetterDraft,
  MalwareAlert,
  MalwareSearch,
  VerifyResult,
  DocActor,
  DocCategory,
  DocumentContent,
  DocumentDetail,
  DocumentItem,
  DocumentSearch,
  IssuableTemplate,
  LetterResult,
  PersonSnapshot,
  TemplateDetail,
  TemplateDraft,
  TemplateListItem,
} from '@/features/documents/types';

/**
 * API service Document — UIC-001-DOCUMENT-0.6.
 *
 *   A3  POST /documents/search                       A16 GET /selectable-document-categories
 *   A4  GET  /documents/{id}                          A2  GET /documents/{id}/content
 *   A8a GET  /document-templates                      A8e GET /document-templates/{id}
 *   A8b POST /document-templates                      A8c POST /document-templates/{id}/versions
 *   A8d POST /document-templates/{id}/deactivate      A9  POST /document-templates/{id}/versions/{no}/approve
 *   A15 GET  /issuable-letter-templates               A10 POST /letters (jalur mandiri ESS)
 *
 * Baris yang tak boleh dibaca TIDAK muncul (bukan disaring layar); kegagalan baca per-nomor
 * selalu `404` seragam — anti-enumerasi. Grid dan detail nol jejak akses; `A2` menulis satu baris.
 */
const delay = (ms = 220) => new Promise((resolve) => setTimeout(resolve, ms));
const now = () => new Date().toISOString();

type Stored = Omit<DocumentDetail, 'activeVersionId' | 'categoryName' | 'confidentialityClassEffective' | 'updatedAt'>;

type StoredBatch = LetterBatch & { items: LetterBatchItem[] };

let documents: Stored[] = [];
let templates: TemplateDetail[] = [];
let accessLog: AccessLogRow[] = [];
let categories: CategoryAdmin[] = [];
let letters: Letter[] = [];
let batches: StoredBatch[] = [];
let trail: AccessTrailRow[] = [];
let alerts: MalwareAlert[] = [];
/** Objek berkas yang sudah dihapus dari penyimpanan (A18) + versi yang penghapusannya dipaksa gagal (uji). */
let deletedObjects = new Set<string>();
let failingDeletes = new Set<string>();
let sequence = 0;
let letterCounter = 4;
let batchCounter = 3;

function buildCategories(): CategoryAdmin[] {
  return CATEGORY_SEED.map((row) => ({
    ...row,
    ...CATEGORY_ADMIN_SEED[row.id],
    allowedMimeTypes: [...CATEGORY_ADMIN_SEED[row.id].allowedMimeTypes],
    readerRoles: [...CATEGORY_ADMIN_SEED[row.id].readerRoles],
    hasPendingChange: false,
    pending: null,
    impactCount: 0,
  }));
}

export function resetDocumentMocks() {
  documents = DOCUMENT_SEED.map((row) => ({ ...row, versions: row.versions.map((ver) => ({ ...ver })) }));
  templates = [...TEMPLATE_SEED, ...EXTRA_TEMPLATE_SEED].map((row) => ({
    ...row,
    versions: row.versions.map((ver) => ({ ...ver })),
  }));
  accessLog = [];
  categories = buildCategories();
  letters = LETTER_SEED.map((row) => ({ ...row, createdBy: { ...row.createdBy } }));
  batches = BATCH_SEED.map((row) => ({ ...row, items: row.items.map((item) => ({ ...item })) }));
  trail = ACCESS_TRAIL_SEED.map((row) => ({ ...row, documentIds: row.documentIds.map((pair) => ({ ...pair })) }));
  alerts = MALWARE_SEED.map((row) => ({ ...row }));
  deletedObjects = new Set();
  failingDeletes = new Set();
  // Blok `letter` di A4 mengikuti baris surat (satu sumber, termasuk surat yang dibatalkan).
  letters.forEach((letter) => {
    const doc = documents.find((row) => row.documentId === letter.documentId);
    if (doc) doc.letter = letterInfo(letter);
  });
  sequence = 0;
  letterCounter = 4;
  batchCounter = 3;
}

function letterInfo(letter: Letter) {
  const template = templates.find((row) => row.id === letter.templateId);
  return {
    letterId: letter.letterId,
    letterNo: letter.letterNo,
    letterTarget: letter.letterTarget,
    letterIssuanceState: letter.letterIssuanceState,
    letterState: letter.letterState,
    issuedAt: letter.issuedAt,
    templateId: letter.templateId,
    templateVersionId: template?.activeVersionId ?? '',
  };
}
resetDocumentMocks();

const nextId = (prefix: string) => `${prefix}-${(sequence += 1).toString(36)}${Date.now().toString(36).slice(-4)}`;
const category = (id: string) => categories.find((row) => row.id === id)!;
const NOT_FOUND = () => new Error('404 NOT_FOUND — dokumen tidak ditemukan.');

function snapshotOf(actor: DocActor): PersonSnapshot {
  const known = [HESTI, RINA].find((row) => row.employeeId === actor.employeeId);
  return known ?? { employeeId: actor.employeeId, nama: actor.label.split(' — ')[0], nik: '—' };
}

/** `active_version` = versi bernomor tertinggi yang DAPAT diambil; bila tak ada, versi terakhir. */
function activeVersion(row: Stored) {
  const retrievable = row.versions.filter((ver) => isRetrievable(ver.scanState));
  return (retrievable.length ? retrievable : row.versions).reduce((a, b) => (b.versionNo > a.versionNo ? b : a));
}

function toItem(row: Stored): DocumentItem {
  const cat = category(row.categoryId);
  const { versions, letter, ...rest } = row;
  void versions;
  void letter;
  return {
    ...rest,
    categoryName: cat.categoryName,
    confidentialityClassEffective: cat.confidentialityClass,
    activeVersion: { ...activeVersion(row) },
    updatedAt: null,
  };
}

/** Penyaring hak baca per baris — dipakai A3, A4, dan A2 supaya ketiganya seragam. */
function visibleTo(actor: DocActor, row: Stored): boolean {
  if (!canReadCatalog(actor.role, row.ownerType)) return false;
  if (actor.role === 'ROLE_EMPLOYEE' && row.ownerId !== actor.employeeId) return false;
  if (
    row.ownerType === 'OBJEK_LAIN' &&
    row.ownerObjectKind &&
    !readableObjectKinds(actor.role).includes(row.ownerObjectKind)
  ) {
    return false;
  }
  if (actor.role === 'ROLE_DEPARTMENT_MANAGER') {
    const person = EMPLOYEE_PICKER.find((item) => item.employeeId === row.ownerId);
    if (!person || person.department !== actor.unit) return false;
  }
  return canSeeRow(actor, category(row.categoryId).confidentialityClass);
}

function findTemplate(id: string): TemplateDetail {
  const row = templates.find((item) => item.id === id);
  if (!row) throw new Error('404 NOT_FOUND — templat tidak ditemukan.');
  return row;
}

const listItem = (row: TemplateDetail): TemplateListItem => ({
  id: row.id,
  templateName: row.templateName,
  letterTarget: row.letterTarget,
  signerScope: row.signerScope,
  isSelfRequestable: row.isSelfRequestable,
  requiresApproval: row.requiresApproval,
  activeVersionId: row.activeVersionId,
  activeVersionNo: row.activeVersionNo,
});

const effectiveRequiresApproval = (row: TemplateDetail) =>
  row.requiresApproval || category(row.categoryId).retentionRegime === 'PERMANENT';

export const documentService = {
  // ---------- Katalog & isi berkas ----------

  /** `A16` — hanya `id` + `category_name`; ESS disaring `shown_in_self_service`. */
  async selectableCategories(actor: DocActor): Promise<{ id: string; categoryName: string }[]> {
    if (MOCK) {
      await delay(120);
      return categories
        .filter((row) => row.isActive && (actor.role !== 'ROLE_EMPLOYEE' || row.shownInSelfService))
        .map((row) => ({ id: row.id, categoryName: row.categoryName }));
    }
    const { data } = await api.get<{ categories: { id: string; category_name: string }[] }>(
      '/selectable-document-categories',
    );
    return data.categories.map((row) => ({ id: row.id, categoryName: row.category_name }));
  },

  /** `A6a` — daftar kategori kelola, dipakai borang Buat Templat (HR Manager). */
  async manageableCategories(actor: DocActor): Promise<DocCategory[]> {
    if (MOCK) {
      await delay(120);
      if (!canReadTemplates(actor.role))
        throw new Error('403 — kategori kelola hanya untuk HR Manager dan Super Admin.');
      return categories
        .filter((row) => row.isActive)
        .map((row) => ({
          id: row.id,
          categoryName: row.categoryName,
          confidentialityClass: row.confidentialityClass,
          retentionRegime: row.retentionRegime,
          isActive: row.isActive,
          shownInSelfService: row.shownInSelfService,
        }));
    }
    const { data } = await api.get<{ data: DocCategory[] }>('/document-categories');
    return data.data;
  },

  /** `A3` — kriteria di badan; `owner_type` konstanta layar. ESS tidak mengirim `owner_id`. */
  async search(actor: DocActor, query: DocumentSearch): Promise<DocumentItem[]> {
    if (MOCK) {
      await delay();
      if (!canReadCatalog(actor.role, query.ownerType))
        throw new Error('403 — peran ini tidak punya akses ke layar berkas ini.');
      if (query.ownerObjectKind && query.ownerType !== 'OBJEK_LAIN') {
        throw new Error('422 VALIDATION_ERROR — owner_object_kind hanya sah untuk OBJEK_LAIN.');
      }
      if (actor.role === 'ROLE_EMPLOYEE' && query.ownerId) {
        throw new Error('422 VALIDATION_ERROR — owner_id dilarang dikirim dari layar mandiri.');
      }
      if (query.ownerType === 'KARYAWAN' && actor.role !== 'ROLE_EMPLOYEE' && !query.ownerId) {
        throw new Error('422 VALIDATION_ERROR — pilih karyawan lebih dulu.');
      }
      if (query.startDate && query.endDate && query.endDate < query.startDate) {
        throw new Error('422 VALIDATION_ERROR — rentang tanggal terbalik.');
      }
      const keyword = query.keyword?.trim().toLowerCase() ?? '';
      return documents
        .filter((row) => row.ownerType === query.ownerType && visibleTo(actor, row))
        .filter((row) => !query.ownerId || row.ownerId === query.ownerId)
        .filter((row) => !query.ownerObjectKind || row.ownerObjectKind === query.ownerObjectKind)
        .filter((row) => !query.categoryId || row.categoryId === query.categoryId)
        .filter((row) => !query.origin || row.origin === query.origin)
        .filter((row) => !query.startDate || row.createdAt.slice(0, 10) >= query.startDate)
        .filter((row) => !query.endDate || row.createdAt.slice(0, 10) <= query.endDate)
        .map(toItem)
        .filter((row) => !keyword || row.activeVersion.originalFilename.toLowerCase().includes(keyword))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    const { data } = await api.post<{ data: DocumentItem[] }>('/documents/search', query);
    return data.data;
  },

  /** `A4` — detail + riwayat versi utuh. Tidak berhak = tidak ada = `404` seragam. */
  async detail(actor: DocActor, id: string): Promise<DocumentDetail> {
    if (MOCK) {
      await delay(150);
      const row = documents.find((item) => item.documentId === id);
      if (!row || !visibleTo(actor, row)) throw NOT_FOUND();
      const item = toItem(row);
      return {
        ...item,
        activeVersionId: item.activeVersion.versionId,
        versions: row.versions.map((ver) => ({ ...ver })).sort((a, b) => b.versionNo - a.versionNo),
        letter: row.letter ? { ...row.letter } : null,
      };
    }
    const { data } = await api.get<DocumentDetail>(`/documents/${id}`);
    return data;
  },

  /**
   * `A2` — header-only (`Authorization: Bearer`), dibaca sebagai blob untuk ditampilkan dari memori.
   * Satu baris `log_document_access` ditulis SEBELUM byte dilepas; gagal apa pun = `404` seragam.
   */
  async content(actor: DocActor, id: string, versionNo?: number): Promise<DocumentContent> {
    if (MOCK) {
      await delay(300);
      const row = documents.find((item) => item.documentId === id);
      if (!row || !visibleTo(actor, row)) throw NOT_FOUND();
      const cls = category(row.categoryId).confidentialityClass;
      const version = versionNo ? row.versions.find((ver) => ver.versionNo === versionNo) : activeVersion(row);
      if (!version || !isRetrievable(version.scanState) || !canOpenContent(actor, cls, row.ownerId)) throw NOT_FOUND();
      accessLog.push({
        documentId: id,
        accessorEmployeeId: actor.employeeId,
        accessGranularity: cls === 'SENSITIF' ? 'PER_PEMBUKAAN' : 'PER_PERMINTAAN',
        accessedAt: now(),
      });
      const text = [
        version.originalFilename,
        `Version ${version.versionNo} · ${category(row.categoryId).categoryName}`,
        '',
        'Dummy file content — the real bytes stream from document-service (A2).',
        row.letter?.letterNo ? `Letter number: ${row.letter.letterNo}` : '',
      ]
        .filter((line, index) => index < 4 || line)
        .join('\n');
      return {
        blob: new Blob([text], { type: 'text/plain' }),
        filename: version.originalFilename,
        mime: version.detectedMime,
        confidentialityClass: cls,
      };
    }
    const response = await api.get<Blob>(`/documents/${id}/content`, {
      params: versionNo ? { version_no: versionNo } : undefined,
      responseType: 'blob',
    });
    const disposition = String(response.headers['content-disposition'] ?? '');
    return {
      blob: response.data,
      filename: /filename="([^"]+)"/.exec(disposition)?.[1] ?? 'document',
      mime: String(response.headers['content-type'] ?? 'application/octet-stream'),
      confidentialityClass: 'SENSITIF',
    };
  },

  /** Hanya untuk pengujian: jejak akses tidak punya layar di menu Files. */
  accessLogFor(documentId: string): AccessLogRow[] {
    return accessLog.filter((row) => row.documentId === documentId).map((row) => ({ ...row }));
  },

  // ---------- Pustaka naskah ----------

  /** `A8a` — hanya `is_active=true`, urut `template_name`. */
  async templates(actor: DocActor): Promise<TemplateListItem[]> {
    if (MOCK) {
      await delay();
      if (!canReadTemplates(actor.role))
        throw new Error('403 — pustaka naskah hanya untuk HR Manager dan Super Admin.');
      return templates
        .filter((row) => row.isActive)
        .map(listItem)
        .sort((a, b) => a.templateName.localeCompare(b.templateName));
    }
    const { data } = await api.get<{ data: TemplateListItem[] }>('/document-templates');
    return data.data;
  },

  /** `A8e` — naskah seluruh versi disajikan utuh. */
  async template(actor: DocActor, id: string): Promise<TemplateDetail> {
    if (MOCK) {
      await delay(150);
      if (!canReadTemplates(actor.role))
        throw new Error('403 — pustaka naskah hanya untuk HR Manager dan Super Admin.');
      const row = findTemplate(id);
      return { ...row, versions: row.versions.map((ver) => ({ ...ver })).sort((a, b) => b.versionNo - a.versionNo) };
    }
    const { data } = await api.get<TemplateDetail>(`/document-templates/${id}`);
    return data;
  },

  /** `A8b` — naskah v1 lahir MENUNGGU_PERSETUJUAN; `active_version_id` tetap kosong. */
  async createTemplate(actor: DocActor, draft: TemplateDraft): Promise<TemplateListItem> {
    if (MOCK) {
      await delay(300);
      if (!canEditTemplates(actor.role)) throw new Error('403 — hanya HR Manager yang menyunting naskah.');
      const error = templateDraftErrors(draft);
      if (error) throw new Error(error);
      const cat = category(draft.categoryId);
      const row: TemplateDetail = {
        id: nextId('tpl'),
        templateName: draft.templateName.trim(),
        categoryId: cat.id,
        categoryName: cat.categoryName,
        categoryRetentionRegime: cat.retentionRegime,
        letterTarget: draft.letterTarget,
        signerScope: draft.signerScope,
        isSelfRequestable: draft.isSelfRequestable,
        requiresApproval: draft.requiresApproval,
        isActive: true,
        activeVersionId: null,
        activeVersionNo: null,
        createdAt: now(),
        versions: [
          {
            versionId: nextId('tv'),
            versionNo: 1,
            templateVersionState: 'MENUNGGU_PERSETUJUAN',
            isActiveVersion: false,
            body: draft.body,
            createdBy: snapshotOf(actor),
            createdAt: now(),
            approvedBy: null,
            approvedAt: null,
          },
        ],
      };
      templates.push(row);
      return listItem(row);
    }
    const { data } = await api.post<TemplateListItem>('/document-templates', draft);
    return data;
  },

  /** `A8c` — naskah utuh baru; penunjuk versi aktif TIDAK bergeser sampai disetujui. */
  async addVersion(actor: DocActor, id: string, body: string): Promise<{ versionNo: number }> {
    if (MOCK) {
      await delay(250);
      if (!canEditTemplates(actor.role)) throw new Error('403 — hanya HR Manager yang menyunting naskah.');
      const row = findTemplate(id);
      const error = bodyErrors(body);
      if (error) throw new Error(error);
      const versionNo = Math.max(...row.versions.map((ver) => ver.versionNo)) + 1;
      row.versions.push({
        versionId: nextId('tv'),
        versionNo,
        templateVersionState: 'MENUNGGU_PERSETUJUAN',
        isActiveVersion: false,
        body,
        createdBy: snapshotOf(actor),
        createdAt: now(),
        approvedBy: null,
        approvedAt: null,
      });
      return { versionNo };
    }
    const { data } = await api.post<{ version_no: number }>(`/document-templates/${id}/versions`, { body });
    return { versionNo: data.version_no };
  },

  /** `A8d` — tanpa orang kedua, idempoten; tidak ada alamat "aktifkan kembali". */
  async deactivate(actor: DocActor, id: string): Promise<{ id: string; changed: boolean }> {
    if (MOCK) {
      await delay(200);
      if (!canEditTemplates(actor.role)) throw new Error('403 — hanya HR Manager yang menonaktifkan templat.');
      const row = findTemplate(id);
      const changed = row.isActive;
      row.isActive = false;
      return { id, changed };
    }
    await api.post(`/document-templates/${id}/deactivate`);
    return { id, changed: true };
  },

  /** `A9` — orang kedua. Setuju menggeser penunjuk aktif bila ini versi DISETUJUI terbaru. */
  async decide(
    actor: DocActor,
    id: string,
    versionNo: number,
    decision: 'DISETUJUI' | 'DITOLAK',
    rejectReason = '',
  ): Promise<{ versionNo: number; state: 'DISETUJUI' | 'DITOLAK' }> {
    if (MOCK) {
      await delay(250);
      if (!canApproveTemplates(actor.role)) throw new Error('403 — keputusan naskah milik Super Admin.');
      const row = findTemplate(id);
      const version = row.versions.find((ver) => ver.versionNo === versionNo);
      if (!version) throw new Error('404 NOT_FOUND — versi naskah tidak ditemukan.');
      if (version.templateVersionState !== 'MENUNGGU_PERSETUJUAN') {
        throw new Error('422 — versi ini sudah diputuskan.');
      }
      if (version.createdBy.employeeId === actor.employeeId) {
        throw new Error('422 — penilai tidak boleh sama dengan penyunting versi ini.');
      }
      const reason = rejectReason.trim();
      if (decision === 'DITOLAK' && !reason) throw new Error('400 — alasan penolakan wajib diisi.');
      if (decision === 'DISETUJUI' && reason) throw new Error('400 — alasan penolakan hanya untuk keputusan Tolak.');
      version.templateVersionState = decision;
      if (decision === 'DISETUJUI') {
        version.approvedBy = snapshotOf(actor);
        version.approvedAt = now();
        if (row.activeVersionNo === null || versionNo > row.activeVersionNo) {
          row.versions.forEach((ver) => (ver.isActiveVersion = ver.versionNo === versionNo));
          row.activeVersionId = version.versionId;
          row.activeVersionNo = versionNo;
        }
      }
      return { versionNo, state: decision };
    }
    const { data } = await api.post<{ version_no: number; template_version_state: 'DISETUJUI' | 'DITOLAK' }>(
      `/document-templates/${id}/versions/${versionNo}/approve`,
      decision === 'DITOLAK' ? { decision, reject_reason: rejectReason } : { decision },
    );
    return { versionNo: data.version_no, state: data.template_version_state };
  },

  // ---------- Minta surat (ESS, jalur mandiri) ----------

  /** `A15` — ESS: `is_self_requestable` + kategori TEMPORARY; semua: aktif + punya versi aktif. */
  async issuableTemplates(actor: DocActor): Promise<IssuableTemplate[]> {
    if (MOCK) {
      await delay(150);
      return templates
        .filter((row) => row.isActive && row.activeVersionNo !== null)
        .filter(
          (row) =>
            actor.role !== 'ROLE_EMPLOYEE' ||
            (row.isSelfRequestable && category(row.categoryId).retentionRegime === 'TEMPORARY'),
        )
        .map((row) => ({
          id: row.id,
          templateName: row.templateName,
          letterTarget: row.letterTarget,
          effectiveRequiresApproval: effectiveRequiresApproval(row),
          activeVersionNo: row.activeVersionNo!,
        }));
    }
    const { data } = await api.get<{ data: IssuableTemplate[] }>('/issuable-letter-templates');
    return data.data;
  },

  /**
   * `A10` jalur mandiri — `subject_employee_id` TIDAK dikirim (diambil dari token). Tanpa gerbang
   * → TERBIT seketika + berkas lahir di katalog; bergerbang → MENUNGGU_PERSETUJUAN tanpa berkas.
   */
  async requestLetter(actor: DocActor, templateId: string): Promise<LetterResult> {
    if (MOCK) {
      await delay(350);
      if (actor.role !== 'ROLE_EMPLOYEE') throw new Error('403 — jalur mandiri hanya untuk karyawan.');
      const row = templates.find((item) => item.id === templateId);
      if (!row) throw new Error('404 NOT_FOUND — templat tidak ditemukan.');
      if (!row.isActive) throw new Error('422 — templat nonaktif.');
      if (row.activeVersionNo === null) throw new Error('422 — templat belum punya versi aktif.');
      if (!row.isSelfRequestable) throw new Error('422 — templat ini tidak dapat diminta sendiri.');
      if (category(row.categoryId).retentionRegime === 'PERMANENT') {
        throw new Error('422 — surat berkategori permanen tidak dapat diminta sendiri.');
      }
      const letter = issueLetter(snapshotOf(actor), row, actor.employeeId, null);
      return {
        letterId: letter.letterId,
        letterIssuanceState: letter.letterIssuanceState,
        letterNo: letter.letterNo,
        documentId: letter.documentId,
      };
    }
    const { data } = await api.post<{ data: LetterResult }>(
      '/letters',
      { template_id: templateId },
      { headers: { 'Idempotency-Key': crypto.randomUUID() } },
    );
    return data.data;
  },
};

// ======================================================================================
// Letter Issuance · Pengaturan Kategori · Jejak Akses · Malware Alerts · Pemeriksaan Publik
// (FSD-001-DOCUMENT-0.8 §5, §7, §8, §8A, §9 · UIC-001-DOCUMENT-0.6 §4–§7)
// ======================================================================================

const fail = (status: number, code: string, message: string): never => {
  throw new ApiError(message, status, code);
};
const personOf = (employeeId: string | null) =>
  DOC_PEOPLE.find((row) => row.employeeId === employeeId) ?? {
    employeeId: employeeId ?? '',
    nama: employeeId ?? '—',
    nik: '—',
  };
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const isOfficer = (actor: DocActor) => actor.role === 'ROLE_HR_STAFF' || actor.role === 'ROLE_HR_MANAGER';
const isApprover = (actor: DocActor) => actor.role === 'ROLE_HR_MANAGER' || actor.role === 'ROLE_SUPER_ADMIN';
/** Data pokok belum lengkap (jabatan formal belum ditetapkan) — penerbitan untuknya gagal (`BATCH-1`). */
const INCOMPLETE_SUBJECTS = new Set(['emp-budi']);

function verificationCode() {
  const part = () =>
    Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
  return `${part()}-${part()}-${part()}`;
}

/**
 * Melahirkan satu surat. Gerbang efektif (kategori PERMANENT ATAU requires_approval) menyala ⇒ baris
 * MENUNGGU_PERSETUJUAN tanpa nomor & berkas; mati (atau sudah disetujui) ⇒ TERBIT + berkas di katalog.
 */
function issueLetter(
  creator: PersonSnapshot,
  template: TemplateDetail,
  subjectId: string | null,
  branchId: string | null,
  force = false,
): Letter {
  const gated = effectiveRequiresApproval(template) && !force;
  const letter: Letter = {
    letterId: nextId('let'),
    templateId: template.id,
    templateName: template.templateName,
    templateVersionNo: template.activeVersionNo ?? 1,
    categoryId: template.categoryId,
    letterTarget: template.letterTarget,
    letterIssuanceState: 'MENUNGGU_PERSETUJUAN',
    letterState: null,
    subjectEmployeeId: subjectId,
    branchId,
    letterNo: null,
    verificationCode: null,
    issuedAt: null,
    documentId: null,
    cancelledAt: null,
    cancelReason: null,
    createdBy: creator,
    createdAt: now(),
  };
  letters.push(letter);
  if (!gated) publishLetter(letter);
  return { ...letter };
}

function publishLetter(letter: Letter) {
  const template = findTemplate(letter.templateId);
  const issuedAt = now();
  const date = new Date();
  letter.letterIssuanceState = 'TERBIT';
  letter.letterState = 'BERLAKU';
  letter.letterNo = `${String((letterCounter += 1)).padStart(3, '0')}/HRD/${ROMAN[date.getMonth()]}/${date.getFullYear()}`;
  letter.verificationCode = verificationCode();
  letter.issuedAt = issuedAt;
  const documentId = nextId('dok');
  const slug = template.templateName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const owner = letter.subjectEmployeeId ? letter.subjectEmployeeId.replace('emp-', '') : (letter.branchId ?? 'semua');
  documents.push({
    documentId,
    categoryId: template.categoryId,
    origin: 'DILAHIRKAN_SISTEM',
    ownerType: letter.letterTarget === 'EDARAN' ? 'PERUSAHAAN' : 'KARYAWAN',
    ownerObjectKind: null,
    ownerId: letter.subjectEmployeeId,
    createdAt: issuedAt,
    versions: [
      {
        versionId: nextId('ver'),
        versionNo: 1,
        originalFilename: `${slug}-${owner}.pdf`,
        sizeBytes: 126_000 + (sequence % 5) * 1_000,
        detectedMime: 'application/pdf',
        scanState: 'BERSIH',
        storageTier: 'PANAS',
        scannedAt: issuedAt,
        createdAt: issuedAt,
      },
    ],
    letter: null,
  });
  letter.documentId = documentId;
  documents[documents.length - 1].letter = letterInfo(letter);
}

const syncLetterDocument = (letter: Letter) => {
  const doc = documents.find((row) => row.documentId === letter.documentId);
  if (doc) doc.letter = letterInfo(letter);
};

const batchView = (row: StoredBatch): LetterBatch => {
  const { items, ...rest } = row;
  void items;
  return { ...rest };
};

const report = (row: StoredBatch): LetterBatchReport => ({
  ...batchView(row),
  summary: {
    waiting: row.items.filter((item) => item.batchItemState === 'MENUNGGU').length,
    succeeded: row.items.filter((item) => item.batchItemState === 'BERHASIL').length,
    failed: row.items.filter((item) => item.batchItemState === 'GAGAL').length,
  },
  items: row.items.map((item) => ({ ...item })),
});

export const letterService = {
  /** `A15` jalur petugas — Super Admin nol akses (tidak menerbitkan). */
  async issuableTemplates(actor: DocActor): Promise<IssuableTemplate[]> {
    if (MOCK && !isOfficer(actor)) fail(403, 'FORBIDDEN', 'Hanya HR Staff dan HR Manager yang menerbitkan surat.');
    return documentService.issuableTemplates(actor);
  },

  /** `A10` jalur petugas — pokok surat wajib untuk PERORANGAN, cabang hanya untuk EDARAN. `201` pada kedua cabang. */
  async issue(actor: DocActor, draft: LetterDraft): Promise<Letter> {
    if (MOCK) {
      await delay(320);
      if (!isOfficer(actor)) fail(403, 'FORBIDDEN', 'Hanya HR Staff dan HR Manager yang menerbitkan surat.');
      const template =
        templates.find((row) => row.id === draft.templateId) ?? fail(404, 'NOT_FOUND', 'Templat tidak ditemukan.');
      if (!template.isActive && !draft.reissueOfLetterId) fail(422, 'VALIDATION_ERROR', 'Templat nonaktif.');
      if (template.activeVersionNo === null)
        fail(422, 'VALIDATION_ERROR', 'Templat belum punya naskah yang disetujui.');
      if (template.letterTarget === 'PERORANGAN' && !draft.subjectEmployeeId)
        fail(422, 'VALIDATION_ERROR', 'Surat perorangan wajib menyebut karyawan pokok surat.');
      if (template.letterTarget === 'EDARAN' && draft.subjectEmployeeId)
        fail(422, 'VALIDATION_ERROR', 'Surat edaran tidak ditujukan ke satu karyawan.');
      if (template.letterTarget === 'PERORANGAN' && draft.branchId)
        fail(422, 'VALIDATION_ERROR', 'Cabang penerima hanya untuk surat edaran.');
      if (draft.reissueOfLetterId) {
        const origin = letters.find((row) => row.letterId === draft.reissueOfLetterId);
        if (!origin || origin.letterIssuanceState !== 'TERBIT' || origin.letterState === 'DIBATALKAN')
          fail(422, 'VALIDATION_ERROR', 'Pelahiran ulang hanya atas surat yang sudah terbit dan tidak dibatalkan.');
      }
      if (draft.subjectEmployeeId && INCOMPLETE_SUBJECTS.has(draft.subjectEmployeeId))
        fail(422, 'VALIDATION_ERROR', 'Data pengisi surat tidak lengkap: jabatan formal belum ditetapkan.');
      return issueLetter(snapshotOf(actor), template, draft.subjectEmployeeId || null, draft.branchId || null);
    }
    const { data } = await api.post<{ data: Letter }>(
      '/letters',
      {
        template_id: draft.templateId,
        subject_employee_id: draft.subjectEmployeeId || undefined,
        branch_id: draft.branchId || undefined,
        reissue_of_letter_id: draft.reissueOfLetterId || undefined,
      },
      { headers: { 'Idempotency-Key': crypto.randomUUID() } },
    );
    return data.data;
  },

  /** Surat bergerbang yang menunggu keputusan — daftar kerja penyetuju (bukan grid pencarian surat). */
  async pendingLetters(actor: DocActor): Promise<Letter[]> {
    if (MOCK) {
      await delay(150);
      if (!isOfficer(actor) && actor.role !== 'ROLE_SUPER_ADMIN') fail(403, 'FORBIDDEN', 'Tidak berwenang.');
      return letters
        .filter((row) => row.letterIssuanceState === 'MENUNGGU_PERSETUJUAN')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((row) => ({ ...row }));
    }
    return [];
  },

  /** `A11` — urutan: keadaan (422) → penyetuju ≠ pengaju (403) → peran (403) → lahirkan/tolak. */
  async approve(actor: DocActor, letterId: string, approved: boolean, rejectReason = ''): Promise<Letter> {
    if (MOCK) {
      await delay(280);
      const letter =
        letters.find((row) => row.letterId === letterId) ?? fail(404, 'NOT_FOUND', 'Surat tidak ditemukan.');
      if (letter.letterIssuanceState !== 'MENUNGGU_PERSETUJUAN')
        fail(422, 'VALIDATION_ERROR', 'Surat ini sudah diputuskan.');
      if (letter.createdBy.employeeId === actor.employeeId)
        fail(403, 'FORBIDDEN', 'Penyetuju wajib berbeda dari pengaju surat.');
      if (!isApprover(actor))
        fail(403, 'FORBIDDEN', 'Hanya HR Manager atau Super Admin (tangga cadangan) yang menyetujui.');
      const reason = rejectReason.trim();
      if (!approved && (!reason || reason.length > 100))
        fail(422, 'VALIDATION_ERROR', 'Alasan penolakan wajib, 1–100 karakter.');
      if (approved && reason) fail(422, 'VALIDATION_ERROR', 'Alasan penolakan hanya untuk keputusan tolak.');
      if (approved) publishLetter(letter);
      else letter.letterIssuanceState = 'DITOLAK';
      return { ...letter };
    }
    const { data } = await api.post<{ data: Letter }>(
      `/letters/${letterId}/approve`,
      approved ? { approved } : { approved, reject_reason: rejectReason },
      { headers: { 'Idempotency-Key': crypto.randomUUID() } },
    );
    return data.data;
  },

  /** `A12` — dari detail dokumen (`A4`); berkas tidak disentuh; alasan boleh tampil di A4, DILARANG di halaman publik. */
  async cancel(actor: DocActor, letterId: string, cancelReason: string): Promise<Letter> {
    if (MOCK) {
      await delay(260);
      if (!isOfficer(actor)) fail(403, 'FORBIDDEN', 'Hanya HR Staff dan HR Manager yang membatalkan surat.');
      const letter =
        letters.find((row) => row.letterId === letterId) ?? fail(404, 'NOT_FOUND', 'Surat tidak ditemukan.');
      if (letter.letterIssuanceState !== 'TERBIT') fail(422, 'VALIDATION_ERROR', 'Surat belum terbit.');
      if (letter.letterState === 'DIBATALKAN') fail(422, 'VALIDATION_ERROR', 'Surat sudah dibatalkan.');
      if (category(letter.categoryId).retentionRegime === 'PERMANENT')
        fail(422, 'VALIDATION_ERROR', 'Surat berkategori permanen tidak memiliki jalur pembatalan.');
      const reason = cancelReason.trim();
      if (!reason || reason.length > 500) fail(422, 'VALIDATION_ERROR', 'Alasan pembatalan wajib, 1–500 karakter.');
      letter.letterState = 'DIBATALKAN';
      letter.cancelledAt = now();
      letter.cancelReason = reason;
      syncLetterDocument(letter);
      return { ...letter };
    }
    const { data } = await api.post<{ data: Letter }>(`/letters/${letterId}/cancel`, { cancel_reason: cancelReason });
    return data.data;
  },

  /** Baris surat untuk blok `letter` di A4 (alasan pembatalan boleh tampil di sini). */
  async letter(letterId: string): Promise<Letter | null> {
    if (MOCK) {
      await delay(80);
      const row = letters.find((item) => item.letterId === letterId);
      return row ? { ...row } : null;
    }
    return null;
  },

  /** `A13c` — grid kumpulan; lingkup = perusahaan (bukan "hanya milik saya"). */
  async batches(actor: DocActor, search: BatchSearch): Promise<LetterBatch[]> {
    if (MOCK) {
      await delay();
      if (!isOfficer(actor) && actor.role !== 'ROLE_SUPER_ADMIN') fail(403, 'FORBIDDEN', 'Tidak berwenang.');
      return batches
        .filter((row) => !search.batchState || row.batchState === search.batchState)
        .filter((row) => !search.templateId || row.templateId === search.templateId)
        .filter((row) => !search.submittedByEmployeeId || row.createdBy.employeeId === search.submittedByEmployeeId)
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
        .map(batchView);
    }
    const { data } = await api.post<{ data: LetterBatch[] }>('/letter-batches/search', {
      batch_state: search.batchState ? [search.batchState] : undefined,
      template_id: search.templateId,
      submitted_by_employee_id: search.submittedByEmployeeId,
    });
    return data.data;
  },

  /** `A13b` — laporan tetap dapat dibuka sesudah antrean tuntas. */
  async batchReport(actor: DocActor, id: string): Promise<LetterBatchReport> {
    if (MOCK) {
      await delay(180);
      if (!isOfficer(actor) && actor.role !== 'ROLE_SUPER_ADMIN') fail(403, 'FORBIDDEN', 'Tidak berwenang.');
      const row = batches.find((item) => item.id === id) ?? fail(404, 'NOT_FOUND', 'Kumpulan tidak ditemukan.');
      return report(row);
    }
    const { data } = await api.get<{ data: LetterBatchReport }>(`/letter-batches/${id}`);
    return data.data;
  },

  /** `A13a` — ≥2 penerima unik, templat PERORANGAN aktif ber-naskah disetujui; keberadaan penerima dicek saat dijalankan. */
  async submitBatch(actor: DocActor, templateId: string, recipientIds: string[]): Promise<LetterBatch> {
    if (MOCK) {
      await delay(300);
      if (!isOfficer(actor)) fail(403, 'FORBIDDEN', 'Hanya HR Staff dan HR Manager yang mengajukan penerbitan massal.');
      if (recipientIds.length < 2) fail(422, 'VALIDATION_ERROR', 'Penerbitan massal membutuhkan minimal dua penerima.');
      if (new Set(recipientIds).size !== recipientIds.length)
        fail(422, 'VALIDATION_ERROR', 'Penerima tidak boleh kembar.');
      const template =
        templates.find((row) => row.id === templateId) ?? fail(422, 'VALIDATION_ERROR', 'Templat tidak ditemukan.');
      if (!template.isActive) fail(422, 'VALIDATION_ERROR', 'Templat nonaktif.');
      if (template.activeVersionNo === null)
        fail(422, 'VALIDATION_ERROR', 'Templat belum punya naskah yang disetujui.');
      if (template.letterTarget === 'EDARAN')
        fail(422, 'VALIDATION_ERROR', 'Surat edaran tidak dapat diterbitkan massal.');
      batchCounter += 1;
      const row: StoredBatch = {
        id: `batch-${batchCounter}`,
        code: `BATCH-${batchCounter}`,
        templateId,
        templateName: template.templateName,
        templateVersionNo: template.activeVersionNo ?? 1,
        batchState: 'MENUNGGU_PERSETUJUAN',
        recipientCount: recipientIds.length,
        submittedAt: now(),
        createdBy: snapshotOf(actor),
        approvedAt: null,
        approvedBy: null,
        finishedAt: null,
        items: recipientIds.map((subjectEmployeeId) => ({
          subjectEmployeeId,
          batchItemState: 'MENUNGGU',
          letterId: null,
          failureReason: null,
        })),
      };
      batches.push(row);
      return batchView(row);
    }
    const { data } = await api.post<{ data: LetterBatch }>(
      '/letter-batches',
      { template_id: templateId, recipient_employee_ids: recipientIds },
      { headers: { 'Idempotency-Key': crypto.randomUUID() } },
    );
    return data.data;
  },

  /**
   * `A14` — urutan: keadaan (422) → peran (403) → penyetuju ≠ pengaju (403). Setuju ⇒ penerima beku, pekerja latar
   * menjalankan tugas per penerima (di mock seketika): gagal per orang tidak menggagalkan kumpulan.
   */
  async decideBatch(actor: DocActor, id: string, decision: 'DISETUJUI' | 'DITOLAK'): Promise<LetterBatch> {
    if (MOCK) {
      await delay(300);
      const row = batches.find((item) => item.id === id) ?? fail(404, 'NOT_FOUND', 'Kumpulan tidak ditemukan.');
      if (row.batchState !== 'MENUNGGU_PERSETUJUAN') fail(422, 'VALIDATION_ERROR', 'Kumpulan ini sudah diputuskan.');
      if (!isApprover(actor))
        fail(403, 'FORBIDDEN', 'Hanya HR Manager atau Super Admin (tangga cadangan) yang memutus kumpulan.');
      if (row.createdBy.employeeId === actor.employeeId)
        fail(403, 'FORBIDDEN', 'Penyetuju wajib berbeda dari pengaju kumpulan.');
      row.approvedAt = now();
      row.approvedBy = snapshotOf(actor);
      if (decision === 'DITOLAK') {
        row.batchState = 'DITOLAK';
        return batchView(row);
      }
      row.batchState = 'BERJALAN';
      const template = findTemplate(row.templateId);
      row.items.forEach((item) => {
        if (
          INCOMPLETE_SUBJECTS.has(item.subjectEmployeeId) ||
          !DOC_PEOPLE.some((p) => p.employeeId === item.subjectEmployeeId)
        ) {
          item.batchItemState = 'GAGAL';
          item.failureReason = 'Data pengisi surat tidak lengkap: jabatan formal belum ditetapkan';
          return;
        }
        const letter = issueLetter(row.createdBy, template, item.subjectEmployeeId, null, true);
        item.batchItemState = 'BERHASIL';
        item.letterId = letter.letterId;
      });
      row.batchState = 'SELESAI';
      row.finishedAt = now();
      return batchView(row);
    }
    const { data } = await api.post<{ data: LetterBatch }>(`/letter-batches/${id}/approve`, { decision });
    return data.data;
  },
};

// ---------- Pengaturan Kategori ----------

const REJECTED_MIME = [
  'image/svg+xml',
  'application/zip',
  'application/x-7z-compressed',
  'application/x-rar-compressed',
  'application/gzip',
];
const MAX_SIZE = 25 * 1024 * 1024;
const impactOf = (id: string) => documents.filter((row) => row.categoryId === id).length;
const adminView = (row: CategoryAdmin): CategoryAdmin => ({
  ...row,
  allowedMimeTypes: [...row.allowedMimeTypes],
  readerRoles: [...row.readerRoles],
  impactCount: impactOf(row.id),
});

/** Arah perubahan satu atribut — MELONGGARKAN membuka lebih lebar dan wajib orang kedua. */
function loosens(row: CategoryAdmin, key: keyof CategoryAttributes, next: unknown): boolean {
  switch (key) {
    case 'retentionDays':
      return typeof next === 'number' && row.retentionDays !== null && next < row.retentionDays;
    case 'maxFileSizeBytes':
      return typeof next === 'number' && next > row.maxFileSizeBytes;
    case 'allowedMimeTypes':
      return Array.isArray(next) && next.some((mime) => !row.allowedMimeTypes.includes(mime));
    case 'isReplaceable':
    case 'isRegenerable':
    case 'shownInSelfService':
    case 'isActive':
      return next === true && row[key] === false;
    default:
      return false;
  }
}

export const categoryAdminService = {
  /** `A6a` — tepat HR Manager & Super Admin; urut nama; `include_inactive` = penanda keterlihatan. */
  async list(actor: DocActor, includeInactive = false): Promise<CategoryAdmin[]> {
    if (MOCK) {
      await delay();
      if (!isApprover(actor)) fail(403, 'FORBIDDEN', 'Pengaturan kategori hanya untuk HR Manager dan Super Admin.');
      return categories
        .filter((row) => includeInactive || row.isActive)
        .sort((a, b) => a.categoryName.localeCompare(b.categoryName))
        .map(adminView);
    }
    const { data } = await api.get<{ categories: CategoryAdmin[] }>('/document-categories', {
      params: { include_inactive: includeInactive },
    });
    return data.categories;
  },

  /** `A6b` — HR Manager, tanpa orang kedua (kategori baru nol dokumen); asal PERUSAHAAN + kelas BIASA dipaksa. */
  async create(actor: DocActor, draft: CategoryDraft): Promise<CategoryAdmin> {
    if (MOCK) {
      await delay(300);
      if (actor.role !== 'ROLE_HR_MANAGER') fail(403, 'FORBIDDEN', 'Hanya HR Manager yang membuat kategori.');
      const code = draft.categoryCode.trim();
      if (!/^[a-z][a-z0-9_]{2,59}$/.test(code))
        fail(422, 'VALIDATION_ERROR', 'Kode kategori: huruf kecil, angka, garis bawah (3–60).');
      if (!draft.categoryName.trim()) fail(422, 'VALIDATION_ERROR', 'Nama kategori wajib diisi.');
      if (categories.some((row) => row.categoryCode === code))
        fail(409, 'DUPLICATE_CONFLICT', `Kode "${code}" sudah dipakai.`);
      const days = Number(draft.retentionDays);
      if (draft.retentionRegime === 'TEMPORARY' && !(days > 0))
        fail(422, 'VALIDATION_ERROR', 'Masa simpan wajib untuk rezim sementara.');
      if (draft.retentionRegime === 'PERMANENT' && draft.retentionDays)
        fail(422, 'VALIDATION_ERROR', 'Masa simpan dilarang untuk rezim permanen.');
      const size = Math.round(Number(draft.maxFileSizeMb) * 1024 * 1024);
      if (!(size > 0) || size > MAX_SIZE) fail(422, 'VALIDATION_ERROR', 'Batas ukuran wajib, maksimal 25 MB.');
      if (!draft.allowedMimeTypes.length) fail(422, 'VALIDATION_ERROR', 'Pilih minimal satu jenis berkas.');
      if (draft.allowedMimeTypes.some((mime) => REJECTED_MIME.includes(mime)))
        fail(422, 'VALIDATION_ERROR', 'SVG dan arsip terkompresi tidak diizinkan.');
      const row: CategoryAdmin = {
        id: nextId('cat'),
        categoryCode: code,
        categoryName: draft.categoryName.trim(),
        categoryOrigin: 'PERUSAHAAN',
        confidentialityClass: 'BIASA',
        retentionRegime: draft.retentionRegime,
        retentionDays: draft.retentionRegime === 'TEMPORARY' ? days : null,
        maxFileSizeBytes: size,
        allowedMimeTypes: [...draft.allowedMimeTypes],
        isReplaceable: draft.isReplaceable,
        isRegenerable: draft.isRegenerable,
        shownInSelfService: draft.shownInSelfService,
        isActive: true,
        hasPendingChange: false,
        readerRoles: ['ROLE_HR_MANAGER'],
        pending: null,
        impactCount: 0,
      };
      categories.push(row);
      return adminView(row);
    }
    const { data } = await api.post<CategoryAdmin>('/document-categories', draft);
    return data;
  },

  /**
   * `A6c` — dua jalur: MENGETAT berlaku seketika; MELONGGARKAN melahirkan usulan (respons memuat nilai BERLAKU,
   * penanda tertahan menyala) dan wajib membawa `acknowledged_impact_count`. Usulan lain menunggu ⇒ 409.
   */
  async update(
    actor: DocActor,
    id: string,
    patch: Partial<CategoryAttributes>,
    acknowledgedImpactCount?: number,
  ): Promise<{ category: CategoryAdmin; mode: 'IMMEDIATE' | 'PROPOSED' }> {
    if (MOCK) {
      await delay(280);
      if (actor.role !== 'ROLE_HR_MANAGER') fail(403, 'FORBIDDEN', 'Hanya HR Manager yang mengubah kategori.');
      const row = categories.find((item) => item.id === id) ?? fail(404, 'NOT_FOUND', 'Kategori tidak ditemukan.');
      if (row.hasPendingChange)
        fail(409, 'DUPLICATE_CONFLICT', 'Kategori sedang memikul usulan yang menunggu persetujuan.');
      if (patch.retentionDays !== undefined && row.retentionRegime === 'PERMANENT')
        fail(422, 'VALIDATION_ERROR', 'Masa simpan dilarang untuk rezim permanen.');
      if (patch.maxFileSizeBytes !== undefined && (patch.maxFileSizeBytes <= 0 || patch.maxFileSizeBytes > MAX_SIZE))
        fail(422, 'VALIDATION_ERROR', 'Batas ukuran maksimal 25 MB.');
      if (patch.allowedMimeTypes?.some((mime) => REJECTED_MIME.includes(mime)))
        fail(422, 'VALIDATION_ERROR', 'SVG dan arsip terkompresi tidak diizinkan.');
      const changes = Object.fromEntries(
        Object.entries(patch).filter(
          ([key, value]) => JSON.stringify(row[key as keyof CategoryAttributes]) !== JSON.stringify(value),
        ),
      ) as Partial<CategoryAttributes>;
      if (!Object.keys(changes).length) return { category: adminView(row), mode: 'IMMEDIATE' };
      const loosening = (Object.keys(changes) as (keyof CategoryAttributes)[]).some((key) =>
        loosens(row, key, changes[key]),
      );
      if (!loosening) {
        Object.assign(row, changes);
        return { category: adminView(row), mode: 'IMMEDIATE' };
      }
      if (acknowledgedImpactCount === undefined)
        fail(422, 'VALIDATION_ERROR', 'acknowledged_impact_count wajib dikirim untuk perubahan yang melonggarkan.');
      row.hasPendingChange = true;
      row.pending = {
        kind: 'ATTRIBUTES',
        changes,
        readerRoles: null,
        acknowledgedImpactCount: acknowledgedImpactCount!,
        proposedBy: snapshotOf(actor),
        proposedAt: now(),
      };
      return { category: adminView(row), mode: 'PROPOSED' };
    }
    const { data } = await api.put<CategoryAdmin>(`/document-categories/${id}`, {
      ...patch,
      acknowledged_impact_count: acknowledgedImpactCount,
    });
    return { category: data, mode: data.hasPendingChange ? 'PROPOSED' : 'IMMEDIATE' };
  },

  /** `A7` — penggantian SELURUH daftar peran pembaca; hanya kategori BIASA; bergerbang A6d yang sama. */
  async setReaders(
    actor: DocActor,
    id: string,
    roleCodes: string[],
    acknowledgedImpactCount?: number,
  ): Promise<CategoryAdmin> {
    if (MOCK) {
      await delay(280);
      if (actor.role !== 'ROLE_HR_MANAGER')
        fail(403, 'FORBIDDEN', 'Hanya HR Manager yang menetapkan pembaca kategori.');
      const row = categories.find((item) => item.id === id) ?? fail(404, 'NOT_FOUND', 'Kategori tidak ditemukan.');
      if (row.confidentialityClass === 'SENSITIF')
        fail(403, 'FORBIDDEN', 'Kategori berkelas SENSITIF tidak dapat diubah daftar pembacanya.');
      if (row.hasPendingChange)
        fail(409, 'DUPLICATE_CONFLICT', 'Kategori sedang memikul usulan yang menunggu persetujuan.');
      if (new Set(roleCodes).size !== roleCodes.length) fail(422, 'VALIDATION_ERROR', 'Peran kembar.');
      if (acknowledgedImpactCount === undefined)
        fail(422, 'VALIDATION_ERROR', 'acknowledged_impact_count wajib dikirim.');
      row.hasPendingChange = true;
      row.pending = {
        kind: 'READERS',
        changes: {},
        readerRoles: [...roleCodes],
        acknowledgedImpactCount: acknowledgedImpactCount!,
        proposedBy: snapshotOf(actor),
        proposedAt: now(),
      };
      return adminView(row);
    }
    const { data } = await api.put<CategoryAdmin>(`/document-categories/${id}/readers`, {
      role_codes: roleCodes,
      acknowledged_impact_count: acknowledgedImpactCount,
    });
    return data;
  },

  /** `A6d` — Super Admin saja, berbeda ORANG dari pengusul; SETUJU wajib membawa angka dampak yang SAMA. */
  async decide(
    actor: DocActor,
    id: string,
    decision: 'SETUJU' | 'TOLAK',
    input: { acknowledgedImpactCount?: number; rejectReason?: string },
  ): Promise<CategoryAdmin & { rejectReason?: string }> {
    if (MOCK) {
      await delay(280);
      if (actor.role !== 'ROLE_SUPER_ADMIN') fail(403, 'FORBIDDEN', 'Keputusan orang kedua milik Super Admin.');
      const row = categories.find((item) => item.id === id) ?? fail(404, 'NOT_FOUND', 'Kategori tidak ditemukan.');
      const pending = row.pending ?? fail(422, 'VALIDATION_ERROR', 'Kategori tidak memikul usulan.');
      if (pending.proposedBy.employeeId === actor.employeeId)
        fail(422, 'VALIDATION_ERROR', 'Penyetuju tidak boleh sama dengan pengusul.');
      if (decision === 'SETUJU') {
        if (input.acknowledgedImpactCount !== pending.acknowledgedImpactCount)
          fail(422, 'VALIDATION_ERROR', 'Angka dampak berselisih dengan yang diakui pengusul.');
        if (pending.kind === 'READERS' && pending.readerRoles) row.readerRoles = [...pending.readerRoles];
        else Object.assign(row, pending.changes);
        row.pending = null;
        row.hasPendingChange = false;
        return adminView(row);
      }
      const reason = input.rejectReason?.trim() ?? '';
      if (!reason) fail(422, 'VALIDATION_ERROR', 'Alasan penolakan wajib diisi.');
      row.pending = null;
      row.hasPendingChange = false;
      return { ...adminView(row), rejectReason: reason };
    }
    const { data } = await api.post<CategoryAdmin>(`/document-categories/${id}/approve`, {
      decision,
      acknowledged_impact_count: input.acknowledgedImpactCount,
      reject_reason: input.rejectReason,
    });
    return data;
  },
};

// ---------- Jejak Akses Dokumen ----------

export const accessTrailService = {
  /** `A5` — tepat dua pembaca (saling mengawasi); membaca jejak TIDAK melahirkan baris jejak baru. */
  async search(actor: DocActor, search: AccessTrailSearch): Promise<AccessTrailRow[]> {
    if (MOCK) {
      await delay();
      if (!isApprover(actor)) fail(403, 'FORBIDDEN', 'Peran tidak berwenang membaca jejak akses.');
      if (search.startDate && search.endDate && search.endDate < search.startDate)
        fail(422, 'VALIDATION_ERROR', 'Rentang tanggal terbalik.');
      const live: AccessTrailRow[] = accessLog.map((row, index) => {
        const doc = documents.find((item) => item.documentId === row.documentId);
        const version = doc ? activeVersion(doc) : null;
        const single = row.accessGranularity === 'PER_PEMBUKAAN';
        return {
          id: `live-${index}`,
          accessGranularity: row.accessGranularity,
          documentId: single ? row.documentId : null,
          versionId: single ? (version?.versionId ?? null) : null,
          documentIds: single ? [] : [{ documentId: row.documentId, versionId: version?.versionId ?? '' }],
          documentCount: 1,
          accessedAt: row.accessedAt,
          accessedAtTimezone: 'Asia/Jakarta',
          sourceIp: '10.0.3.134',
          flaggedUnreasonable: false,
          accessedBy: personOf(row.accessorEmployeeId),
        };
      });
      const day = (iso: string) => iso.slice(0, 10);
      return [...trail, ...live]
        .filter((row) => !search.actorEmployeeId || row.accessedBy.employeeId === search.actorEmployeeId)
        .filter((row) => !search.accessGranularity || row.accessGranularity === search.accessGranularity)
        .filter(
          (row) => search.flaggedUnreasonable === undefined || row.flaggedUnreasonable === search.flaggedUnreasonable,
        )
        .filter((row) => !search.startDate || day(row.accessedAt) >= search.startDate)
        .filter((row) => !search.endDate || day(row.accessedAt) <= search.endDate)
        .sort((a, b) => b.accessedAt.localeCompare(a.accessedAt));
    }
    const { data } = await api.post<{ data: AccessTrailRow[] }>('/document-access-logs/search', search);
    return data.data;
  },

  /** Nama berkas + versi untuk kolom Dokumen (baris PER_PEMBUKAAN); null bila sudah tersapu. */
  documentLabel(documentId: string | null, versionId: string | null): string | null {
    const doc = documents.find((row) => row.documentId === documentId);
    const version = doc?.versions.find((ver) => ver.versionId === versionId) ?? (doc ? activeVersion(doc) : undefined);
    return version ? `${version.originalFilename} · v${version.versionNo}` : null;
  },
};

// ---------- Malware Alerts ----------

export const malwareService = {
  /** `A17` — tepat HR Manager & Super Admin; nol nama berkas; kosong keadaan ⇒ keduanya terbaca. */
  async search(actor: DocActor, search: MalwareSearch): Promise<MalwareAlert[]> {
    if (MOCK) {
      await delay();
      if (!isApprover(actor))
        fail(403, 'FORBIDDEN', 'Peringatan berkas berbahaya hanya untuk HR Manager dan Super Admin.');
      if (search.startDate && search.endDate && search.endDate < search.startDate)
        fail(422, 'VALIDATION_ERROR', 'Rentang tanggal terbalik.');
      const day = (iso: string) => iso.slice(0, 10);
      return alerts
        .filter((row) => !search.malwareAlertState || row.malwareAlertState === search.malwareAlertState)
        .filter((row) => !search.uploaderEmployeeId || row.uploaderEmployeeId === search.uploaderEmployeeId)
        .filter((row) => !search.startDate || day(row.detectedAt) >= search.startDate)
        .filter((row) => !search.endDate || day(row.detectedAt) <= search.endDate)
        .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt))
        .map((row) => ({ ...row }));
    }
    const { data } = await api.post<{ data: MalwareAlert[] }>('/malware-alerts/search', search);
    return data.data;
  },

  /**
   * `A18` — MENGHAPUS berkasnya: objek dihapus DULU, penandaan ditulis SESUDAH penghapusan berhasil. Gagal hapus ⇒
   * penandaan batal, baris tetap AKTIF. Kiriman kedua atas baris DITANGANI = 200 apa adanya (bukan galat).
   */
  async handle(actor: DocActor, id: string, handlingNote: string): Promise<MalwareAlert> {
    if (MOCK) {
      await delay(320);
      if (!isApprover(actor)) fail(403, 'FORBIDDEN', 'Hanya HR Manager dan Super Admin yang menangani peringatan.');
      const row = alerts.find((item) => item.id === id) ?? fail(404, 'NOT_FOUND', 'Peringatan tidak ditemukan.');
      const note = handlingNote.trim();
      if (!note || handlingNote.length > 1000) fail(422, 'VALIDATION_ERROR', 'Catatan tindakan wajib, 1–1000 aksara.');
      if (row.malwareAlertState === 'DITANGANI') return { ...row };
      const objectKey = row.versionId ?? row.documentId;
      if (failingDeletes.has(objectKey))
        fail(
          500,
          'INTERNAL_ERROR',
          'Penghapusan berkas gagal — berkas tidak dihapus dan peringatan tetap belum ditangani.',
        );
      deletedObjects.add(objectKey);
      row.malwareAlertState = 'DITANGANI';
      row.handledAt = now();
      row.handlingNote = note;
      row.handledBy = snapshotOf(actor);
      return { ...row };
    }
    const { data } = await api.post<MalwareAlert>(`/malware-alerts/${id}/handle`, { handling_note: handlingNote });
    return data;
  },

  /** Hanya untuk pengujian — paksa penghapusan objek gagal / periksa objek sudah terhapus. */
  failDeleteFor(objectKey: string) {
    failingDeletes.add(objectKey);
  },
  isDeleted(objectKey: string) {
    return deletedObjects.has(objectKey);
  },
};

// ---------- Pemeriksaan keaslian publik (Rezim C, tanpa token) ----------

const CODE_PATTERN = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
const sameName = (a: string, b: string) =>
  a.trim().toLowerCase().replace(/\s+/g, ' ') === b.trim().toLowerCase().replace(/\s+/g, ' ');

function matchLetter(letter: Letter | undefined, subjectName: string): VerifyResult {
  // Lima sebab berbeda mendarat di SATU bentuk yang sama — tanpa satu field pun selain `matched`.
  if (!letter || letter.letterIssuanceState !== 'TERBIT' || !letter.subjectEmployeeId) return { matched: false };
  if (!sameName(personOf(letter.subjectEmployeeId).nama, subjectName)) return { matched: false };
  return {
    matched: true,
    letterType: letter.templateName,
    issuedAt: (letter.issuedAt ?? '').slice(0, 10),
    issuedAtTimezone: 'Asia/Jakarta',
    letterState: letter.letterState ?? 'BERLAKU',
    ...(letter.letterState === 'DIBATALKAN'
      ? { cancelledAt: (letter.cancelledAt ?? '').slice(0, 10), cancelledAtTimezone: 'Asia/Jakarta' }
      : {}),
  };
}

const checkName = (subjectName: string) => {
  const name = subjectName.trim();
  if (name.length < 2 || name.length > 100) fail(422, 'VALIDATION_ERROR', 'Nama pada surat wajib, 2–100 karakter.');
};

export const verifyService = {
  /** `C2a` — bentuk & isi sama persis apakah kode ada atau tidak. */
  async open(code: string): Promise<{ verificationCode: string; nameRequired: true }> {
    if (MOCK) {
      await delay(120);
      if (!CODE_PATTERN.test(code)) fail(400, 'BAD_REQUEST', 'Bentuk kode pemeriksaan tidak sah.');
      return { verificationCode: code, nameRequired: true };
    }
    const { data } = await api.get<{ verification_code: string }>(`/verify/${code}`);
    return { verificationCode: data.verification_code, nameRequired: true };
  },

  /** `C2b` — nama yang diketik TIDAK PERNAH disimpan. */
  async byCode(code: string, subjectName: string): Promise<VerifyResult> {
    if (MOCK) {
      await delay(250);
      if (!CODE_PATTERN.test(code)) fail(400, 'BAD_REQUEST', 'Bentuk kode pemeriksaan tidak sah.');
      checkName(subjectName);
      return matchLetter(
        letters.find((row) => row.verificationCode === code),
        subjectName,
      );
    }
    const { data } = await api.post<VerifyResult>(`/verify/${code}`, { subject_name: subjectName });
    return data;
  },

  /** `C2c` — nomor surat di BADAN (memuat garis miring); surat EDARAN selalu tidak cocok. */
  async byNumber(letterNo: string, subjectName: string): Promise<VerifyResult> {
    if (MOCK) {
      await delay(250);
      const no = letterNo.trim();
      if (no.length < 2 || no.length > 60) fail(422, 'VALIDATION_ERROR', 'Nomor surat wajib, 2–60 karakter.');
      checkName(subjectName);
      return matchLetter(
        letters.find((row) => row.letterNo === no),
        subjectName,
      );
    }
    const { data } = await api.post<VerifyResult>('/verify', { letter_no: letterNo, subject_name: subjectName });
    return data;
  },
};

export const branchName = (id: string | null) => BRANCHES.find((row) => row.id === id)?.name ?? '—';
export const personName = (id: string | null) => personOf(id).nama;
