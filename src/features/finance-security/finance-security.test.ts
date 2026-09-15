import { beforeEach, describe, expect, it } from 'vitest';
import {
  financeSecurityService,
  resetFinanceSecurityMocks,
} from '@/features/finance-security/services/finance-security.service';
import { activeHoldFor } from '@/features/finance-security/holds-store';
import { inRange, toCsv } from '@/features/finance-security/rules';
import { disbursementService, resetDisbursementMocks } from '@/features/disbursement/services/disbursement.service';
import { resetBenefitMocks } from '@/features/benefit/services/benefit.service';
import { resetLoanMocks } from '@/features/loan/services/loan.service';
import { resetCashAdvanceMocks } from '@/features/cash-advance/services/cash-advance.service';
import type { Actor, ExportScope } from '@/features/finance-security/types';

const rahmat: Actor = { employeeId: 'emp-rahmat', role: 'ROLE_FINANCE_OFFICER' };
const ari: Actor = { employeeId: 'emp-ari', role: 'ROLE_HR_MANAGER' };
const maya: Actor = { employeeId: 'emp-maya', role: 'ROLE_HEALTH_DATA_OFFICER' };
const sinta: Actor = { employeeId: 'emp-sinta', role: 'ROLE_DEPT_MANAGER' };

beforeEach(() => {
  resetFinanceSecurityMocks();
  resetDisbursementMocks();
  resetBenefitMocks();
  resetLoanMocks();
  resetCashAdvanceMocks();
});

describe('Aturan murni', () => {
  it('rentang tanggal inklusif atas bagian tanggal timestamp', () => {
    expect(inRange('2026-07-31T16:04:00+07:00', '2026-07-01', '2026-07-31')).toBe(true);
    expect(inRange('2026-08-01T00:00:00+07:00', '2026-07-01', '2026-07-31')).toBe(false);
  });

  it('CSV meng-quote nilai berkoma atau berkutip', () => {
    expect(toCsv(['a', 'b'], [['x,y', 'he said "hi"']])).toBe('a,b\n"x,y","he said ""hi"""');
  });
});

describe('F8.05–F8.07 Dispute hold', () => {
  it('search bawaan hanya aktif, terbaru dulu; Health Data Officer 403', async () => {
    expect((await financeSecurityService.holds(rahmat)).map((row) => row.id)).toEqual(['hold-21', 'hold-46']);
    expect(await financeSecurityService.holds(rahmat, { activeOnly: false })).toHaveLength(3);
    expect((await financeSecurityService.holds(ari, { targetType: 'LOAN' })).map((row) => row.id)).toEqual(['hold-21']);
    await expect(financeSecurityService.holds(maya)).rejects.toThrow(/403/);
  });

  it('pasang tanpa sebab: target wajib ada, hold aktif ganda 409, lalu menggerbang mark-paid', async () => {
    await expect(financeSecurityService.placeHold(sinta, { targetType: 'BENEFIT_CLAIM', targetId: 'clm-41' })).rejects.toThrow(/403/);
    await expect(financeSecurityService.placeHold(ari, { targetType: 'BENEFIT_CLAIM', targetId: 'clm-999' })).rejects.toThrow(/404/);
    await expect(financeSecurityService.placeHold(ari, { targetType: 'BENEFIT_CLAIM', targetId: 'clm-46' })).rejects.toThrow(
      /FIN_DISPUTE_HOLD_ALREADY_ACTIVE/,
    );

    const hold = await financeSecurityService.placeHold(ari, { targetType: 'BENEFIT_CLAIM', targetId: 'clm-41' });
    expect(hold).toMatchObject({
      targetRequestNo: 'CLM-2026-000041',
      isActive: true,
      createdBy: 'emp-ari',
      releasedReasonNote: null,
    });

    await expect(
      disbursementService.markPaid({ employeeId: 'emp-rahmat', role: 'ROLE_FINANCE_OFFICER' }, {
        items: [{ payableType: 'BENEFIT_CLAIM', payableId: 'clm-41' }],
        paymentMethod: 'BANK_TRANSFER',
        reasonNote: 'Transfer batch',
      }),
    ).rejects.toThrow(/FIN_DISPUTE_HOLD_ACTIVE/);
  });

  it('cabut: sebab wajib, is_active true 422, sudah dicabut 409, Finance Officer mengabari HR Manager', async () => {
    await expect(financeSecurityService.releaseHold(ari, 'hold-46', { isActive: false, releasedReasonNote: '  ' })).rejects.toThrow(/422/);
    await expect(financeSecurityService.releaseHold(ari, 'hold-46', { isActive: true, releasedReasonNote: 'x' })).rejects.toThrow(/422/);
    await expect(financeSecurityService.releaseHold(ari, 'hold-72', { isActive: false, releasedReasonNote: 'x' })).rejects.toThrow(
      /FIN_DISPUTE_HOLD_ALREADY_RELEASED/,
    );

    const result = await financeSecurityService.releaseHold(rahmat, 'hold-21', {
      isActive: false,
      releasedReasonNote: 'Sudah diklarifikasi dengan karyawan',
    });
    expect(result.notifiesHrManager).toBe(true);
    expect(result.hold).toMatchObject({ isActive: false, releasedBy: 'emp-rahmat', releasedAtTimezone: 'Asia/Jakarta' });
    expect(activeHoldFor('LOAN', 'loan-21')).toBeNull();

    const second = await financeSecurityService.releaseHold(ari, 'hold-46', { isActive: false, releasedReasonNote: 'Nota asli ditemukan' });
    expect(second.notifiesHrManager).toBe(false);
  });

  it('kandidat target menandai yang sedang on hold', async () => {
    const targets = await financeSecurityService.holdTargets(rahmat, 'BENEFIT_CLAIM');
    expect(targets.find((row) => row.targetId === 'clm-46')?.onHold).toBe(true);
    expect(targets.find((row) => row.targetId === 'clm-41')?.onHold).toBe(false);
  });
});

