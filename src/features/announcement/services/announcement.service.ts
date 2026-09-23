import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import { textToHtml } from '@/features/announcement/content';
import {
  CATEGORY_OPTIONS,
  RECIPIENT_ROLE_OPTIONS,
  type AnnouncementAttachment,
  type AnnouncementDetail,
  type AnnouncementDraft,
  type AnnouncementFilter,
  type AnnouncementRow,
  type CompanyFile,
  type MyAnnouncementDetail,
  type MyAnnouncementRow,
  type PersonRef,
} from '@/features/announcement/types';

/**
 * API service Announcement (UIC-001-COMPANY §3C · TSD-001-COMPANY §6.15/§7.9).
 *
 *   POST /announcements/search · GET /announcements/{id}
 *   POST /announcements · PUT /announcements/{id}         — rancangan; 4 medan beku sesudah terbit → 422
 *   POST /announcements/{id}/publish                      — satu tangan, satu arah DRAFT → PUBLISHED
 *   POST|DELETE /announcements/{id}/attachments[/{aid}]   — menautkan berkas Company Files, bukan mengunggah
 *   GET /company/my-announcements[/{id}]                  — baca karyawan; salah sasaran/DRAFT → 404
 */

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));
const newId = () => crypto.randomUUID();

export const ANNOUNCEMENT_ACTOR: PersonRef = { employeeId: 'emp-siti', name: 'Siti Rahayu', nik: 'NIK-0002' };

const COMPANY_FILES: CompanyFile[] = [
  { documentId: 'doc-sk-libur-2027', name: 'SK Libur Idulfitri 2027.pdf', sizeBytes: 482_113, mimeType: 'application/pdf' },
  { documentId: 'doc-kebijakan-wfh', name: 'Kebijakan Kerja dari Rumah v2.pdf', sizeBytes: 1_204_551, mimeType: 'application/pdf' },
  { documentId: 'doc-agenda-townhall', name: 'Agenda Town Hall Q3.pdf', sizeBytes: 215_902, mimeType: 'application/pdf' },
  { documentId: 'doc-prosedur-klaim', name: 'Prosedur Klaim Reimbursement 2026.docx', sizeBytes: 96_340, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  { documentId: 'doc-denah-kantor', name: 'Denah Kantor Pusat.png', sizeBytes: 2_310_004, mimeType: 'image/png' },
];

interface StoredAttachment extends AnnouncementAttachment {
  deletedAt: string | null;
}

interface StoredAnnouncement extends Omit<AnnouncementDetail, 'attachments' | 'lastPublishedAt'> {
  attachments: StoredAttachment[];
}

const SITI = ANNOUNCEMENT_ACTOR;
const RINA: PersonRef = { employeeId: 'emp-rina', name: 'Rina Hartono', nik: 'NIK-0007' };

function seed(): StoredAnnouncement[] {
  return [
    {
      id: 'ann-libur-2027',
      title: 'Libur Idulfitri 2027',
      content: textToHtml(
        'Kantor libur mulai 8 sampai 12 Maret 2027.\n\nLayanan operasional kembali normal pada 15 Maret 2027. Rincian cuti bersama ada di SK terlampir.',
      ),
      category: 'HOLIDAY',
      recipientRole: 'ROLE_EMPLOYEE',
      status: 'PUBLISHED',
      createdBy: SITI,
      createdAt: '2026-09-12T08:10:00+07:00',
      attachments: [
        { attachmentId: 'att-1', documentId: 'doc-sk-libur-2027', createdBy: SITI, createdAt: '2026-09-12T08:20:00+07:00', deletedAt: null },
      ],
      publishLog: [
        { publishedAt: '2026-09-12T09:00:00+07:00', recipientRole: 'ROLE_EMPLOYEE', publishedBy: SITI, contentHash: '9f2c1a7d5e0b4c3a8d6f1e2b7c9a0d4e5f6a1b2c3d4e5f60718293a4b5c6d7e8' },
      ],
    },
    {
      id: 'ann-townhall-q3',
      title: 'Town Hall Kuartal III',
      content: textToHtml('Town hall kuartal III diadakan Jumat, 26 September 2026 pukul 14.00 di Aula Lantai 5 dan disiarkan daring.'),
      category: 'EVENT',
      recipientRole: 'ROLE_EMPLOYEE',
      status: 'PUBLISHED',
      createdBy: RINA,
      createdAt: '2026-09-04T13:00:00+07:00',
      attachments: [
        { attachmentId: 'att-2', documentId: 'doc-agenda-townhall', createdBy: RINA, createdAt: '2026-09-04T13:05:00+07:00', deletedAt: null },
      ],
      publishLog: [
        { publishedAt: '2026-09-05T08:30:00+07:00', recipientRole: 'ROLE_EMPLOYEE', publishedBy: SITI, contentHash: '3b8e0f6a2c1d9e7b5a4f3c2d1e0b9a8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f21' },
      ],
    },
    {
      id: 'ann-prosedur-klaim',
      title: 'Pembaruan Prosedur Klaim Reimbursement',
      content: textToHtml('Mulai Oktober 2026, klaim reimbursement wajib melampirkan nota asli yang dipindai berwarna.'),
      category: 'GENERAL',
      recipientRole: 'ROLE_FINANCE_OFFICER',
      status: 'PUBLISHED',
      createdBy: SITI,
      createdAt: '2026-08-27T10:00:00+07:00',
      attachments: [],
      publishLog: [
        { publishedAt: '2026-08-28T09:15:00+07:00', recipientRole: 'ROLE_FINANCE_OFFICER', publishedBy: SITI, contentHash: 'c41d8e2f7a0b3c6d9e1f4a7b0c3d6e9f2a5b8c1d4e7f0a3b6c9d2e5f8a1b4c7d' },
      ],
    },
    {
      id: 'ann-kebijakan-wfh',
      title: 'Kebijakan Kerja dari Rumah',
      content: textToHtml('Rancangan kebijakan kerja dari rumah untuk fungsi non-operasional, berlaku mulai November 2026.'),
      category: 'POLICY',
      recipientRole: null,
      status: 'DRAFT',
      createdBy: SITI,
      createdAt: '2026-09-18T10:00:00+07:00',
      attachments: [],
      publishLog: [],
    },
    {
      id: 'ann-evaluasi-tengah-tahun',
      title: 'Evaluasi Kinerja Tengah Tahun',
      content: textToHtml('Batas pengisian evaluasi kinerja tengah tahun untuk seluruh bawahan langsung adalah 10 Oktober 2026.'),
      category: 'GENERAL',
      recipientRole: 'ROLE_DEPT_MANAGER',
      status: 'DRAFT',
      createdBy: RINA,
      createdAt: '2026-09-20T15:30:00+07:00',
      attachments: [],
      publishLog: [],
    },
  ];
}

let store: StoredAnnouncement[] = seed();

export function resetAnnouncementMocks() {
  store = seed();
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(`${status} — ${message}`);
  }
}

