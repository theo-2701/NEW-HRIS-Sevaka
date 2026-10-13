import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import { CURRENT_USER, CURRENT_USER_ID } from '@/features/manpower/types';
import type { ManpowerPlan, PlanDraft, Requisition, RequisitionDraft } from '@/features/manpower/types';

/**
 * API service Manpower & Requisition.
 *
 * Endpoint kontrak (FSD §3 · UIC §3):
 *   GET  /manpower-plans                       — MP-OVERVIEW
 *   POST /manpower-plans                       — MP-CREATE (draft)
 *   GET  /requisitions                         — daftar requisition
 *   POST /requisitions                         — REQ-CREATE (lahir IN_APPROVAL, FSD 0.24 §3.1)
 *   PUT  /requisitions/{id}                    — Ubah (maker, hanya IN_APPROVAL)
 *   POST /requisitions/{id}/approve · /reject  — REQ-APPROVE (checker, SoD)
 *   POST /requisitions/{id}/cancel             — Batalkan (maker, hanya IN_APPROVAL di layar)
 *   POST /requisitions/{id}/close              — Tutup (maker, APPROVED → CLOSED, alasan wajib)
 *
 * `PROB-FRONTEND-005`: kolom **Actual** dan **Gap** adalah hasil hitung
 * terhadap jumlah posisi hidup di company-service — employee-service tidak
 * menyimpan kolom kapasitas. Kontrak read agregatnya belum ditegaskan, jadi
 * angka aktual di jalur MOCK berasal dari data contoh dan ditandai di UI.
 */
const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

type SeedRow = Omit<Requisition, 'makerId' | 'submittedAt' | 'positionMode'> &
  Partial<Pick<Requisition, 'positionMode' | 'positionId'>>;

const makerIdOf = (name: string) =>
  name === CURRENT_USER ? CURRENT_USER_ID : `usr-${name.toLowerCase().replace(/\s+/g, '-')}`;

/** Data contoh: ID pembuat dari nama, waktu ajuan 2 minggu sebelum masa aktif (mode dummy). */
function seed(row: SeedRow): Requisition {
  const submitted = new Date(`${row.activeFrom}T09:00:00+07:00`);
  submitted.setDate(submitted.getDate() - 14);
  return {
    ...row,
    makerId: makerIdOf(row.maker),
    submittedAt: submitted.toISOString(),
    positionMode: row.positionMode ?? 'NEW',
  };
}

let mockRequisitions: Requisition[] = (
  [
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
      activeFrom: '2026-10-01',
      activeUntil: '2026-12-31',
      filledCount: 0,
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
      activeFrom: '2026-09-01',
      activeUntil: '2026-12-31',
      filledCount: 0,
      positionMode: 'EXISTING',
      positionId: 'pos-eng-be-hq',
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
      activeFrom: '2026-08-01',
      activeUntil: '2026-11-30',
      filledCount: 0,
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
      activeFrom: '2026-01-05',
      activeUntil: '2026-03-31',
      filledCount: 3,
    },
    {
      id: 'REQ-0227',
      title: 'Warehouse Coordinator',
      unitId: 'unit-ops-jkt',
      parentPositionId: 'pos-ops-lead',
      headcount: 1,
      status: 'IN_APPROVAL',
      maker: CURRENT_USER,
      reason: 'Koordinator gudang untuk gudang Cakung.',
      activeFrom: '2026-10-15',
      activeUntil: '2027-01-31',
      filledCount: 0,
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
      activeFrom: '2026-09-15',
      activeUntil: '2026-12-31',
      filledCount: 0,
    },
    {
      id: 'REQ-0225',
      title: 'Driver',
      unitId: 'unit-ops-jkt',
      parentPositionId: 'pos-ops-lead',
      headcount: 2,
      status: 'CLOSED',
      maker: 'Rina Hartono',
      reason: 'Armada tambahan untuk rute timur.',
      activeFrom: '2026-06-01',
      activeUntil: '2026-09-30',
      filledCount: 1,
      closedReason: 'Posisi dibekukan',
      closedByName: 'Rina Hartono',
      closedAt: '2026-09-02T10:15:00+07:00',
    },
    {
      id: 'REQ-0232',
      title: 'Warehouse Staff',
      unitId: 'unit-ops-jkt',
      parentPositionId: 'pos-ops-lead',
      headcount: 2,
      status: 'IN_APPROVAL',
      maker: 'Bagus Pratama',
      reason: 'Two more seats on the existing warehouse position for the year-end peak.',
      planId: 'plan-2026',
      activeFrom: '2026-10-20',
      activeUntil: '2026-12-31',
      filledCount: 0,
      positionMode: 'EXISTING',
      positionId: 'pos-ops-wh-jkt',
    },
  ] as SeedRow[]
).map(seed);

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

