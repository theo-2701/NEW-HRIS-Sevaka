import { api, ApiError } from '@/services/api';
import { MOCK } from '@/services/mock';
import {
  ANONYMIZED_SUBJECT_ID,
  ERASURE_SEED,
  ERASURE_SERVICES,
  ERASURE_SUBJECTS,
  SETTINGS_VIEWERS,
} from '@/features/settings/mock-data';
import type { ErasureSeed } from '@/features/settings/mock-data';
import { canManageErasure, erasureStatus, summarizeProgress, validateErasureDraft } from '@/features/settings/rules';
import type {
  ErasureDetail,
  ErasureDraft,
  ErasureProgress,
  ErasureRow,
  ErasureSearch,
  ErasureSubject,
  Paged,
  SettingsActor,
} from '@/features/settings/types';

/**
 * API service Permintaan Penghapusan Data — UIC-001-SETTINGS-0.12 §4 (rezim retensi `CD-047`).
 *
 *   A5  POST /settings/erasure-requests         — catat satu permintaan; 14 baris pelacak lahir bersamaan
 *   A6  POST /settings/erasure-requests/search  — daftar + ringkasan angka ketuntasan (badan NESTED)
 *   A7  GET  /settings/erasure-requests/{id}     — detail + pelacak per service penitip
 *
 * Nol tombol "tandai selesai": kenaikan status murni pekerjaan mesin (`A8`, tak-berlayar).
 */
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

let requests: ErasureSeed[] = [];
let seq = 0;

export function resetErasureMocks() {
  requests = ERASURE_SEED.map((row) => ({ ...row, progress: row.progress.map((item) => ({ ...item })) }));
  seq = requests.length;
}
resetErasureMocks();

/** Nama/NIK subjek ditukar dari authz saat respons disusun — nol snapshot; subjek tersamarkan = ANONYMIZED. */
function subjectOf(employeeId: string): { nama: string | null; nik: string | null } {
  if (employeeId === ANONYMIZED_SUBJECT_ID) return { nama: 'ANONYMIZED', nik: 'ANONYMIZED' };
  const subject = ERASURE_SUBJECTS.find((row) => row.employeeId === employeeId);
  return subject ? { nama: subject.nama, nik: subject.nik } : { nama: null, nik: null };
}

function recorderOf(employeeId: string) {
  const person = SETTINGS_VIEWERS.find((row) => row.id === employeeId);
  return { nama: person?.nama ?? employeeId, nik: person?.nik ?? '-' };
}

function toDetail(seed: ErasureSeed): ErasureDetail {
  const status = erasureStatus(seed.progress);
  const completedAt =
    status === 'COMPLETED'
      ? (seed.progress
          .map((row) => row.completedAt ?? '')
          .sort()
          .at(-1) ?? null)
      : null;
  return {
    id: seed.id,
    employeeId: seed.employeeId,
    ...subjectOf(seed.employeeId),
    requestStatus: status,
    requestedAt: seed.requestedAt,
    requestedAtTimezone: seed.requestedAtTimezone,
    completedAt,
    createdAt: seed.createdAt,
    createdBy: recorderOf(seed.createdByEmployeeId),
    progress: seed.progress.map((row) => ({ ...row })),
  };
}

const toRow = (seed: ErasureSeed): ErasureRow => {
  const { progress, ...detail } = toDetail(seed);
  return { ...detail, ...summarizeProgress(progress) };
};

const guard = (actor: SettingsActor) => {
  if (!canManageErasure(actor.role))
    throw new ApiError(
      'Hanya HR Manager dan Super Admin yang dapat membuka permintaan penghapusan data.',
      403,
      'FORBIDDEN',
    );
};

type RawProgress = {
  service_code: string;
  progress_status: ErasureProgress['progressStatus'];
  broadcast_count: number;
  last_broadcast_at: string | null;
  completed_at?: string | null;
};
type RawRequest = {
  id: string;
  employee_id: string;
  nama?: string | null;
  nik?: string | null;
  request_status: ErasureRow['requestStatus'];
  requested_at: string;
  requested_at_timezone: string;
  completed_at: string | null;
  created_at?: string;
  created_by?: { nama: string; nik: string };
  total_service?: number;
  completed_service?: number;
  held_service?: number;
  progress?: RawProgress[];
};

const fromRawProgress = (raw: RawProgress): ErasureProgress => ({
  serviceCode: raw.service_code,
  progressStatus: raw.progress_status,
  broadcastCount: raw.broadcast_count,
  lastBroadcastAt: raw.last_broadcast_at,
  completedAt: raw.completed_at ?? null,
});

const fromRawDetail = (raw: RawRequest): ErasureDetail => ({
  id: raw.id,
  employeeId: raw.employee_id,
  nama: raw.nama ?? null,
  nik: raw.nik ?? null,
  requestStatus: raw.request_status,
  requestedAt: raw.requested_at,
  requestedAtTimezone: raw.requested_at_timezone,
  completedAt: raw.completed_at,
  createdAt: raw.created_at ?? '',
  createdBy: raw.created_by ?? { nama: '', nik: '' },
  progress: (raw.progress ?? []).map(fromRawProgress),
});

