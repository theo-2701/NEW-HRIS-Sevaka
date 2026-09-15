import { beforeEach, describe, expect, it } from 'vitest';
import { disbursementService, resetDisbursementMocks } from '@/features/disbursement/services/disbursement.service';
import { benefitService, resetBenefitMocks } from '@/features/benefit/services/benefit.service';
import { loanService, resetLoanMocks } from '@/features/loan/services/loan.service';
import { cashAdvanceService, resetCashAdvanceMocks } from '@/features/cash-advance/services/cash-advance.service';
import { activeMarks, buildPayableRows, noteError } from '@/features/disbursement/rules';
import type { Actor, DisbursementMark, PayableKey, PayableSource, PayableType } from '@/features/disbursement/types';

const rahmat: Actor = { employeeId: 'emp-rahmat', role: 'ROLE_FINANCE_OFFICER' };
const ari: Actor = { employeeId: 'emp-ari', role: 'ROLE_HR_MANAGER' };
const admin: Actor = { employeeId: 'emp-admin', role: 'ROLE_SUPER_ADMIN' };
const budi: Actor = { employeeId: 'emp-budi', role: 'ROLE_EMPLOYEE' };
const note = 'Transfer batch mingguan';
const key = (payableType: PayableType, payableId: string): PayableKey => ({ payableType, payableId });
const ids = (rows: { payableId: string }[]) => rows.map((row) => row.payableId).sort();

beforeEach(() => {
  resetDisbursementMocks();
  resetBenefitMocks();
  resetLoanMocks();
  resetCashAdvanceMocks();
});

describe('Aturan murni', () => {
  const source: PayableSource = {
    payableType: 'LOAN', payableId: 'l-1', requestNo: 'LON-2026-000001', employeeId: 'emp-budi',
    amount: 1_000_000, submittedAt: '2026-07-01', eligible: true,
  };
  const mark: DisbursementMark = {
    id: 'm-1', actionId: 'a-1', payableType: 'LOAN', payableId: 'l-1', requestNoSnapshot: 'LON-2026-000001',
    amount: 1_000_000, paymentMethod: 'CASH', markSource: 'MANUAL', markedAt: '2026-07-02', markedAtTimezone: 'Asia/Jakarta',
    actualPaidAt: null, reasonNote: 'tunai', reversalOfMarkId: null, createdBy: 'emp-rahmat',
  };

  it('anti-join dua tingkat: tanda yang dibalik tidak lagi aktif', () => {
    expect(buildPayableRows([source], [mark])[0].markStatus).toBe('MARKED');
    const reversal = { ...mark, id: 'm-2', reversalOfMarkId: 'm-1' };
    expect(activeMarks([mark, reversal])).toEqual([]);
    expect(buildPayableRows([source], [mark, reversal])[0].markStatus).toBe('UNMARKED');
    expect(buildPayableRows([{ ...source, eligible: false }], [mark, reversal])).toEqual([]);
  });

  it('catatan wajib non-kosong setelah trim, maksimal 500 karakter', () => {
    expect(noteError('   ')).toBeTruthy();
    expect(noteError('a'.repeat(501))).toBeTruthy();
    expect(noteError('Koreksi cara pembayaran')).toBeNull();
  });
});

describe('1 Search & akses', () => {
  it('bawaan UNMARKED diturunkan hidup dari Benefit, Loan, dan Cash Advance', async () => {
    expect(ids(await disbursementService.search(rahmat))).toEqual(['adv-81', 'adv-86', 'clm-41', 'dif-78']);
    expect(ids(await disbursementService.search(rahmat, { markStatus: 'MARKED' }))).toEqual(['clm-45', 'loan-12']);
  });

  it('uang muka atas nama memakai penerima, bukan pembuat', async () => {
    const row = (await disbursementService.search(rahmat)).find((item) => item.payableId === 'adv-81');
    expect(row?.employeeId).toBe('emp-maya');
  });

  it('Employee nol akses; HR Manager membaca tapi tidak menandai', async () => {
    await expect(disbursementService.search(budi)).rejects.toThrow(/403/);
    await expect(disbursementService.search(ari)).resolves.toHaveLength(4);
    await expect(disbursementService.preview(ari, [key('BENEFIT_CLAIM', 'clm-41')])).rejects.toThrow(/403/);
    await expect(
      disbursementService.markPaid(ari, { items: [key('BENEFIT_CLAIM', 'clm-41')], paymentMethod: 'CASH', reasonNote: note }),
    ).rejects.toThrow(/403/);
  });

  it('filter: whitelist request_no, jenis IN, rentang tanggal pada marked_at bila MARKED', async () => {
    await expect(disbursementService.search(rahmat, { requestNo: '<script>' })).rejects.toThrow(/400/);
    expect(ids(await disbursementService.search(rahmat, { payableTypes: ['CASH_ADVANCE'] }))).toEqual(['adv-81', 'adv-86']);
    const late = await disbursementService.search(rahmat, { markStatus: 'MARKED', startDate: '2026-07-20', endDate: '2026-07-31' });
    expect(ids(late)).toEqual(['loan-12']);
  });

  it('klaim yang disetujui di Benefit langsung muncul sebagai UNMARKED', async () => {
    await benefitService.completeClaimWorkflow('clm-46', 'APPROVED');
    expect(ids(await disbursementService.search(rahmat, { payableTypes: ['BENEFIT_CLAIM'] }))).toEqual(['clm-41', 'clm-46']);
  });
});

