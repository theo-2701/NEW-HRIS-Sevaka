import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import { CURRENT_USER } from '@/features/manpower/types';
import type {
  ManpowerPlan,
  PlanDraft,
  Requisition,
  RequisitionDraft,
} from '@/features/manpower/types';

/**
 * API service Manpower & Requisition.
 *
 * Endpoint kontrak (FSD §3 · UIC §3):
 *   GET  /manpower-plans                       — MP-OVERVIEW
 *   POST /manpower-plans                       — MP-CREATE (draft)
 *   GET  /requisitions                         — daftar requisition
 *   POST /requisitions                         — REQ-CREATE (draft / submit)
 *   POST /requisitions/{id}/submit
 *   POST /requisitions/{id}/approve            — REQ-APPROVE (SoD)
 *   POST /requisitions/{id}/reject            — GAP: UIC §3.2 hanya memuat approve;
 *                                                status REJECTED ada di enum §6.7
 *
 * `PROB-FRONTEND-005`: kolom **Actual** dan **Gap** adalah hasil hitung
 * terhadap jumlah posisi hidup di company-service — employee-service tidak
 * menyimpan kolom kapasitas. Kontrak read agregatnya belum ditegaskan, jadi
 * angka aktual di jalur MOCK berasal dari data contoh dan ditandai di UI.
 */
const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

let mockRequisitions: Requisition[] = [
  {
    id: 'REQ-0231',
    title: 'Staff Finance',
    unitId: 'unit-fin-papua',
    parentPositionId: 'pos-fin-mgr',
    headcount: 2,
    status: 'IN_APPROVAL',
    maker: 'Rina Hartono',
    reason: 'Ekspansi wilayah Papua; dua staf finance untuk menutup ledger cabang baru.',
    planId: 'plan-2026',
  },
  {
    id: 'REQ-0230',
    title: 'Backend Engineer',
    unitId: 'unit-eng-hq',
    parentPositionId: 'pos-eng-mgr',
    headcount: 1,
    status: 'APPROVED',
    maker: 'Dewi Anggraini',
    reason: 'Backfill backend engineer yang mengundurkan diri.',
    planId: 'plan-2026',
  },
  {
    id: 'REQ-0229',
    title: 'HR Business Partner',
    unitId: 'unit-people-hq',
    parentPositionId: 'pos-head-people',
    headcount: 1,
    status: 'APPROVED',
    maker: 'Rina Hartono',
    reason: 'HRBP untuk headcount Jakarta yang bertambah.',
  },
  {
    id: 'REQ-0228',
    title: 'Sales Executive',
    unitId: 'unit-sales-sby',
    parentPositionId: 'pos-ops-lead',
    headcount: 3,
    status: 'FULFILLED',
    maker: 'Bagus Pratama',
    reason: 'Ramp-up penjualan Q1 — ketiga kursi sudah terisi.',
  },
  {
    id: 'REQ-0227',
    title: 'Warehouse Coordinator',
    unitId: 'unit-ops-jkt',
    parentPositionId: 'pos-ops-lead',
    headcount: 1,
    status: 'DRAFT',
    maker: CURRENT_USER,
    reason: 'Koordinator gudang — justifikasi masih menunggu tanda tangan.',
  },
  {
    id: 'REQ-0226',
    title: 'Staff Finance',
    unitId: 'unit-fin-papua',
    parentPositionId: 'pos-fin-mgr',
    headcount: 1,
    status: 'REJECTED',
    maker: 'Bagus Pratama',
    reason: 'Duplikat REQ-0231 — ditolak checker.',
  },
];

let mockPlans: ManpowerPlan[] = [
  {
    id: 'plan-2026',
    title: 'Rencana Headcount 2026',
    periodStart: '2026-01-01',
    periodEnd: '2026-12-31',
    status: 'ACTIVE',
    createdBy: 'Rina Hartono',
    lines: [
      { unitId: 'unit-fin-papua', target: 12, actual: 10 },
      { unitId: 'unit-ops-jkt', target: 24, actual: 22 },
      { unitId: 'unit-eng-hq', target: 18, actual: 18 },
      { unitId: 'unit-people-hq', target: 8, actual: 7 },
      { unitId: 'unit-sales-sby', target: 22, actual: 20 },
    ],
  },
  {
    id: 'plan-2027',
    title: 'Rencana Headcount 2027',
    periodStart: '2027-01-01',
    periodEnd: '2027-12-31',
    status: 'DRAFT',
    createdBy: 'Rina Hartono',
    lines: [{ unitId: 'unit-eng-hq', target: 6, actual: null }],
  },
  {
    id: 'plan-2025',
    title: 'Rencana Headcount 2025',
    periodStart: '2025-01-01',
    periodEnd: '2025-12-31',
    status: 'CLOSED',
    createdBy: 'Rina Hartono',
    lines: [
      { unitId: 'unit-fin-papua', target: 10, actual: 10 },
      { unitId: 'unit-ops-jkt', target: 12, actual: 12 },
      { unitId: 'unit-eng-hq', target: 8, actual: 8 },
      { unitId: 'unit-sales-sby', target: 8, actual: 8 },
    ],
  },
  {
    id: 'plan-2024',
    title: 'Rencana Headcount 2024',
    periodStart: '2024-01-01',
    periodEnd: '2024-12-31',
    status: 'ARCHIVED',
    createdBy: 'Sari Melati',
    lines: [
      { unitId: 'unit-fin-papua', target: 9, actual: 9 },
      { unitId: 'unit-ops-jkt', target: 12, actual: 12 },
      { unitId: 'unit-eng-hq', target: 10, actual: 10 },
    ],
  },
];

