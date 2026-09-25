import { api } from '@/services/api';
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

let documents: Stored[] = [];
let templates: TemplateDetail[] = [];
let accessLog: AccessLogRow[] = [];
let sequence = 0;
let letterCounter = 1;

export function resetDocumentMocks() {
  documents = DOCUMENT_SEED.map((row) => ({ ...row, versions: row.versions.map((ver) => ({ ...ver })) }));
  templates = TEMPLATE_SEED.map((row) => ({ ...row, versions: row.versions.map((ver) => ({ ...ver })) }));
  accessLog = [];
  sequence = 0;
  letterCounter = 1;
}
resetDocumentMocks();

const nextId = (prefix: string) => `${prefix}-${(sequence += 1).toString(36)}${Date.now().toString(36).slice(-4)}`;
const category = (id: string) => CATEGORY_SEED.find((row) => row.id === id)!;
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
      return CATEGORY_SEED.filter(
        (row) => row.isActive && (actor.role !== 'ROLE_EMPLOYEE' || row.shownInSelfService),
      ).map((row) => ({ id: row.id, categoryName: row.categoryName }));
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
      return CATEGORY_SEED.filter((row) => row.isActive).map((row) => ({ ...row }));
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
      const letterId = nextId('let');
      if (effectiveRequiresApproval(row)) {
        return { letterId, letterIssuanceState: 'MENUNGGU_PERSETUJUAN', letterNo: null, documentId: null };
      }
      const issuedAt = now();
      const month = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][new Date().getMonth()];
      const letterNo = `${String((letterCounter += 1)).padStart(3, '0')}/HRD/${month}/${new Date().getFullYear()}`;
      const documentId = nextId('dok');
      const slug = row.templateName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      documents.push({
        documentId,
        categoryId: row.categoryId,
        origin: 'DILAHIRKAN_SISTEM',
        ownerType: 'KARYAWAN',
        ownerObjectKind: null,
        ownerId: actor.employeeId,
        createdAt: issuedAt,
        versions: [
          {
            versionId: nextId('ver'),
            versionNo: 1,
            originalFilename: `${slug}-${actor.employeeId.replace('emp-', '')}.pdf`,
            sizeBytes: 126_000 + (sequence % 5) * 1_000,
            detectedMime: 'application/pdf',
            scanState: 'BERSIH',
            storageTier: 'PANAS',
            scannedAt: issuedAt,
            createdAt: issuedAt,
          },
        ],
        letter: {
          letterId,
          letterNo,
          letterTarget: row.letterTarget,
          letterIssuanceState: 'TERBIT',
          letterState: 'BERLAKU',
          issuedAt,
          templateId: row.id,
          templateVersionId: row.activeVersionId!,
        },
      });
      return { letterId, letterIssuanceState: 'TERBIT', letterNo, documentId };
    }
    const { data } = await api.post<{ data: LetterResult }>(
      '/letters',
      { template_id: templateId },
      { headers: { 'Idempotency-Key': crypto.randomUUID() } },
    );
    return data.data;
  },
};
