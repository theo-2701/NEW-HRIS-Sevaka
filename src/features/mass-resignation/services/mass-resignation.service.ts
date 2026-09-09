import { api } from '@/services/api';
import { BLAST_THRESHOLD, CURRENT_USER } from '@/features/mass-resignation/types';
import type { BatchDraft, MassBatch, PoolEmployee } from '@/features/mass-resignation/types';

/**
 * API service Mass Resignation.
 *
 * Endpoint kontrak (FSD §7 · UIC §6):
 *   GET  /mass-resignations                  — MR-DASH
 *   POST /mass-resignations                  — MR-CREATE (draft)
 *   POST /mass-resignations/dry-run          — pratinjau blast-radius
 *   POST /mass-resignations/{id}/submit
 *   POST /mass-resignations/{id}/approve     — membekukan selection_hash
 *   POST /mass-resignations/{id}/reject
 *   POST /mass-resignations/{id}/process     — kirim hash beku; mismatch → 409
 *   POST /mass-resignations/{id}/halt        — circuit-breaker (correlation id)
 *   POST /mass-resignations/{id}/resume
 *   POST /mass-resignations/{id}/cancel-remaining
 *
 * Aturan kontrak yang ditegakkan di jalur MOCK:
 *  • SoD + rank-guard — maker tidak boleh jadi checker atas batch-nya sendiri.
 *  • Anti-TOCTOU — hash yang dikirim saat process harus sama persis dengan yang
 *    dibekukan saat approve; kalau tidak, 409 dan batch tetap APPROVED.
 *  • Larangan self-resign — baris diri sendiri dikunci di kolam seleksi.
 */
const MOCK = !import.meta.env.VITE_API_BASE_URL;
const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

/** Interval spawn offboarding yang di-throttle (mock). */
const THROTTLE_MS = 1200;

function fakeHash(): string {
  const chars = 'abcdef0123456789';
  let value = 'sha256:';
  for (let i = 0; i < 24; i += 1) value += chars[Math.floor(Math.random() * chars.length)];
  return value;
}

function correlationId(): string {
  return `corr-${Math.random().toString(16).slice(2, 8)}`;
}

const pool: PoolEmployee[] = [
  { id: 'emp-agus', name: 'Agus Salim', unit: 'BR-Jakarta', position: 'Ops Staff' },
  { id: 'emp-bunga', name: 'Bunga Citra', unit: 'BR-Jakarta', position: 'Ops Staff' },
  { id: 'emp-candra', name: 'Candra Wijaya', unit: 'BR-Surabaya', position: 'Sales Rep' },
  { id: 'emp-tony', name: CURRENT_USER, unit: 'HQ', position: 'Administrator', self: true },
  { id: 'emp-dewi', name: 'Dewi Lestari', unit: 'BR-Bandung', position: 'CS Agent' },
  { id: 'emp-eko', name: 'Eko Prasetyo', unit: 'BR-Bandung', position: 'CS Agent' },
  { id: 'emp-fitri', name: 'Fitri Handayani', unit: 'HQ', position: 'Analyst' },
  { id: 'emp-gilang', name: 'Gilang Ramadhan', unit: 'BR-Surabaya', position: 'Sales Rep' },
  { id: 'emp-hana', name: 'Hana Pertiwi', unit: 'BR-Jakarta', position: 'Warehouse' },
  { id: 'emp-indra', name: 'Indra Kusuma', unit: 'BR-Jakarta', position: 'Warehouse' },
];