const TITLE_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} .,'&()/:-]*$/u;
const FROZEN_FIELDS = ['title', 'content', 'category', 'recipientRole'] as const;

function validateDraft(draft: Partial<AnnouncementDraft>) {
  if (draft.title !== undefined) {
    const title = draft.title.trim();
    if (!title || title.length > 200 || !TITLE_PATTERN.test(title)) {
      throw new HttpError(422, 'Judul wajib diisi, maksimal 200 karakter, tanpa karakter markup.');
    }
  }
  if (draft.content !== undefined && !draft.content.trim()) throw new HttpError(422, 'Isi pengumuman wajib diisi.');
  if (draft.content !== undefined && /<(script|iframe|img|link|style)\b|<[^>]*\s(src|href)=/i.test(draft.content)) {
    throw new HttpError(422, 'Isi memuat unsur atau sumber daya luar yang tidak diizinkan.');
  }
  if (draft.category !== undefined && !CATEGORY_OPTIONS.some((option) => option.value === draft.category)) {
    throw new HttpError(422, 'Kategori harus Policy, Holiday, Event, atau General.');
  }
  if (draft.recipientRole && !RECIPIENT_ROLE_OPTIONS.some((option) => option.value === draft.recipientRole)) {
    throw new HttpError(422, 'Peran penerima tidak dikenal.');
  }
}

function find(id: string): StoredAnnouncement {
  const found = store.find((row) => row.id === id);
  if (!found) throw new HttpError(404, 'Pengumuman tidak ditemukan.');
  return found;
}

function toRow(row: StoredAnnouncement): AnnouncementRow {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    recipientRole: row.recipientRole,
    status: row.status,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    lastPublishedAt: row.publishLog.at(-1)?.publishedAt ?? null,
  };
}