describe('3–4 Preview & mark paid', () => {
  it('201 — baris keluar dari daftar kerja dan terbaca di riwayat Benefit', async () => {
    const result = await disbursementService.markPaid(rahmat, {
      items: [key('BENEFIT_CLAIM', 'clm-41')],
      paymentMethod: 'BANK_TRANSFER',
      reasonNote: note,
    });
    expect(result).toMatchObject({ markedCount: 1, totalAmount: 1_500_000 });
    expect(ids(await disbursementService.search(rahmat))).not.toContain('clm-41');
    const history = await benefitService.disbursements();
    expect(history.find((row) => row.payableId === 'clm-41')).toMatchObject({
      markStatus: 'MARKED',
      mark: { paymentMethod: 'BANK_TRANSFER', markSource: 'MANUAL' },
    });
  });

  it('422 — metode dan catatan wajib', async () => {
    const items = [key('BENEFIT_CLAIM', 'clm-41')];
    await expect(disbursementService.markPaid(rahmat, { items, paymentMethod: '', reasonNote: note })).rejects.toThrow(/422/);
    await expect(disbursementService.markPaid(rahmat, { items, paymentMethod: 'CASH', reasonNote: '  ' })).rejects.toThrow(/422/);
  });

  it('preview menampilkan baris gagal gerbang; mark-paid atomik', async () => {
    await benefitService.completeClaimWorkflow('clm-46', 'APPROVED');
    const preview = await disbursementService.preview(rahmat, [
      key('BENEFIT_CLAIM', 'clm-41'),
      key('BENEFIT_CLAIM', 'clm-46'),
      key('BENEFIT_CLAIM', 'clm-45'),
    ]);
    expect(preview.resolvedItems.map((row) => row.payableId)).toEqual(['clm-41']);
    expect(preview.unresolvedItems.map((row) => row.rejectReason)).toEqual([
      'FIN_DISPUTE_HOLD_ACTIVE',
      expect.stringMatching(/Sudah ditandai/),
    ]);

    await expect(
      disbursementService.markPaid(rahmat, {
        items: [key('BENEFIT_CLAIM', 'clm-41'), key('BENEFIT_CLAIM', 'clm-46')],
        paymentMethod: 'CASH',
        reasonNote: note,
      }),
    ).rejects.toThrow(/FIN_DISPUTE_HOLD_ACTIVE/);
    expect(ids(await disbursementService.search(rahmat))).toContain('clm-41');
  });

  it('WITH_PAYROLL hanya untuk pinjaman yang potongannya sudah dikonfirmasi payroll', async () => {
    await expect(
      disbursementService.markPaid(rahmat, { items: [key('BENEFIT_CLAIM', 'clm-41')], paymentMethod: 'WITH_PAYROLL', reasonNote: note }),
    ).rejects.toThrow(/FIN_PAYROLL_CONFIRMATION_REQUIRED/);

    await loanService.acknowledgeSchedule('loan-18', 'ACK');
    expect(ids(await disbursementService.search(rahmat, { payableTypes: ['LOAN'] }))).toEqual(['loan-18']);
    await expect(
      disbursementService.markPaid(rahmat, { items: [key('LOAN', 'loan-18')], paymentMethod: 'WITH_PAYROLL', reasonNote: note }),
    ).rejects.toThrow(/FIN_PAYROLL_CONFIRMATION_REQUIRED/);
    await expect(
      disbursementService.markPaid(rahmat, { items: [key('LOAN', 'loan-18')], paymentMethod: 'BANK_TRANSFER', reasonNote: note }),
    ).resolves.toMatchObject({ markedCount: 1 });
  });

  it('CASH_ADVANCE menutup jendela bantahan; SHORTFALL menuntaskan selisih', async () => {
    await disbursementService.markPaid(rahmat, {
      items: [key('CASH_ADVANCE', 'adv-81'), key('CASH_ADVANCE_SHORTFALL', 'dif-78')],
      paymentMethod: 'BANK_TRANSFER',
      reasonNote: note,
    });
    const maya = { employeeId: 'emp-maya', role: 'ROLE_EMPLOYEE' } as const;
    await expect(cashAdvanceService.repudiateAdvance(maya, 'adv-81', 'Bukan pengajuan saya')).rejects.toThrow(/ditandai cair/);
    expect((await cashAdvanceService.differences()).find((row) => row.id === 'dif-78')?.status).toBe('SETTLED');
  });
});

