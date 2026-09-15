import { beforeEach, describe, expect, it } from 'vitest';
import {
  cashAdvanceService,
  resetCashAdvanceMocks,
  setCashAdvanceModuleEnabled,
} from '@/features/cash-advance/services/cash-advance.service';
import {
  differenceOf,
  needsExtraApproval,
  normalizeReceipt,
  openAdvanceCount,
  purposeSelectable,
  similarityWarnings,
} from '@/features/cash-advance/rules';
import { ADVANCES, PURPOSE_TYPES } from '@/features/cash-advance/mock-data';
import type { Actor, AdvanceDraft, SettlementDraft } from '@/features/cash-advance/types';

const budi: Actor = { employeeId: 'emp-budi', role: 'ROLE_EMPLOYEE' };
const maya: Actor = { employeeId: 'emp-maya', role: 'ROLE_EMPLOYEE' };
const rahmat: Actor = { employeeId: 'emp-rahmat', role: 'ROLE_FINANCE_OFFICER' };
const sinta: Actor = { employeeId: 'emp-sinta', role: 'ROLE_DEPT_MANAGER' };
const ari: Actor = { employeeId: 'emp-ari', role: 'ROLE_HR_MANAGER' };

const travel: AdvanceDraft = {
  recipientEmployeeId: '',
  purposeTypeId: 'pt-1',
  amount: '2.500.000',
  travelStartDate: '2026-09-20',
  travelEndDate: '2026-09-22',
};

const receipts = (amounts: number[], prefix = 'NOTA'): SettlementDraft => ({
  isFinalStage: true,
  items: amounts.map((amount, index) => ({
    expenseDate: `2026-08-2${index + 4}`,
    amount: String(amount),
    receiptNo: `${prefix}-${index + 1}`,
    documentName: `nota-${index + 1}.pdf`,
  })),
});

beforeEach(() => {
  resetCashAdvanceMocks();
});

describe('Aturan murni', () => {
  it('open_advance_count menghitung SUBMITTED, APPROVED dan REPUDIATED', () => {
    expect(openAdvanceCount(ADVANCES, 'emp-budi')).toBe(2);
    expect(openAdvanceCount(ADVANCES, 'emp-maya')).toBe(1);
  });

  it('jenis tanpa batas hanya bisa dipilih bila diakui tak berbatas', () => {
    expect(purposeSelectable(PURPOSE_TYPES.find((row) => row.id === 'pt-4')!)).toBe(true);
    expect(purposeSelectable(PURPOSE_TYPES.find((row) => row.id === 'pt-5')!)).toBe(false);
  });

  it('nota sah lebih kecil ⇒ SURPLUS, lebih besar ⇒ SHORTFALL, sama ⇒ tanpa selisih', () => {
    expect(differenceOf(3_000_000, 2_850_000)).toEqual({ type: 'SURPLUS', amount: 150_000 });
    expect(differenceOf(2_000_000, 2_600_000)).toEqual({ type: 'SHORTFALL', amount: 600_000 });
    expect(differenceOf(2_000_000, 2_000_000)).toBeNull();
  });

  it('lapis tambahan menyala bila uang muka + kekurangan melewati batas jenis', () => {
    expect(needsExtraApproval({ amount: 4_500_000, maxAmountSnapshot: 5_000_000 }, 600_000)).toBe(true);
    expect(needsExtraApproval({ amount: 4_500_000, maxAmountSnapshot: 5_000_000 }, 400_000)).toBe(false);
    expect(needsExtraApproval({ amount: 4_500_000, maxAmountSnapshot: null }, 9_000_000)).toBe(false);
  });

  it('kemiripan = tanggal dan nominal sama dengan nomor berbeda atau kosong', () => {
    const base = { id: 'a', expenseDate: '2026-07-29', amount: 1_400_000, receiptNo: '' };
    expect(similarityWarnings([{ ...base, id: 'b', receiptNo: 'X-1' }], [base])).toHaveLength(1);
    expect(similarityWarnings([{ ...base, id: 'b', amount: 1_000 }], [base])).toHaveLength(0);
    expect(normalizeReceipt(' tb-makmur/2026 ')).toBe('TBMAKMUR2026');
  });
});