function toDetail(row: StoredAnnouncement): AnnouncementDetail {
  return {
    ...toRow(row),
    content: row.content,
    publishLog: row.publishLog.map((entry) => ({ ...entry })),
    attachments: row.attachments
      .filter((item) => !item.deletedAt)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((item) => ({
        attachmentId: item.attachmentId,
        documentId: item.documentId,
        createdBy: item.createdBy,
        createdAt: item.createdAt,
      })),
  };
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

type RawPerson = { employee_id: string; nama: string; nik: string };
type RawRow = {
  announcement_id: string;
  title: string;
  category: AnnouncementRow['category'];
  recipient_role: string | null;
  status: AnnouncementRow['status'];
  created_by: RawPerson;
  created_at: string;
  last_published_at: string | null;
};
type RawDetail = RawRow & {
  content: string;
  attachments: { attachment_id: string; document_id: string; created_by: RawPerson; created_at: string }[];
  publish_log: { published_at: string; recipient_role: string; published_by: RawPerson }[];
};

const person = (raw: RawPerson): PersonRef => ({ employeeId: raw.employee_id, name: raw.nama, nik: raw.nik });

const fromRawRow = (raw: RawRow): AnnouncementRow => ({
  id: raw.announcement_id,
  title: raw.title,
  category: raw.category,
  recipientRole: raw.recipient_role,
  status: raw.status,
  createdBy: person(raw.created_by),
  createdAt: raw.created_at,
  lastPublishedAt: raw.last_published_at,
});

const fromRawDetail = (raw: RawDetail): AnnouncementDetail => ({
  ...fromRawRow({ ...raw, last_published_at: raw.publish_log.at(-1)?.published_at ?? null }),
  content: raw.content,
  attachments: raw.attachments.map((item) => ({
    attachmentId: item.attachment_id,
    documentId: item.document_id,
    createdBy: person(item.created_by),
    createdAt: item.created_at,
  })),
  publishLog: raw.publish_log.map((entry) => ({
    publishedAt: entry.published_at,
    recipientRole: entry.recipient_role,
    publishedBy: person(entry.published_by),
    contentHash: '',
  })),
});

const toBody = (draft: Partial<AnnouncementDraft>) => ({
  title: draft.title,
  content: draft.content,
  category: draft.category || undefined,
  recipient_role: draft.recipientRole === undefined ? undefined : draft.recipientRole || null,
});

export const announcementService = {
  async search(filter: AnnouncementFilter): Promise<{ rows: AnnouncementRow[]; totalData: number }> {
    if (MOCK) {
      await delay();
      const keyword = filter.keyword?.trim().toLowerCase();
      const rows = store
        .filter((row) => !filter.status || row.status === filter.status)
        .filter((row) => !filter.category || row.category === filter.category)
        .filter((row) => !keyword || row.title.toLowerCase().includes(keyword))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(toRow);
      const start = (filter.page - 1) * filter.size;
      return { rows: rows.slice(start, start + filter.size), totalData: rows.length };
    }
    const { data } = await api.post<{ data: RawRow[]; total_data: number }>('/announcements/search', {
      filters: { status: filter.status ? [filter.status] : undefined, category: filter.category, keyword: filter.keyword },
      page: filter.page,
      size: filter.size,
      sort_by: 'created_at',
      sort_direction: 'DESC',
    });
    return { rows: data.data.map(fromRawRow), totalData: data.total_data };
  },

  async get(id: string): Promise<AnnouncementDetail> {
    if (MOCK) {
      await delay(200);
      return toDetail(find(id));
    }
    const { data } = await api.get<RawDetail>(`/announcements/${id}`);
    return fromRawDetail(data);
  },

  /** `POST /announcements` → 201, status diset server `DRAFT`. */
  async create(draft: AnnouncementDraft): Promise<AnnouncementDetail> {
    if (MOCK) {
      await delay();
      validateDraft(draft);
      const row: StoredAnnouncement = {
        id: newId(),
        title: draft.title.trim(),
        content: draft.content,
        category: draft.category as AnnouncementRow['category'],
        recipientRole: draft.recipientRole || null,
        status: 'DRAFT',
        createdBy: ANNOUNCEMENT_ACTOR,
        createdAt: new Date().toISOString(),
        attachments: [],
        publishLog: [],
      };
      store = [row, ...store];
      return toDetail(row);
    }
    const { data } = await api.post<RawDetail>('/announcements', toBody(draft));
    return fromRawDetail({ ...data, attachments: [], publish_log: [] });
  },

  /** `PUT /announcements/{id}` — subset field; sesudah terbit keempat medan beku → 422. */
  async update(id: string, patch: Partial<AnnouncementDraft>): Promise<void> {
    if (MOCK) {
      await delay();
      const row = find(id);
      if (row.status === 'PUBLISHED') {
        const touched = FROZEN_FIELDS.filter((field) => patch[field] !== undefined);
        if (touched.length) throw new HttpError(422, `Pengumuman sudah terbit, medan ini beku: ${touched.join(', ')}.`);
      }
      validateDraft(patch);
      Object.assign(row, {
        ...(patch.title !== undefined && { title: patch.title.trim() }),
        ...(patch.content !== undefined && { content: patch.content }),
        ...(patch.category !== undefined && { category: patch.category }),
        ...(patch.recipientRole !== undefined && { recipientRole: patch.recipientRole || null }),
      });
      return;
    }
    await api.put(`/announcements/${id}`, toBody(patch));
  },

  /** `POST /announcements/{id}/publish` — peran penerima wajib, satu arah, jejak terbit + sidik isi. */
  async publish(id: string): Promise<void> {
    if (MOCK) {
      await delay();
      const row = find(id);
      if (!row.recipientRole) throw new HttpError(422, 'Peran penerima wajib diisi sebelum terbit.');
      if (row.status === 'PUBLISHED') throw new HttpError(422, 'Pengumuman sudah terbit dan tidak dapat diterbitkan ulang.');
      const contentHash = await sha256(`${row.title}${row.content}${row.category}${row.recipientRole}`);
      row.status = 'PUBLISHED';
      row.publishLog = [
        ...row.publishLog,
        { publishedAt: new Date().toISOString(), recipientRole: row.recipientRole, publishedBy: ANNOUNCEMENT_ACTOR, contentHash },
      ];
      return;
    }
    await api.post(`/announcements/${id}/publish`);
  },

  /** Menautkan berkas Company Files — tidak diblokir status terbit. */
  async attach(id: string, documentId: string): Promise<void> {
    if (MOCK) {
      await delay();
      const row = find(id);
      if (!COMPANY_FILES.some((file) => file.documentId === documentId)) {
        throw new HttpError(422, 'Berkas tidak ditemukan di Company Files.');
      }
      if (row.attachments.some((item) => item.documentId === documentId && !item.deletedAt)) {
        throw new HttpError(409, 'Berkas ini sudah tertaut ke pengumuman.');
      }
      row.attachments = [
        ...row.attachments,
        { attachmentId: newId(), documentId, createdBy: ANNOUNCEMENT_ACTOR, createdAt: new Date().toISOString(), deletedAt: null },
      ];
      return;
    }
    await api.post(`/announcements/${id}/attachments`, { document_id: documentId });
  },

  async detach(id: string, attachmentId: string): Promise<void> {
    if (MOCK) {
      await delay();
      const item = find(id).attachments.find((row) => row.attachmentId === attachmentId && !row.deletedAt);
      if (!item) throw new HttpError(404, 'Lampiran tidak ditemukan.');
      item.deletedAt = new Date().toISOString();
      return;
    }
    await api.delete(`/announcements/${id}/attachments/${attachmentId}`);
  },

  /** Direktori Company Files (document-service) — sumber picker dan metadata lampiran. */
  async companyFiles(): Promise<CompanyFile[]> {
    if (MOCK) {
      await delay(150);
      return COMPANY_FILES.map((file) => ({ ...file }));
    }
    // UIC-001-DOCUMENT §2.1 — Company Files = owner_type PERUSAHAAN; metadata dari versi aktif.
    const { data } = await api.post<{
      data: { document_id: string; active_version: { original_filename: string; size_bytes: number; detected_mime: string } }[];
    }>('/documents/search', { owner_type: 'PERUSAHAAN', page: 1, size: 100 });
    return data.data.map((raw) => ({
      documentId: raw.document_id,
      name: raw.active_version.original_filename,
      sizeBytes: raw.active_version.size_bytes,
      mimeType: raw.active_version.detected_mime,
    }));
  },

  /** `GET /company/my-announcements` — subjek dari peran token; kosong = sah. */
  async myList(role: string): Promise<MyAnnouncementRow[]> {
    if (MOCK) {
      await delay();
      return store
        .filter((row) => row.status === 'PUBLISHED' && row.recipientRole === role)
        .map((row) => ({ id: row.id, title: row.title, publishedAt: row.publishLog.at(-1)!.publishedAt }))
        .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    }
    const { data } = await api.get<{ data: { announcement_id: string; title: string; published_at: string }[] }>(
      '/company/my-announcements',
    );
    return data.data.map((raw) => ({ id: raw.announcement_id, title: raw.title, publishedAt: raw.published_at }));
  },

  /** Salah sasaran atau masih rancangan → 404, bukan 403 (anti-enumerasi). */
  async myGet(role: string, id: string): Promise<MyAnnouncementDetail> {
    if (MOCK) {
      await delay(200);
      const row = store.find((item) => item.id === id && item.status === 'PUBLISHED' && item.recipientRole === role);
      if (!row) throw new HttpError(404, 'Pengumuman tidak ditemukan.');
      return {
        title: row.title,
        content: row.content,
        publishedAt: row.publishLog.at(-1)!.publishedAt,
        attachments: toDetail(row).attachments.map((item) => ({ documentId: item.documentId })),
      };
    }
    const { data } = await api.get<{ title: string; content: string; published_at: string; attachments: { document_id: string }[] }>(
      `/company/my-announcements/${id}`,
    );
    return {
      title: data.title,
      content: data.content,
      publishedAt: data.published_at,
      attachments: data.attachments.map((item) => ({ documentId: item.document_id })),
    };
  },
};