describe('F8.03–F8.04 Export', () => {
  it('HR Manager 403 pada ekspor dan jejaknya; scope asing 422', async () => {
    await expect(financeSecurityService.exportLogs(ari)).rejects.toThrow(/403/);
    await expect(
      financeSecurityService.runExport(ari, { scope: 'DISBURSEMENT', startDate: '2026-07-01', endDate: '2026-07-31' }),
    ).rejects.toThrow(/403/);
    await expect(
      financeSecurityService.runExport(rahmat, { scope: 'PAYROLL' as ExportScope, startDate: '', endDate: '' }),
    ).rejects.toThrow(/FIN_EXPORT_SCOPE_INVALID/);
  });

  it('isi berkas dari penanda Pencairan; jejak ditulis bersama', async () => {
    const result = await financeSecurityService.runExport(rahmat, {
      scope: 'DISBURSEMENT',
      startDate: '2026-07-01',
      endDate: '2026-07-31',
    });
    expect(result.log).toMatchObject({ rowCount: 2, filterCriteria: { start_date: '2026-07-01', end_date: '2026-07-31' } });
    expect(result.csv.split('\n')).toHaveLength(3);
    expect(await financeSecurityService.exportLogs(rahmat)).toHaveLength(4);
    expect(await financeSecurityService.exportLogs(rahmat, { startDate: '2026-07-31', endDate: '2026-07-31' })).toHaveLength(1);
  });

  it('scope pengajuan membaca modul sumber per tanggal pengajuan', async () => {
    const result = await financeSecurityService.runExport(rahmat, { scope: 'LOAN', startDate: '2026-07-01', endDate: '2026-07-31' });
    expect(result.log?.rowCount).toBe(2);
  });
});

describe('F8.01–F8.02 Medical access', () => {
  it('jejak ditinjau HR Manager; pembuka (Health Data Officer) dan Finance Officer 403', async () => {
    const rows = await financeSecurityService.medicalAccessLogs(ari);
    expect(rows.map((row) => row.id)).toEqual(['mdl-2', 'mdl-1', 'mdl-3']);
    expect(rows.find((row) => row.id === 'mdl-1')).toMatchObject({ claimRequestNo: 'CLM-2026-000045', createdBy: 'emp-maya' });
    await expect(financeSecurityService.medicalAccessLogs(maya)).rejects.toThrow(/403/);
    await expect(financeSecurityService.medicalAccessLogs(rahmat)).rejects.toThrow(/403/);
  });

  it('membuka lampiran menulis jejak; 403 dan 404 tidak menulis apa pun', async () => {
    await expect(financeSecurityService.openMedicalDocument(rahmat, 'clm-45', 'ci-45-1')).rejects.toThrow(/403/);
    await expect(financeSecurityService.openMedicalDocument(maya, 'clm-41', 'ci-41-1')).rejects.toThrow(/404/);
    const opened = await financeSecurityService.openMedicalDocument(maya, 'clm-45', 'ci-45-1');
    expect(opened.documentId).toBe('doc-rs-melati-0231');

    const rows = await financeSecurityService.medicalAccessLogs(ari, { claimItemId: 'ci-45-1' });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ employeeId: 'emp-budi', createdBy: 'emp-maya' });
  });
});
