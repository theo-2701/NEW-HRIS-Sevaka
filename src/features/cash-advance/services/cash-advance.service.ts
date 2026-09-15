import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import type { PayableSource } from '@/features/disbursement/types';
import {
  ADVANCES,
  CASH_ADVANCE_CFG,
  DIFFERENCES,
  EMPLOYEES,
  MANAGER_OF,
  PURPOSE_TYPES,
  REJECTION_REASONS,
  SETTLEMENTS,
} from '@/features/cash-advance/mock-data';
import {
  addDays,
  differenceOf,
  isParty,
  itemsTotal,
  needsExtraApproval,
  normalizeReceipt,
  openAdvanceCount,
  openSettlementOf,
  parseAmount,
  purposeSelectable,
  similarityWarnings,
} from '@/features/cash-advance/rules';
import type {
  Actor,
  AdvanceDraft,
  CashAdvance,
  CashAdvanceConfig,
  CashAdvanceStatus,
  Decision,
  Difference,
  PurposeType,
  ReviewInput,
  Settlement,
  SettlementDraft,
  SettlementView,
  SettlementMethod,
} from '@/features/cash-advance/types';

/**
 * API service Cash Advance (TSD §14.4 · UIC §5, 15 endpoint).
 *
 * Gerbang yang ditegakkan (kode dari UIC §5 / TSD §14.4):
 *  • 5.1  modul mati ⇒ 422 FIN_MODULE_DISABLED; nominal > batas jenis ⇒ 422
 *         FIN_CASH_ADVANCE_AMOUNT_EXCEEDED; jatah uang muka terbuka penuh ⇒ 422
 *         FIN_CASH_ADVANCE_LIMIT_EXCEEDED; pintu atas nama oleh selain Finance
 *         Officer ⇒ 403. Tanggal dinas wajib iff jenisnya dinas, selesai ≥ mulai.
 *  • 5.4  cancel: penerima/pembuat, hanya SUBMITTED ⇒ selain itu 409 FIN_ALREADY_DECIDED.
 *  • 5.5  repudiate: hanya pintu b, hanya penerima, belum ditandai cair.
 *  • 5.6  travel-cancellation: jenis dinas + APPROVED, sebab wajib, tanpa gerbang persetujuan.
 *  • 5.9  settlement: nota bentrok kunci ⇒ 409 FIN_DUPLICATE_RECEIPT; dokumen
 *         wajib bila jenis mewajibkan nota (dibaca hidup, bukan snapshot).
 *  • 5.11 review: Finance Officer, bukan pembuat atas nama pengajuan ini (403);
 *         peringatan kemiripan wajib diakui; hasil 200 UNDER_REVIEW — penandaan.
 *  • 5.12 decision: atasan langsung penerima, guard UNDER_REVIEW ⇒ 202.
 *  • 5.14 settlement-method: hanya SURPLUS (422 atas SHORTFALL); catatan wajib
 *         untuk RETURNED_OUTSIDE_HRIS.
 *  • 5.15 approve-extra: atasan berikutnya, beda dari pemutus tahap; guard
 *         AWAITING_APPROVAL ⇒ 202.
 *
 * Pola K9: endpoint keputusan (5.12, 5.15) tidak menulis status. Mock
 * menyediakan `completeWorkflow*` sebagai pengganti konsumsi
 * `workflow.process.completed` supaya rantainya bisa didemonstrasikan.
 */
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));
const today = () => new Date().toISOString().slice(0, 10);

const cloneSettlement = (row: Settlement): Settlement => ({
  ...row,
  items: row.items.map((item) => ({ ...item })),
  similarityWarnings: row.similarityWarnings.map((item) => ({ ...item })),
});

let mockAdvances: CashAdvance[] = ADVANCES.map((row) => ({ ...row }));
let mockSettlements: Settlement[] = SETTLEMENTS.map(cloneSettlement);
let mockDifferences: Difference[] = DIFFERENCES.map((row) => ({ ...row }));
let mockConfig: CashAdvanceConfig = { ...CASH_ADVANCE_CFG };