function nextRequisitionId(): string {
  const numbers = mockRequisitions.map((row) => Number(row.id.replace('REQ-', '')));
  return `REQ-${String(Math.max(...numbers) + 1).padStart(4, '0')}`;
}

function find(id: string): Requisition {
  const row = mockRequisitions.find((item) => item.id === id);
  if (!row) throw new Error('Requisition tidak ditemukan.');
  return row;
}

/** SoD (FSD §3.3): pembuat requisition tidak boleh memutuskan sendiri. */
function assertChecker(row: Requisition) {
  if (row.maker === CURRENT_USER) {
    throw new Error('409 — segregation of duties: Anda pembuat requisition ini dan tidak boleh memutuskannya.');
  }
}

/** Guard state (UIC-EMPLOYEE §1.6): aksi di luar status yang sah = konflik state 409. */
function assertStatus(row: Requisition, allowed: Requisition['status'][], action: string) {
  if (!allowed.includes(row.status)) {
    throw new Error(`409 — requisition ${row.id} berstatus ${row.status}; ${action} hanya sah dari ${allowed.join('/')}.`);
  }
}

export const manpowerService = {
  async requisitions(): Promise<Requisition[]> {
    if (MOCK) {
      await delay(200);
      return mockRequisitions.map((row) => ({ ...row }));
    }
    const { data } = await api.get<{ rows: Requisition[] }>('/requisitions');
    return data.rows;
  },

  async plans(): Promise<ManpowerPlan[]> {
    if (MOCK) {
      await delay(200);
      return mockPlans.map((row) => ({ ...row, lines: row.lines.map((line) => ({ ...line })) }));
    }
    const { data } = await api.get<{ rows: ManpowerPlan[] }>('/manpower-plans');
    return data.rows;
  },

  /** Draft-first: `submitNow=false` berhenti di DRAFT, `true` → IN_APPROVAL. */
  async createRequisition(draft: RequisitionDraft, submitNow: boolean): Promise<Requisition> {
    if (MOCK) {
      await delay();
      // Server menegakkan field wajib UIC-EMPLOYEE §3.2 walau form sudah memvalidasi.
      const title = draft.title.trim();
      if (!title || title.length > 150) throw new Error('422 — position_title wajib, maksimal 150 karakter.');
      if (!Number.isInteger(Number(draft.headcount)) || Number(draft.headcount) < 1) {
        throw new Error('422 — headcount minimal 1.');
      }
      if (!draft.reason.trim()) throw new Error('422 — reason wajib diisi.');
      if (!draft.unitId || !draft.parentPositionId) throw new Error('422 — unit dan atasan posisi wajib dipilih.');
      const row: Requisition = {
        id: nextRequisitionId(),
        title: draft.title.trim(),
        unitId: draft.unitId,
        parentPositionId: draft.parentPositionId,
        headcount: Number(draft.headcount),
        status: submitNow ? 'IN_APPROVAL' : 'DRAFT',
        maker: CURRENT_USER,
        reason: draft.reason.trim(),
        planId: draft.planId || undefined,
      };
      mockRequisitions = [row, ...mockRequisitions];
      return row;
    }
    const { data } = await api.post<Requisition>('/requisitions', { ...draft, submit: submitNow });
    return data;
  },

  async submitRequisition(id: string): Promise<void> {
    if (MOCK) {
      await delay(200);
      const row = find(id);
      assertStatus(row, ['DRAFT'], 'submit');
      row.status = 'IN_APPROVAL';
      return;
    }
    await api.post(`/requisitions/${id}/submit`);
  },

  async approveRequisition(id: string, note: string): Promise<void> {
    if (MOCK) {
      await delay();
      const row = find(id);
      assertChecker(row);
      assertStatus(row, ['IN_APPROVAL'], 'approve');
      row.status = 'APPROVED';
      row.checkerNote = note;
      return;
    }
    await api.post(`/requisitions/${id}/approve`, { note });
  },

  async rejectRequisition(id: string, note: string): Promise<void> {
    if (MOCK) {
      await delay();
      const row = find(id);
      assertChecker(row);
      assertStatus(row, ['IN_APPROVAL'], 'reject');
      row.status = 'REJECTED';
      row.checkerNote = note;
      return;
    }
    await api.post(`/requisitions/${id}/reject`, { note });
  },

  /** Rencana baru selalu lahir DRAFT; aktivasinya urusan langkah berikutnya. */
  async createPlan(draft: PlanDraft): Promise<ManpowerPlan> {
    if (MOCK) {
      await delay();
      if (!draft.title.trim()) throw new Error('422 — plan_title wajib diisi.');
      if (!draft.periodStart || !draft.periodEnd) throw new Error('422 — period_start dan period_end wajib diisi.');
      if (draft.periodEnd < draft.periodStart) throw new Error('422 — period_end tidak boleh sebelum period_start.');
      if (!draft.lines.length) throw new Error('422 — rencana wajib punya minimal satu baris target.');
      if (draft.lines.some((line) => Number(line.target) < 0)) throw new Error('422 — target_headcount minimal 0.');
      const row: ManpowerPlan = {
        id: `plan-${Date.now()}`,
        title: draft.title.trim(),
        periodStart: draft.periodStart,
        periodEnd: draft.periodEnd,
        status: 'DRAFT',
        createdBy: CURRENT_USER,
        lines: draft.lines.map((line) => ({ unitId: line.unitId, target: Number(line.target), actual: null })),
      };
      mockPlans = [row, ...mockPlans];
      return row;
    }
    const { data } = await api.post<ManpowerPlan>('/manpower-plans', draft);
    return data;
  },
};