let mockRows: MassBatch[] = [
  { id: 'MR-0042', reason: 'LAYOFF', leaveDate: '2026-08-15', total: 12, progress: 8, status: 'PROCESSING', maker: 'Rina Hartono', selectionHash: fakeHash(), correlationId: 'corr-9f2a11' },
  { id: 'MR-0041', reason: 'LAYOFF', leaveDate: '2026-08-01', total: 9, progress: 4, status: 'HALTED', maker: 'Dewi Anggraini', selectionHash: fakeHash(), correlationId: 'corr-7b3c02', haltReason: 'Menunggu konfirmasi serikat pekerja' },
  { id: 'MR-0040', reason: 'CONTRACT_END', leaveDate: '2026-07-31', total: 6, progress: 0, status: 'APPROVED', maker: 'Rina Hartono', selectionHash: fakeHash() },
  { id: 'MR-0039', reason: 'RETIREMENT', leaveDate: '2026-07-20', total: 4, progress: 0, status: 'IN_APPROVAL', maker: 'Bagus Pratama' },
  { id: 'MR-0038', reason: 'LAYOFF', leaveDate: '2026-06-30', total: 10, progress: 10, status: 'PROCESSED', maker: 'Rina Hartono', selectionHash: fakeHash(), correlationId: 'corr-4a1d88' },
  { id: 'MR-0037', reason: 'TERMINATION', leaveDate: '2026-06-10', total: 5, progress: 3, status: 'PARTIAL', maker: 'Dewi Anggraini', selectionHash: fakeHash(), correlationId: 'corr-2e9f45' },
];

/** Timer throttle per batch (mock) supaya HALT benar-benar menghentikan spawn. */
const timers = new Map<string, ReturnType<typeof setInterval>>();

function find(id: string): MassBatch {
  const row = mockRows.find((item) => item.id === id);
  if (!row) throw new Error('Batch tidak ditemukan.');
  return row;
}

/** SoD + rank-guard (FSD §7.2): checker harus berbeda dari maker. */
function assertChecker(row: MassBatch) {
  if (row.maker === CURRENT_USER) {
    throw new Error('409 — maker tidak boleh menjadi checker atas batch-nya sendiri (SoD).');
  }
}

function startThrottle(row: MassBatch) {
  stopThrottle(row.id);
  const timer = setInterval(() => {
    const current = mockRows.find((item) => item.id === row.id);
    if (!current || current.status !== 'PROCESSING') {
      stopThrottle(row.id);
      return;
    }
    current.progress += 1;
    if (current.progress >= current.total) {
      current.progress = current.total;
      current.status = 'PROCESSED';
      stopThrottle(row.id);
    }
  }, THROTTLE_MS);
  timers.set(row.id, timer);
}

function stopThrottle(id: string) {
  const timer = timers.get(id);
  if (timer) {
    clearInterval(timer);
    timers.delete(id);
  }
}

// Batch yang sudah berjalan sejak awal tetap bergerak, seperti di prototype.
if (MOCK) mockRows.filter((row) => row.status === 'PROCESSING').forEach(startThrottle);