export const erasureService = {
  /** PICKER subjek — `POST /employee/employees/search`, penyaring `employment_status IN` (mantan ikut). */
  async subjects(): Promise<ErasureSubject[]> {
    if (MOCK) {
      await delay(120);
      return ERASURE_SUBJECTS.map((row) => ({ ...row }));
    }
    const { data } = await api.post<{
      data: { id: string; nama: string; nik: string; employment_status: ErasureSubject['employmentStatus'] }[];
    }>('/employee/employees/search', {
      filters: { employment_status: ['ACTIVE', 'RESIGNED', 'TERMINATED'] },
      page: 1,
      size: 100,
    });
    return data.data.map((raw) => ({
      employeeId: raw.id,
      nama: raw.nama,
      nik: raw.nik,
      employmentStatus: raw.employment_status,
    }));
  },

  /** `A6` — ringkasan angka per permintaan; grid kosong = 200 sah. Urut `requested_at DESC`. */
  async search(actor: SettingsActor, search: ErasureSearch): Promise<Paged<ErasureRow>> {
    const page = search.page ?? 1;
    const size = search.size ?? 20;
    if (MOCK) {
      await delay();
      guard(actor);
      const day = (iso: string) => iso.slice(0, 10);
      const rows = requests
        .map(toRow)
        .filter((row) => !search.requestStatus || row.requestStatus === search.requestStatus)
        .filter((row) => !search.requestedAtFrom || day(row.requestedAt) >= search.requestedAtFrom)
        .filter((row) => !search.requestedAtTo || day(row.requestedAt) <= search.requestedAtTo)
        .filter((row) => !search.employeeId || row.employeeId === search.employeeId)
        .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
      return {
        data: rows.slice((page - 1) * size, page * size),
        totalData: rows.length,
        totalPage: Math.ceil(rows.length / size),
        currentPage: page,
        size,
      };
    }
    const { data } = await api.post<{
      data: RawRequest[];
      total_data: number;
      total_page: number;
      current_page: number;
      size: number;
    }>('/settings/erasure-requests/search', {
      filters: {
        request_status: search.requestStatus,
        requested_at_from: search.requestedAtFrom,
        requested_at_to: search.requestedAtTo,
        employee_id: search.employeeId,
      },
      page,
      size,
    });
    return {
      data: data.data.map((raw) => {
        const { progress: _progress, ...detail } = fromRawDetail(raw);
        void _progress;
        return {
          ...detail,
          totalService: raw.total_service ?? 0,
          completedService: raw.completed_service ?? 0,
          heldService: raw.held_service ?? 0,
        };
      }),
      totalData: data.total_data,
      totalPage: data.total_page,
      currentPage: data.current_page,
      size: data.size,
    };
  },

  /** `A7` — id tak ada DAN id di luar cakupan dijawab satu kode 404 (cegah bocor keberadaan). */
  async detail(actor: SettingsActor, id: string): Promise<ErasureDetail> {
    if (MOCK) {
      await delay(180);
      guard(actor);
      const seed = requests.find((row) => row.id === id);
      if (!seed) throw new ApiError('Permintaan penghapusan tidak ditemukan.', 404, 'NOT_FOUND');
      return toDetail(seed);
    }
    const { data } = await api.get<RawRequest>(`/settings/erasure-requests/${id}`);
    return fromRawDetail(data);
  },

  /**
   * `A5` — satu transaksi: satu baris permintaan + 14 baris pelacak `PENDING`/`broadcast_count=0`. Nol siaran
   * seketika. Subjek yang masih punya permintaan belum tuntas → 409 (larangan parsial).
   */
  async create(actor: SettingsActor, draft: ErasureDraft): Promise<ErasureDetail> {
    if (MOCK) {
      await delay(350);
      guard(actor);
      const errors = validateErasureDraft(draft);
      if (Object.keys(errors).length) {
        throw new ApiError(
          Object.values(errors)[0],
          422,
          'VALIDATION_ERROR',
          Object.fromEntries(Object.entries(errors).map(([field, message]) => [field, [message]])),
        );
      }
      const openRequest = requests.find(
        (row) => row.employeeId === draft.employeeId && erasureStatus(row.progress) !== 'COMPLETED',
      );
      if (openRequest) {
        throw new ApiError(
          'Subjek ini masih memiliki permintaan penghapusan yang belum tuntas.',
          409,
          'ERASURE_REQUEST_ALREADY_OPEN',
        );
      }
      seq += 1;
      const seed: ErasureSeed = {
        id: `e5f6a7b8-${String(seq).padStart(4, '0')}-4a10-9c00-${String(seq).padStart(12, '0')}`,
        employeeId: draft.employeeId,
        requestedAt: `${draft.requestedAt.slice(0, 10)}T00:00:00+07:00`,
        requestedAtTimezone: draft.requestedAtTimezone,
        createdAt: new Date().toISOString(),
        createdByEmployeeId: actor.id,
        progress: ERASURE_SERVICES.map((serviceCode) => ({
          serviceCode,
          progressStatus: 'PENDING',
          broadcastCount: 0,
          lastBroadcastAt: null,
          completedAt: null,
        })),
      };
      requests.unshift(seed);
      return toDetail(seed);
    }
    const { data } = await api.post<RawRequest>('/settings/erasure-requests', {
      employee_id: draft.employeeId,
      requested_at: draft.requestedAt,
      requested_at_timezone: draft.requestedAtTimezone,
    });
    return fromRawDetail(data);
  },
};