describe('5.1 Ajukan uang muka', () => {
  it('modul mati ditolak 422 FIN_MODULE_DISABLED', async () => {
    setCashAdvanceModuleEnabled(false);
    await expect(cashAdvanceService.submitAdvance(budi, travel)).rejects.toThrow(/422 FIN_MODULE_DISABLED/);
  });

  it('nominal di atas batas jenis ditolak FIN_CASH_ADVANCE_AMOUNT_EXCEEDED', async () => {
    await expect(cashAdvanceService.submitAdvance(budi, { ...travel, amount: '6.000.000' })).rejects.toThrow(
      /FIN_CASH_ADVANCE_AMOUNT_EXCEEDED/,
    );
  });

  it('jenis tanpa batas dan tanpa pengakuan ditolak (deny-by-default)', async () => {
    await expect(
      cashAdvanceService.submitAdvance(budi, { ...travel, purposeTypeId: 'pt-5', travelStartDate: '', travelEndDate: '' }),
    ).rejects.toThrow(/deny-by-default/);
  });

  it('tanggal dinas wajib untuk jenis dinas dan dilarang selain itu', async () => {
    await expect(cashAdvanceService.submitAdvance(budi, { ...travel, travelEndDate: '' })).rejects.toThrow(/wajib diisi/);
    await expect(cashAdvanceService.submitAdvance(budi, { ...travel, travelEndDate: '2026-09-19' })).rejects.toThrow(
      /sebelum tanggal mulai/,
    );
    await expect(cashAdvanceService.submitAdvance(budi, { ...travel, purposeTypeId: 'pt-3' })).rejects.toThrow(/dilarang/);
  });

  it('jatah uang muka terbuka penuh ditolak FIN_CASH_ADVANCE_LIMIT_EXCEEDED', async () => {
    await cashAdvanceService.submitAdvance(budi, travel);
    await expect(cashAdvanceService.submitAdvance(budi, travel)).rejects.toThrow(/FIN_CASH_ADVANCE_LIMIT_EXCEEDED/);
  });

  it('pintu atas nama hanya untuk Finance Officer', async () => {
    await expect(cashAdvanceService.submitAdvance(budi, { ...travel, recipientEmployeeId: 'emp-maya' })).rejects.toThrow(/403/);
    const row = await cashAdvanceService.submitAdvance(rahmat, { ...travel, recipientEmployeeId: 'emp-maya' });
    expect(row.recipientEmployeeId).toBe('emp-maya');
    expect(row.createdOnBehalfEmployeeId).toBe('emp-rahmat');
  });

  it('batas nominal dan jenis dinas dibekukan ke baris saat pengiriman', async () => {
    const row = await cashAdvanceService.submitAdvance(budi, travel);
    expect(row.status).toBe('SUBMITTED');
    expect(row.maxAmountSnapshot).toBe(5_000_000);
    expect(row.isOfficialTravelSnapshot).toBe(true);
  });
});

describe('5.4–5.6 Pintu keluar', () => {
  it('cancel di luar SUBMITTED ditolak 409 FIN_ALREADY_DECIDED', async () => {
    await expect(cashAdvanceService.cancelAdvance(budi, 'adv-86')).rejects.toThrow(/409 FIN_ALREADY_DECIDED/);
    const row = await cashAdvanceService.cancelAdvance(budi, 'adv-84');
    expect(row.status).toBe('CANCELLED');
  });

  it('cancel hanya oleh penerima atau pembuat', async () => {
    await expect(cashAdvanceService.cancelAdvance(sinta, 'adv-84')).rejects.toThrow(/403/);
  });

  it('bantahan hanya untuk pintu atas nama, dan hanya oleh penerima', async () => {
    await expect(cashAdvanceService.repudiateAdvance(budi, 'adv-84')).rejects.toThrow(/dibuatkan atas nama/);
    await expect(cashAdvanceService.repudiateAdvance(rahmat, 'adv-81')).rejects.toThrow(/403/);
    const row = await cashAdvanceService.repudiateAdvance(maya, 'adv-81');
    expect(row.status).toBe('REPUDIATED');
  });

  it('pembatalan dinas: jenis dinas + APPROVED, sebab wajib, tanpa gerbang persetujuan', async () => {
    await expect(cashAdvanceService.cancelTravel(maya, 'adv-81', 'x')).rejects.toThrow(/uang muka dinas/);
    await expect(cashAdvanceService.cancelTravel(budi, 'adv-86', '  ')).rejects.toThrow(/sebab/);
    const row = await cashAdvanceService.cancelTravel(budi, 'adv-86', 'Klien menunda kunjungan');
    expect(row.status).toBe('APPROVED');
    expect(row.travelCancelReason).toBe('Klien menunda kunjungan');
  });
});