export function resetCashAdvanceMocks() {
  mockAdvances = ADVANCES.map((row) => ({ ...row }));
  mockSettlements = SETTLEMENTS.map(cloneSettlement);
  mockDifferences = DIFFERENCES.map((row) => ({ ...row }));
  mockConfig = { ...CASH_ADVANCE_CFG };
}

/** Hanya untuk pengujian gerbang: mematikan modul per company. */
export function setCashAdvanceModuleEnabled(enabled: boolean) {
  mockConfig = { ...mockConfig, enabled };
}

export interface AdvanceFilter {
  statuses?: CashAdvanceStatus[];
  purposeTypeId?: string;
  search?: string;
}

function findAdvance(id: string): CashAdvance {
  const row = mockAdvances.find((item) => item.id === id);
  if (!row) throw new Error('404 — uang muka tidak ditemukan.');
  return row;
}

function findSettlement(id: string): Settlement {
  const row = mockSettlements.find((item) => item.id === id);
  if (!row) throw new Error('404 — tahap pertanggungjawaban tidak ditemukan.');
  return row;
}

function findDifference(id: string): Difference {
  const row = mockDifferences.find((item) => item.id === id);
  if (!row) throw new Error('404 — selisih tidak ditemukan.');
  return row;
}

function requireParty(advance: CashAdvance, actor: Actor, action: string) {
  if (!isParty(advance, actor.employeeId)) {
    throw new Error(`403 — hanya penerima atau pembuat atas nama yang bisa ${action}.`);
  }
}