export const massResignationService = {
  async list(): Promise<MassBatch[]> {
    if (MOCK) {
      await delay(200);
      return mockRows.map((row) => ({ ...row }));
    }
    const { data } = await api.get<{ rows: MassBatch[] }>('/mass-resignations');
    return data.rows;
  },

  async pool(): Promise<PoolEmployee[]> {
    if (MOCK) {
      await delay(200);
      return pool.map((row) => ({ ...row }));
    }
    const { data } = await api.get<{ rows: PoolEmployee[] }>('/mass-resignations/pool');
    return data.rows;
  },

  /**
   * Dry-run blast-radius. Baris diri sendiri tidak pernah ikut terhitung —
   * self-resign dilarang di level kontrak, bukan sekadar UI.
   */
  async dryRun(employeeIds: string[]): Promise<{ impacted: number; overThreshold: boolean }> {
    if (MOCK) {
      await delay(400);
      const impacted = employeeIds.filter((id) => !pool.find((row) => row.id === id)?.self).length;
      return { impacted, overThreshold: impacted > BLAST_THRESHOLD };
    }
    const { data } = await api.post<{ impacted: number; overThreshold: boolean }>(
      '/mass-resignations/dry-run',
      { employeeIds },
    );
    return data;
  },

  async createDraft(draft: BatchDraft): Promise<MassBatch> {
    if (MOCK) {
      await delay();
      const row: MassBatch = {
        id: `MR-00${43 + mockRows.length}`,
        reason: draft.reason,
        leaveDate: draft.leaveDate,
        total: draft.employeeIds.filter((id) => !pool.find((item) => item.id === id)?.self).length,
        progress: 0,
        status: 'DRAFT',
        maker: CURRENT_USER,
        notes: draft.notes,
      };
      mockRows = [row, ...mockRows];
      return row;
    }
    const { data } = await api.post<MassBatch>('/mass-resignations', draft);
    return data;
  },

  async submit(id: string): Promise<void> {
    if (MOCK) {
      await delay(200);
      find(id).status = 'IN_APPROVAL';
      return;
    }
    await api.post(`/mass-resignations/${id}/submit`);
  },

  /** Approve membekukan seleksi sebagai hash (anti-TOCTOU). */
  async approve(id: string, note: string): Promise<string> {
    if (MOCK) {
      await delay();
      const row = find(id);
      assertChecker(row);
      row.status = 'APPROVED';
      row.selectionHash = fakeHash();
      row.approverNote = note;
      return row.selectionHash;
    }
    const { data } = await api.post<{ selectionHash: string }>(`/mass-resignations/${id}/approve`, { note });
    return data.selectionHash;
  },

  async reject(id: string, note: string): Promise<void> {
    if (MOCK) {
      await delay();
      const row = find(id);
      assertChecker(row);
      row.status = 'CANCELLED';
      row.approverNote = note;
      return;
    }
    await api.post(`/mass-resignations/${id}/reject`, { note });
  },

  /**
   * Kirim hash beku untuk memulai offboarding ter-throttle. Hash yang tidak
   * cocok ditolak 409 dan batch tetap APPROVED — tidak ada yang dilahirkan.
   */
  async process(id: string, selectionHash: string): Promise<string> {
    if (MOCK) {
      await delay();
      const row = find(id);
      if (!row.selectionHash || row.selectionHash !== selectionHash) {
        throw new Error('409 Conflict — selection hash tidak cocok. Batch tetap APPROVED, tidak ada yang diproses.');
      }
      row.status = 'PROCESSING';
      row.progress = 0;
      row.correlationId = correlationId();
      startThrottle(row);
      return row.correlationId;
    }
    const { data } = await api.post<{ correlationId: string }>(`/mass-resignations/${id}/process`, {
      selectionHash,
    });
    return data.correlationId;
  },

  /** Circuit-breaker: menangguhkan instance yang sedang jalan per correlation id. */
  async halt(id: string, reason: string): Promise<void> {
    if (MOCK) {
      await delay(200);
      const row = find(id);
      assertChecker(row);
      row.status = 'HALTED';
      row.haltReason = reason;
      stopThrottle(id);
      return;
    }
    await api.post(`/mass-resignations/${id}/halt`, { reason });
  },

  async resume(id: string, note: string): Promise<void> {
    if (MOCK) {
      await delay(200);
      const row = find(id);
      assertChecker(row);
      row.status = 'PROCESSING';
      row.approverNote = note;
      startThrottle(row);
      return;
    }
    await api.post(`/mass-resignations/${id}/resume`, { note });
  },

  /** Sisa karyawan dibatalkan; yang sudah selesai tetap terminal → PARTIAL. */
  async cancelRemaining(id: string, note: string): Promise<void> {
    if (MOCK) {
      await delay(200);
      const row = find(id);
      assertChecker(row);
      row.status = 'PARTIAL';
      row.approverNote = note;
      stopThrottle(id);
      return;
    }
    await api.post(`/mass-resignations/${id}/cancel-remaining`, { note });
  },
};

/** Dipakai pengujian untuk membersihkan timer throttle. */
export function stopAllThrottles() {
  timers.forEach((timer) => clearInterval(timer));
  timers.clear();
}