describe('5 Reverse', () => {
  it('pembalik mewarisi payable; kedua kali 409; baris pembalik tidak bisa dibalik', async () => {
    await expect(disbursementService.reverseMark(rahmat, 'mark-claim-000045-1', '  ')).rejects.toThrow(/422/);
    const row = await disbursementService.reverseMark(rahmat, 'mark-claim-000045-1', 'Salah pilih cara bayar');
    expect(row).toMatchObject({
      payableType: 'BENEFIT_CLAIM',
      payableId: 'clm-45',
      reversalOfMarkId: 'mark-claim-000045-1',
      markSource: 'MANUAL',
    });
    expect(ids(await disbursementService.search(rahmat))).toContain('clm-45');

    await expect(disbursementService.reverseMark(rahmat, 'mark-claim-000045-1', 'lagi')).rejects.toThrow(
      /FIN_REVERSAL_TARGET_ALREADY_REVERSED/,
    );
    await expect(disbursementService.reverseMark(rahmat, row.id, 'lagi')).rejects.toThrow(/422/);

    const detail = await disbursementService.detail(rahmat, key('BENEFIT_CLAIM', 'clm-45'));
    expect(detail.history.find((mark) => mark.id === 'mark-claim-000045-1')?.reversedBy).toBe(row.id);
  });

  it('membalik tanda uang muka membuka lagi jendela bantahan', async () => {
    const result = await disbursementService.markPaid(rahmat, {
      items: [key('CASH_ADVANCE', 'adv-81')],
      paymentMethod: 'CASH',
      reasonNote: note,
    });
    await disbursementService.reverseMark(rahmat, result.marks[0].disbursementMarkId, 'Salah baris');
    const officer = { employeeId: 'emp-rahmat', role: 'ROLE_FINANCE_OFFICER' } as const;
    expect((await cashAdvanceService.advances(officer)).find((row) => row.id === 'adv-81')?.disbursementMarked).toBe(false);
  });
});

describe('6–8 Status tanggungan', () => {
  it('search: filter status, dan nol akses Employee', async () => {
    expect((await disbursementService.clearances(ari, { status: 'OUTSTANDING' })).map((row) => row.id)).toEqual([
      'oc-budi-santoso-1',
    ]);
    await expect(disbursementService.clearances(budi)).rejects.toThrow(/403/);
  });

  it('declare-settled: Finance Officer & HR Manager saja, catatan wajib, terminal', async () => {
    await expect(disbursementService.declareSettled(admin, 'oc-budi-santoso-1', note)).rejects.toThrow(/403/);
    await expect(disbursementService.declareSettled(budi, 'oc-budi-santoso-1', note)).rejects.toThrow(/403/);
    await expect(disbursementService.declareSettled(ari, 'oc-budi-santoso-1', '')).rejects.toThrow(/422/);

    const row = await disbursementService.declareSettled(
      ari,
      'oc-budi-santoso-1',
      'Dihapusbukukan, nominal di bawah ambang penagihan',
    );
    expect(row).toMatchObject({ status: 'DECLARED_SETTLED', updatedBy: 'emp-ari' });
    expect(row.resolvedAt).toBeTruthy();

    await expect(disbursementService.declareSettled(rahmat, 'oc-budi-santoso-1', note)).rejects.toThrow(
      /FIN_OUTSTANDING_ALREADY_RESOLVED/,
    );
    await expect(disbursementService.declareSettled(rahmat, 'oc-maya-1', note)).rejects.toThrow(/409/);
  });
});