export const cashAdvanceService = {
  async config(): Promise<CashAdvanceConfig> {
    if (MOCK) {
      await delay(100);
      return { ...mockConfig };
    }
    const { data } = await api.get<CashAdvanceConfig>('/cash-advance-config');
    return data;
  },

  async purposeTypes(): Promise<PurposeType[]> {
    if (MOCK) {
      await delay(100);
      return PURPOSE_TYPES.map((row) => ({ ...row }));
    }
    const { data } = await api.get<{ rows: PurposeType[] }>('/cash-advance-purpose-types');
    return data.rows;
  },

  /** 5.3 — `ROLE_EMPLOYEE` dipaksa melihat baris miliknya sebagai penerima. */
  async advances(actor: Actor, filter: AdvanceFilter = {}): Promise<CashAdvance[]> {
    if (MOCK) {
      await delay();
      const query = filter.search?.trim().toLowerCase();
      return mockAdvances
        .filter((row) => {
          if (actor.role === 'ROLE_EMPLOYEE' && row.recipientEmployeeId !== actor.employeeId) return false;
          if (filter.statuses?.length && !filter.statuses.includes(row.status)) return false;
          if (filter.purposeTypeId && row.purposeTypeId !== filter.purposeTypeId) return false;
          if (query && !row.requestNo.toLowerCase().includes(query)) return false;
          return true;
        })
        .map((row) => ({ ...row }));
    }
    const { data } = await api.post<{ rows: CashAdvance[] }>('/cash-advances/search', {
      status: filter.statuses,
      purpose_type_id: filter.purposeTypeId,
      request_no: filter.search,
    });
    return data.rows;
  },

  async settlements(): Promise<SettlementView[]> {
    if (MOCK) {
      await delay();
      return mockSettlements.map((row) => {
        const advance = findAdvance(row.cashAdvanceId);
        return {
          ...cloneSettlement(row),
          requestNo: advance.requestNo,
          recipientEmployeeId: advance.recipientEmployeeId,
          createdOnBehalfEmployeeId: advance.createdOnBehalfEmployeeId,
          advanceAmount: advance.amount,
          purposeTypeName: advance.purposeTypeName,
        };
      });
    }
    const { data } = await api.get<{ rows: SettlementView[] }>('/settlements');
    return data.rows;
  },

  async differences(): Promise<Difference[]> {
    if (MOCK) {
      await delay();
      return mockDifferences.map((row) => ({ ...row }));
    }
    const { data } = await api.get<{ rows: Difference[] }>('/cash-advance-differences');
    return data.rows;
  },

  /** 5.1 — dua pintu: karyawan sendiri, atau Finance Officer atas nama. */
  async submitAdvance(actor: Actor, draft: AdvanceDraft): Promise<CashAdvance> {
    if (MOCK) {
      await delay(400);
      if (!mockConfig.enabled) {
        throw new Error('422 FIN_MODULE_DISABLED — modul uang muka dimatikan untuk company ini.');
      }

      const recipientId = draft.recipientEmployeeId || actor.employeeId;
      const onBehalf = recipientId !== actor.employeeId;
      if (onBehalf && actor.role !== 'ROLE_FINANCE_OFFICER') {
        throw new Error('403 — pintu atas nama hanya untuk Finance Officer / Super Admin.');
      }
      if (!EMPLOYEES.some((row) => row.id === recipientId)) throw new Error('403 — penerima tidak ada di company ini.');

      const purpose = PURPOSE_TYPES.find((row) => row.id === draft.purposeTypeId);
      if (!purpose || !purpose.isActive) throw new Error('422 — pilih jenis keperluan yang aktif.');

      const amount = parseAmount(draft.amount);
      if (amount <= 0) throw new Error('422 — nominal harus lebih besar dari nol.');
      if (!purposeSelectable(purpose)) {
        throw new Error(
          '422 FIN_CASH_ADVANCE_AMOUNT_EXCEEDED — jenis ini tidak punya batas dan tidak diakui tak berbatas (deny-by-default).',
        );
      }
      if (purpose.maxAmount !== null && amount > purpose.maxAmount) {
        throw new Error(
          `422 FIN_CASH_ADVANCE_AMOUNT_EXCEEDED — melewati batas Rp ${purpose.maxAmount.toLocaleString('id-ID')} untuk jenis ini.`,
        );
      }

      if (purpose.isOfficialTravel) {
        if (!draft.travelStartDate || !draft.travelEndDate) {
          throw new Error('422 — tanggal mulai dan selesai dinas wajib diisi untuk jenis dinas.');
        }
        if (draft.travelEndDate < draft.travelStartDate) {
          throw new Error('422 — tanggal selesai dinas tidak boleh sebelum tanggal mulai.');
        }
      } else if (draft.travelStartDate || draft.travelEndDate) {
        throw new Error('422 — tanggal dinas dilarang untuk jenis yang bukan dinas.');
      }

      const open = openAdvanceCount(mockAdvances, recipientId);
      if (open >= mockConfig.maxOutstandingCount) {
        throw new Error(
          `422 FIN_CASH_ADVANCE_LIMIT_EXCEEDED — ${open} dari ${mockConfig.maxOutstandingCount} uang muka terbuka sudah berjalan.`,
        );
      }

      const sequence = 86 + mockAdvances.length - ADVANCES.length + 1;
      const recipient = EMPLOYEES.find((row) => row.id === recipientId)!;
      const row: CashAdvance = {
        id: `adv-${sequence}`,
        requestNo: `ADV-2026-${String(sequence).padStart(6, '0')}`,
        recipientEmployeeId: recipientId,
        createdOnBehalfEmployeeId: onBehalf ? actor.employeeId : null,
        purposeTypeId: purpose.id,
        purposeTypeName: purpose.name,
        // Dibekukan saat pengiriman — tidak dibaca ulang dari jenisnya.
        isOfficialTravelSnapshot: purpose.isOfficialTravel,
        maxAmountSnapshot: purpose.maxAmount,
        amount,
        travelStartDate: purpose.isOfficialTravel ? draft.travelStartDate : null,
        travelEndDate: purpose.isOfficialTravel ? draft.travelEndDate : null,
        status: 'SUBMITTED',
        createdAt: today(),
        workflowInstanceId: `8c00…${Math.random().toString(16).slice(4, 8)}`,
        bankAccountSnapshot: { bankCode: 'BCA', accountNumber: '****0000', accountHolderName: recipient.name },
        costCenterIdSnapshot: null,
        travelCancelledAt: null,
        travelCancelReason: null,
        disbursementMarked: false,
      };
      mockAdvances = [row, ...mockAdvances];
      return { ...row };
    }
    const { data } = await api.post<CashAdvance>('/cash-advances', {
      recipient_employee_id: draft.recipientEmployeeId || undefined,
      purpose_type_id: draft.purposeTypeId,
      amount: parseAmount(draft.amount),
      travel_start_date: draft.travelStartDate || undefined,
      travel_end_date: draft.travelEndDate || undefined,
    });
    return data;
  },

  /** 5.4 — tarik sendiri sebelum keputusan; status ditulis langsung (bukan K9). */
  async cancelAdvance(actor: Actor, id: string, reasonNote = ''): Promise<CashAdvance> {
    if (MOCK) {
      await delay(250);
      const row = findAdvance(id);
      requireParty(row, actor, 'menarik pengajuan ini');
      if (row.status !== 'SUBMITTED') {
        throw new Error('409 FIN_ALREADY_DECIDED — proses persetujuan sudah menghasilkan keputusan.');
      }
      row.status = 'CANCELLED';
      return { ...row };
    }
    const { data } = await api.post<CashAdvance>(`/cash-advances/${id}/cancel`, { reason_note: reasonNote || undefined });
    return data;
  },

  /** 5.5 — bantahan penerima atas pengajuan yang dibuatkan orang lain. */
  async repudiateAdvance(actor: Actor, id: string, reasonNote = ''): Promise<CashAdvance> {
    if (MOCK) {
      await delay(250);
      const row = findAdvance(id);
      if (!row.createdOnBehalfEmployeeId) {
        throw new Error('422 — bantahan hanya berlaku untuk pengajuan yang dibuatkan atas nama Anda.');
      }
      if (row.recipientEmployeeId !== actor.employeeId) {
        throw new Error('403 — hanya penerima yang namanya dipakai yang bisa membantah.');
      }
      if (row.disbursementMarked) throw new Error('422 — uang muka ini sudah ditandai cair; bantahan sudah lewat batas.');
      if (!['SUBMITTED', 'APPROVED'].includes(row.status)) {
        throw new Error('409 FIN_ALREADY_DECIDED — pengajuan ini sudah berakhir.');
      }
      row.status = 'REPUDIATED';
      return { ...row };
    }
    const { data } = await api.post<CashAdvance>(`/cash-advances/${id}/repudiate`, {
      statement: 'NOT_MY_REQUEST',
      reason_note: reasonNote || undefined,
    });
    return data;
  },

  /** 5.6 — dinas batal setelah disetujui: tanpa gerbang persetujuan, sebab wajib. */
  async cancelTravel(actor: Actor, id: string, reasonNote: string): Promise<CashAdvance> {
    if (MOCK) {
      await delay(250);
      const row = findAdvance(id);
      requireParty(row, actor, 'membatalkan dinas');
      if (!row.isOfficialTravelSnapshot || row.status !== 'APPROVED') {
        throw new Error('422 — pembatalan dinas hanya untuk uang muka dinas yang sudah APPROVED.');
      }
      if (row.travelCancelledAt) throw new Error('409 — dinas ini sudah dicatat batal.');
      if (!reasonNote.trim()) throw new Error('422 — sebab pembatalan dinas wajib diisi.');
      row.travelCancelledAt = today();
      row.travelCancelReason = reasonNote.trim();
      return { ...row };
    }
    const { data } = await api.post<CashAdvance>(`/cash-advances/${id}/travel-cancellation`, { reason_note: reasonNote });
    return data;
  },

  /** 5.9 — serahkan satu tahap pertanggungjawaban. */
  async submitSettlement(actor: Actor, advanceId: string, draft: SettlementDraft): Promise<Settlement> {
    if (MOCK) {
      await delay(400);
      const advance = findAdvance(advanceId);
      requireParty(advance, actor, 'menyerahkan pertanggungjawaban');
      if (advance.status !== 'APPROVED') {
        throw new Error('422 — pertanggungjawaban hanya untuk uang muka yang sudah APPROVED.');
      }
      if (openSettlementOf(mockSettlements, advanceId)) {
        throw new Error('409 — masih ada tahap yang belum diputus untuk uang muka ini.');
      }

      // Kewajiban nota dibaca hidup dari jenisnya, bukan dari snapshot.
      const purpose = PURPOSE_TYPES.find((row) => row.id === advance.purposeTypeId);
      const requiresReceipt = purpose?.requiresReceipt ?? true;
      if (requiresReceipt && !draft.items.length) throw new Error('422 — jenis ini mewajibkan minimal satu nota.');

      draft.items.forEach((item, index) => {
        const at = `nota ${index + 1}`;
        if (!item.expenseDate) throw new Error(`422 — tanggal pengeluaran ${at} wajib diisi.`);
        if (parseAmount(item.amount) <= 0) throw new Error(`422 — nominal ${at} harus lebih besar dari nol.`);
        if (requiresReceipt && !item.documentName.trim()) throw new Error(`422 — lampiran ${at} wajib untuk jenis ini.`);
      });

      const taken = new Set(
        mockSettlements.flatMap((row) => row.items.map((item) => normalizeReceipt(item.receiptNo))).filter(Boolean),
      );
      for (const item of draft.items) {
        const key = normalizeReceipt(item.receiptNo);
        if (!key) continue;
        if (taken.has(key)) {
          throw new Error(`409 FIN_DUPLICATE_RECEIPT — nota ${item.receiptNo.trim()} sudah tercatat di baris lain.`);
        }
        taken.add(key);
      }

      const stageNo = mockSettlements.filter((row) => row.cashAdvanceId === advanceId).length + 1;
      const id = `stl-${advance.id.replace('adv-', '')}-${stageNo}`;
      const items = draft.items.map((item, index) => ({
        id: `${id}-i${index + 1}`,
        expenseDate: item.expenseDate,
        amount: parseAmount(item.amount),
        receiptNo: item.receiptNo.trim(),
        documentId: item.documentName.trim() ? `doc-${id}-${index + 1}` : null,
        itemStatus: 'ACCEPTED' as const,
        flaggedReasonId: null,
      }));
      const existingItems = mockSettlements.flatMap((row) => row.items);

      const row: Settlement = {
        id,
        cashAdvanceId: advanceId,
        settlementNo: `${advance.requestNo}#${stageNo}`,
        stageNo,
        isFinalStage: draft.isFinalStage,
        // Koreksi = sudah ada tahap yang diterima sebelumnya (FD-91).
        isCorrection: mockSettlements.some((item) => item.cashAdvanceId === advanceId && item.status === 'ACCEPTED'),
        status: 'SUBMITTED',
        submittedAt: today(),
        reviewedBy: null,
        decidedBy: null,
        items,
        similarityWarnings: similarityWarnings(items, existingItems),
      };
      mockSettlements = [row, ...mockSettlements];
      return cloneSettlement(row);
    }
    const { data } = await api.post<Settlement>(`/cash-advances/${advanceId}/settlements`, {
      is_final_stage: draft.isFinalStage,
      items: draft.items.map((item) => ({
        expense_date: item.expenseDate,
        amount: parseAmount(item.amount),
        receipt_no: item.receiptNo || undefined,
      })),
    });
    return data;
  },

  /** 5.11 — penandaan petugas keuangan; bukan keputusan. */
  async reviewSettlement(actor: Actor, id: string, input: ReviewInput): Promise<Settlement> {
    if (MOCK) {
      await delay(300);
      const row = findSettlement(id);
      const advance = findAdvance(row.cashAdvanceId);
      if (actor.role !== 'ROLE_FINANCE_OFFICER') throw new Error('403 — pemeriksaan nota milik Finance Officer.');
      if (advance.createdOnBehalfEmployeeId === actor.employeeId) {
        throw new Error('403 — pembuat atas nama pengajuan ini tidak boleh memeriksa notanya sendiri.');
      }
      if (row.status !== 'SUBMITTED') {
        throw new Error('409 FIN_ALREADY_DECIDED — tahap ini sudah diperiksa.');
      }
      for (const flag of input.flags) {
        if (!row.items.some((item) => item.id === flag.itemId)) throw new Error('422 — nota yang ditandai tidak ada di tahap ini.');
        if (!REJECTION_REASONS.some((reason) => reason.id === flag.reasonId)) {
          throw new Error('422 — pilih sebab untuk nota yang ditandai.');
        }
      }
      if (row.similarityWarnings.length && !input.similarityAcknowledged) {
        throw new Error('422 — akui dulu peringatan kemiripan nota sebelum meneruskan.');
      }
      row.items.forEach((item) => {
        item.flaggedReasonId = input.flags.find((flag) => flag.itemId === item.id)?.reasonId ?? null;
      });
      row.status = 'UNDER_REVIEW';
      row.reviewedBy = actor.employeeId;
      return cloneSettlement(row);
    }
    const { data } = await api.post<Settlement>(`/settlements/${id}/review`, {
      item_flags: input.flags.map((flag) => ({ item_id: flag.itemId, flagged_reason_id: flag.reasonId })),
      similarity_warning_acknowledged: input.similarityAcknowledged,
    });
    return data;
  },

  /** 5.12 — atasan langsung penerima memutus; 202, status ditulis belakangan. */
  async decideSettlement(actor: Actor, id: string, decision: Decision): Promise<{ accepted: true }> {
    if (MOCK) {
      await delay(400);
      const row = findSettlement(id);
      const advance = findAdvance(row.cashAdvanceId);
      if (MANAGER_OF[advance.recipientEmployeeId] !== actor.employeeId) {
        throw new Error('403 — hanya atasan langsung penerima yang memutus pertanggungjawaban.');
      }
      if (row.status !== 'UNDER_REVIEW') {
        throw new Error(`409 FIN_ALREADY_DECIDED — tahap ini ${row.status}; keputusan butuh UNDER_REVIEW.`);
      }
      void decision;
      return { accepted: true };
    }
    await api.post(`/settlements/${id}/decision`, { decision });
    return { accepted: true };
  },

  /**
   * Pengganti konsumsi `workflow.process.completed` untuk tahap (mock saja).
   * Diterima ⇒ nota bertanda menjadi REJECTED, sisanya ACCEPTED; bila tahap
   * penutup, selisih dihitung terhadap nominal uang muka.
   */
  async completeSettlementWorkflow(id: string, decision: Decision, decidedBy: string): Promise<Difference | null> {
    await delay(150);
    const row = findSettlement(id);
    const advance = findAdvance(row.cashAdvanceId);
    row.decidedBy = decidedBy;
    if (decision === 'REJECT') {
      row.status = 'REJECTED';
      return null;
    }

    row.items.forEach((item) => {
      item.itemStatus = item.flaggedReasonId ? 'REJECTED' : 'ACCEPTED';
    });
    row.status = 'ACCEPTED';
    if (!row.isFinalStage) return null;

    const accepted = itemsTotal(row.items.filter((item) => item.itemStatus === 'ACCEPTED'));
    const diff = differenceOf(advance.amount, accepted);
    if (!diff) {
      advance.status = 'SETTLED';
      return null;
    }

    const extra = diff.type === 'SHORTFALL' && needsExtraApproval(advance, diff.amount);
    const difference: Difference = {
      id: `dif-${row.id.replace('stl-', '')}`,
      cashAdvanceId: advance.id,
      closingSettlementId: row.id,
      requestNo: advance.requestNo,
      employeeId: advance.recipientEmployeeId,
      differenceType: diff.type,
      amount: diff.amount,
      settlementMethod: null,
      requiresExtraApproval: extra,
      dueDate: diff.type === 'SURPLUS' ? addDays(today(), mockConfig.secondStageDeadlineDays) : null,
      status: extra ? 'AWAITING_APPROVAL' : diff.type === 'SHORTFALL' ? 'APPROVED' : 'OPEN',
      settlementDecidedBy: decidedBy,
    };
    mockDifferences = [difference, ...mockDifferences];
    return { ...difference };
  },

  /** 5.14 — cara pengembalian sisa, khusus SURPLUS. */
  async setSurplusMethod(actor: Actor, id: string, method: SettlementMethod, reasonNote: string): Promise<Difference> {
    if (MOCK) {
      await delay(300);
      const row = findDifference(id);
      if (actor.role !== 'ROLE_FINANCE_OFFICER') throw new Error('403 — cara pengembalian ditandai Finance Officer.');
      if (row.differenceType !== 'SURPLUS') {
        throw new Error('422 — kekurangan (SHORTFALL) diselesaikan lewat Pencairan & Piutang, bukan endpoint ini.');
      }
      if (row.status === 'SETTLED') throw new Error('409 — selisih ini sudah tuntas.');
      if (method === 'RETURNED_OUTSIDE_HRIS' && !reasonNote.trim()) {
        throw new Error('422 — catatan wajib untuk pengembalian di luar HRIS.');
      }
      row.settlementMethod = method;
      if (method === 'RETURNED_OUTSIDE_HRIS') {
        row.status = 'SETTLED';
        const advance = mockAdvances.find((item) => item.id === row.cashAdvanceId);
        if (advance && advance.status === 'APPROVED') advance.status = 'SETTLED';
      }
      return { ...row };
    }
    const { data } = await api.post<Difference>(`/differences/${id}/settlement-method`, {
      settlement_method: method,
      reason_note: reasonNote || undefined,
    });
    return data;
  },

  /** 5.15 — lapis tambahan SHORTFALL besar oleh atasan berikutnya; 202. */
  async approveExtra(actor: Actor, id: string, decision: Decision): Promise<{ accepted: true }> {
    if (MOCK) {
      await delay(400);
      const row = findDifference(id);
      const direct = MANAGER_OF[row.employeeId];
      const next = direct ? MANAGER_OF[direct] : undefined;
      if (actor.employeeId !== next || actor.employeeId === row.settlementDecidedBy) {
        throw new Error('403 — lapis tambahan milik atasan berikutnya, beda dari pemutus tahap.');
      }
      if (row.status !== 'AWAITING_APPROVAL') {
        throw new Error('409 FIN_ALREADY_DECIDED — lapis tambahan hanya untuk selisih AWAITING_APPROVAL.');
      }
      void decision;
      return { accepted: true };
    }
    await api.post(`/differences/${id}/approve-extra`, { decision });
    return { accepted: true };
  },

  /** Pengganti konsumsi `workflow.process.completed` lapis tambahan (mock saja). */
  async completeExtraWorkflow(id: string, decision: Decision): Promise<Difference> {
    await delay(150);
    const row = findDifference(id);
    row.status = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    return { ...row };
  },
};