/** SoD (FSD §3.3): pembuat requisition tidak boleh memutuskan sendiri — dicocokkan lewat ID. */
function assertChecker(row: Requisition) {
  if (row.makerId === CURRENT_USER_ID) {
    throw new Error('409 — segregation of duties: Anda pembuat requisition ini dan tidak boleh memutuskannya.');
  }
}

/** Guard status (FSD 0.24 §3.1): urutan galat 404 → 403 → 409 SoD → 422 status. */
function assertStatus(row: Requisition, allowed: Requisition['status'][], action: string) {
  if (!allowed.includes(row.status)) {
    throw new Error(
      `422 — requisition ${row.id} berstatus ${row.status}; ${action} hanya sah dari ${allowed.join('/')}.`,
    );
  }
}

/** Validasi field wajib REQ-CREATE / Ubah (UIC-EMPLOYEE 0.42 §3.2) — server tetap menegakkan. */
function assertDraft(draft: RequisitionDraft, checkPast: boolean) {
  const title = draft.title.trim();
  if (!title || title.length > 150) throw new Error('422 — position_title wajib, maksimal 150 karakter.');
  if (!Number.isInteger(Number(draft.headcount)) || Number(draft.headcount) < 1) {
    throw new Error('422 — headcount minimal 1.');
  }
  if (!draft.reason.trim()) throw new Error('422 — reason wajib diisi.');
  if (!draft.unitId || !draft.parentPositionId) throw new Error('422 — unit dan atasan posisi wajib dipilih.');
  if (draft.positionMode === 'EXISTING' && !draft.positionId)
    throw new Error('422 — position_id wajib untuk kursi yang sudah ada.');
  if (!draft.activeFrom || !draft.activeUntil) throw new Error('422 — active_from dan active_until wajib diisi.');
  if (draft.activeUntil < draft.activeFrom) throw new Error('422 — active_until tidak boleh sebelum active_from.');
  if (checkPast && draft.activeUntil < new Date().toISOString().slice(0, 10)) {
    throw new Error('422 — active_until tidak boleh di masa lampau.');
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

  /** Requisition lahir langsung IN_APPROVAL — tidak ada draf maupun langkah Ajukan (TSD §15 K2). */
  async createRequisition(draft: RequisitionDraft): Promise<Requisition> {
    if (MOCK) {
      await delay();
      assertDraft(draft, true);
      const row: Requisition = {
        id: nextRequisitionId(),
        title: draft.title.trim(),
        unitId: draft.unitId,
        parentPositionId: draft.parentPositionId,
        headcount: Number(draft.headcount),
        status: 'IN_APPROVAL',
        maker: CURRENT_USER,
        makerId: CURRENT_USER_ID,
        submittedAt: new Date().toISOString(),
        positionMode: draft.positionMode,
        positionId: draft.positionMode === 'EXISTING' ? draft.positionId : undefined,
        reason: draft.reason.trim(),
        planId: draft.planId || undefined,
        activeFrom: draft.activeFrom,
        activeUntil: draft.activeUntil,
        filledCount: 0,
      };
      mockRequisitions = [row, ...mockRequisitions];
      return row;
    }
    const { data } = await api.post<Requisition>('/requisitions', draft);
    return data;
  },

  /** Ubah — maker menyunting sebelum checker memutuskan; status lain 422. */
  async updateRequisition(id: string, draft: RequisitionDraft): Promise<void> {
    if (MOCK) {
      await delay();
      const row = find(id);
      assertStatus(row, ['IN_APPROVAL'], 'ubah');
      assertDraft(draft, false);
      Object.assign(row, {
        ...draft,
        title: draft.title.trim(),
        reason: draft.reason.trim(),
        headcount: Number(draft.headcount),
        planId: draft.planId || undefined,
        positionId: draft.positionMode === 'EXISTING' ? draft.positionId : undefined,
      });
      return;
    }
    await api.put(`/requisitions/${id}`, draft);
  },

  async cancelRequisition(id: string): Promise<void> {
    if (MOCK) {
      await delay(200);
      const row = find(id);
      assertStatus(row, ['DRAFT', 'IN_APPROVAL'], 'batalkan');
      row.status = 'CANCELLED';
      return;
    }
    await api.post(`/requisitions/${id}/cancel`);
  },

  /** Tutup — APPROVED → CLOSED, alasan wajib maks 150; pelaku & waktu tercatat. */
  async closeRequisition(id: string, reason: string): Promise<void> {
    if (MOCK) {
      await delay();
      const row = find(id);
      assertStatus(row, ['APPROVED'], 'tutup');
      const text = reason.trim();
      if (!text || text.length > 150) throw new Error('422 — alasan penutupan wajib, maksimal 150 karakter.');
      Object.assign(row, {
        status: 'CLOSED',
        closedReason: text,
        closedByName: CURRENT_USER,
        closedAt: new Date().toISOString(),
      });
      return;
    }
    await api.post(`/requisitions/${id}/close`, { reason });
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