describe('5.9–5.12 Pertanggungjawaban', () => {
  it('nomor nota yang sudah tercatat ditolak 409 FIN_DUPLICATE_RECEIPT', async () => {
    await expect(
      cashAdvanceService.submitSettlement(budi, 'adv-86', {
        isFinalStage: true,
        items: [{ expenseDate: '2026-08-24', amount: '500000', receiptNo: 'grb-trx-8820134', documentName: 'a.pdf' }],
      }),
    ).rejects.toThrow(/409 FIN_DUPLICATE_RECEIPT/);
  });

  it('tahap diberi settlement_no [request_no]#[stage]', async () => {
    const row = await cashAdvanceService.submitSettlement(budi, 'adv-86', receipts([1_200_000, 600_000]));
    expect(row.settlementNo).toBe('ADV-2026-000086#1');
    expect(row.status).toBe('SUBMITTED');
    expect(row.isCorrection).toBe(false);
  });

  it('review milik Finance Officer yang bukan pembuat atas nama', async () => {
    await expect(
      cashAdvanceService.reviewSettlement(sinta, 'stl-81', { flags: [], similarityAcknowledged: true }),
    ).rejects.toThrow(/403/);
    // adv-81 dibuat Rahmat atas nama Maya — Rahmat tidak boleh memeriksanya.
    await expect(
      cashAdvanceService.reviewSettlement(rahmat, 'stl-81', { flags: [], similarityAcknowledged: true }),
    ).rejects.toThrow(/pembuat atas nama/);
  });

  it('peringatan kemiripan wajib diakui sebelum diteruskan', async () => {
    const row = await cashAdvanceService.submitSettlement(budi, 'adv-86', {
      isFinalStage: true,
      items: [
        { expenseDate: '2026-08-24', amount: '700000', receiptNo: 'A-1', documentName: 'a.pdf' },
        { expenseDate: '2026-08-24', amount: '700000', receiptNo: '', documentName: 'b.pdf' },
      ],
    });
    expect(row.similarityWarnings).toHaveLength(1);
    await expect(
      cashAdvanceService.reviewSettlement(rahmat, row.id, { flags: [], similarityAcknowledged: false }),
    ).rejects.toThrow(/peringatan kemiripan/);
  });

  it('keputusan hanya oleh atasan langsung penerima, dengan guard UNDER_REVIEW', async () => {
    const row = await cashAdvanceService.submitSettlement(budi, 'adv-86', receipts([2_000_000]));
    await expect(cashAdvanceService.decideSettlement(sinta, row.id, 'APPROVE')).rejects.toThrow(/409 FIN_ALREADY_DECIDED/);
    await cashAdvanceService.reviewSettlement(rahmat, row.id, { flags: [], similarityAcknowledged: false });
    await expect(cashAdvanceService.decideSettlement(ari, row.id, 'APPROVE')).rejects.toThrow(/403/);
    await expect(cashAdvanceService.decideSettlement(sinta, row.id, 'APPROVE')).resolves.toEqual({ accepted: true });
  });

  it('keputusan 202 tidak menulis status; penyelesaian workflow yang menulisnya', async () => {
    const row = await cashAdvanceService.submitSettlement(budi, 'adv-86', receipts([2_000_000]));
    await cashAdvanceService.reviewSettlement(rahmat, row.id, { flags: [], similarityAcknowledged: false });
    await cashAdvanceService.decideSettlement(sinta, row.id, 'APPROVE');
    expect((await cashAdvanceService.settlements()).find((item) => item.id === row.id)?.status).toBe('UNDER_REVIEW');

    const difference = await cashAdvanceService.completeSettlementWorkflow(row.id, 'APPROVE', 'emp-sinta');
    expect(difference).toBeNull();
    expect((await cashAdvanceService.advances(budi)).find((item) => item.id === 'adv-86')?.status).toBe('SETTLED');
  });

  it('nota yang ditandai menjadi REJECTED dan sisanya dihitung sebagai SURPLUS', async () => {
    const row = await cashAdvanceService.submitSettlement(budi, 'adv-86', receipts([1_200_000, 500_000]));
    await cashAdvanceService.reviewSettlement(rahmat, row.id, {
      flags: [{ itemId: row.items[1].id, reasonId: 'rr-1' }],
      similarityAcknowledged: false,
    });
    const difference = await cashAdvanceService.completeSettlementWorkflow(row.id, 'APPROVE', 'emp-sinta');
    expect(difference).toMatchObject({ differenceType: 'SURPLUS', amount: 800_000, status: 'OPEN' });
    expect(difference?.dueDate).toBeTruthy();
  });

  it('kekurangan besar menyalakan lapis tambahan AWAITING_APPROVAL', async () => {
    const row = await cashAdvanceService.submitSettlement(budi, 'adv-86', receipts([3_000_000, 2_500_000]));
    await cashAdvanceService.reviewSettlement(rahmat, row.id, { flags: [], similarityAcknowledged: false });
    const difference = await cashAdvanceService.completeSettlementWorkflow(row.id, 'APPROVE', 'emp-sinta');
    // 2jt + kekurangan 3,5jt = 5,5jt > batas 5jt.
    expect(difference).toMatchObject({ differenceType: 'SHORTFALL', requiresExtraApproval: true, status: 'AWAITING_APPROVAL' });
  });
});