/**
 * Mock lintas modul — FT5 membaca `emp_cash_advance` read-only (TSD §3.1):
 * layak bila `APPROVED`; identitas = penerima, bukan pembuat atas nama.
 */
export function advancePayableSources(): PayableSource[] {
  return mockAdvances.map((advance): PayableSource => ({
    payableType: 'CASH_ADVANCE',
    payableId: advance.id,
    requestNo: advance.requestNo,
    employeeId: advance.recipientEmployeeId,
    amount: advance.amount,
    submittedAt: advance.createdAt,
    eligible: advance.status === 'APPROVED',
  }));
}

/** Kekurangan `SHORTFALL` + `APPROVED` — payable kedua atas uang muka yang sama, request_no dari induk. */
export function shortfallPayableSources(): PayableSource[] {
  return mockDifferences
    .filter((row) => row.differenceType === 'SHORTFALL')
    .map((row): PayableSource => {
      const advance = mockAdvances.find((item) => item.id === row.cashAdvanceId);
      const closing = mockSettlements.find((item) => item.id === row.closingSettlementId);
      return {
        payableType: 'CASH_ADVANCE_SHORTFALL',
        payableId: row.id,
        requestNo: advance?.requestNo ?? row.requestNo,
        employeeId: advance?.recipientEmployeeId ?? row.employeeId,
        amount: row.amount,
        submittedAt: closing?.submittedAt ?? advance?.createdAt ?? '',
        eligible: row.status === 'APPROVED',
      };
    });
}

/** Efek FT5 — uang muka sudah / tidak lagi ditandai cair (jendela bantahan FD-86). */
export function markAdvanceDisbursed(id: string, marked: boolean) {
  const row = mockAdvances.find((item) => item.id === id);
  if (row) row.disbursementMarked = marked;
}

/** Efek samping mark-paid `CASH_ADVANCE_SHORTFALL` (TSD §3.3 poin 4): APPROVED → SETTLED dalam tindakan yang sama. */
export function settleShortfallByDisbursement(id: string) {
  const row = mockDifferences.find((item) => item.id === id);
  if (!row || row.differenceType !== 'SHORTFALL' || row.status !== 'APPROVED') return;
  row.status = 'SETTLED';
  const advance = mockAdvances.find((item) => item.id === row.cashAdvanceId);
  if (advance && advance.status === 'APPROVED') advance.status = 'SETTLED';
}
