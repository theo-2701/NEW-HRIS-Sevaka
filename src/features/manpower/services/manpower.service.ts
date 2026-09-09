import { api } from '@/services/api';
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
 *   POST /requisitions/{id}/reject
 *
 * `PROB-FRONTEND-005`: kolom **Actual** dan **Gap** adalah hasil hitung
 * terhadap jumlah posisi hidup di company-service — employee-service tidak
 * menyimpan kolom kapasitas. Kontrak read agregatnya belum ditegaskan, jadi
 * angka aktual di jalur MOCK berasal dari data contoh dan ditandai di UI.
 */
const MOCK = !import.meta.env.VITE_API_BASE_URL;
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
    justification: 'Ekspansi wilayah Papua; dua staf finance untuk menutup ledger cabang baru.',
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
    justification: 'Backfill backend engineer yang mengundurkan diri.',
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
    justification: 'HRBP untuk headcount Jakarta yang bertambah.',
  },
  {
    id: 'REQ-0228',
    title: 'Sales Executive',
    unitId: 'unit-sales-sby',
    parentPositionId: 'pos-ops-lead',
    headcount: 3,
    status: 'FULFILLED',
    maker: 'Bagus Pratama',
    justification: 'Ramp-up penjualan Q1 — ketiga kursi sudah terisi.',
  },
  {
    id: 'REQ-0227',
    title: 'Warehouse Coordinator',
    unitId: 'unit-ops-jkt',
    parentPositionId: 'pos-ops-lead',
    headcount: 1,
    status: 'DRAFT',
    maker: CURRENT_USER,
    justification: 'Koordinator gudang — justifikasi masih menunggu tanda tangan.',
  },
  {
    id: 'REQ-0226',
    title: 'Staff Finance',
    unitId: 'unit-fin-papua',
    parentPositionId: 'pos-fin-mgr',
    headcount: 1,
    status: 'REJECTED',
    maker: 'Bagus Pratama',
    justification: 'Duplikat REQ-0231 — ditolak checker.',
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
      const row: Requisition = {
        id: nextRequisitionId(),
        title: draft.title.trim(),
        unitId: draft.unitId,
        parentPositionId: draft.parentPositionId,
        headcount: Number(draft.headcount),
        status: submitNow ? 'IN_APPROVAL' : 'DRAFT',
        maker: CURRENT_USER,
        justification: draft.justification.trim(),
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
      find(id).status = 'IN_APPROVAL';
      return;
    }
    await api.post(`/requisitions/${id}/submit`);
  },

  async approveRequisition(id: string, note: string): Promise<void> {
    if (MOCK) {
      await delay();
      const row = find(id);
      assertChecker(row);
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