describe('5.14–5.15 Selisih', () => {
  it('cara pengembalian hanya untuk SURPLUS, catatan wajib bila di luar HRIS', async () => {
    await expect(cashAdvanceService.setSurplusMethod(rahmat, 'dif-78', 'PAYROLL_DEDUCTION', '')).rejects.toThrow(/422/);
    await expect(cashAdvanceService.setSurplusMethod(rahmat, 'dif-72', 'RETURNED_OUTSIDE_HRIS', '')).rejects.toThrow(/catatan/);
    await expect(cashAdvanceService.setSurplusMethod(budi, 'dif-72', 'PAYROLL_DEDUCTION', '')).rejects.toThrow(/403/);
    const row = await cashAdvanceService.setSurplusMethod(rahmat, 'dif-72', 'RETURNED_OUTSIDE_HRIS', 'Transfer balik 12 Agu');
    expect(row.status).toBe('SETTLED');
  });

  it('lapis tambahan oleh atasan berikutnya, beda dari pemutus tahap', async () => {
    const row = await cashAdvanceService.submitSettlement(budi, 'adv-86', receipts([3_000_000, 2_500_000]));
    await cashAdvanceService.reviewSettlement(rahmat, row.id, { flags: [], similarityAcknowledged: false });
    const difference = (await cashAdvanceService.completeSettlementWorkflow(row.id, 'APPROVE', 'emp-sinta'))!;

    await expect(cashAdvanceService.approveExtra(sinta, difference.id, 'APPROVE')).rejects.toThrow(/403/);
    await expect(cashAdvanceService.approveExtra(ari, difference.id, 'APPROVE')).resolves.toEqual({ accepted: true });
    expect((await cashAdvanceService.completeExtraWorkflow(difference.id, 'APPROVE')).status).toBe('APPROVED');
    await expect(cashAdvanceService.approveExtra(ari, difference.id, 'APPROVE')).rejects.toThrow(/409/);
  });
});
