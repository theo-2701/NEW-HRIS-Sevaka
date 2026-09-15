import { beforeEach, describe, expect, it } from 'vitest';
import { financeSettingsService } from '@/features/finance-settings/services/finance-settings.service';
import { resetSettingsStore } from '@/features/finance-settings/settings-store';
import { formatDelta, nameError, reasonError } from '@/features/finance-settings/rules';
import { loanService, resetLoanMocks } from '@/features/loan/services/loan.service';
import { cashAdvanceService, resetCashAdvanceMocks } from '@/features/cash-advance/services/cash-advance.service';
import type { Actor } from '@/features/finance-settings/types';

const rahmat: Actor = { employeeId: 'emp-rahmat', role: 'ROLE_FINANCE_OFFICER' };
const ari: Actor = { employeeId: 'emp-ari', role: 'ROLE_HR_MANAGER' };
const budi: Actor = { employeeId: 'emp-budi', role: 'ROLE_EMPLOYEE' };
const sinta: Actor = { employeeId: 'emp-sinta', role: 'ROLE_DEPT_MANAGER' };

beforeEach(() => {
  resetSettingsStore();
  resetLoanMocks();
  resetCashAdvanceMocks();
});

describe('Aturan murni', () => {
  it('FIN1: 2–batas karakter, jangkar alfanumerik, tanpa markup', () => {
    expect(nameError('Dinas Luar Kota', 150)).toBeNull();
    expect(nameError('A', 150)).toBeTruthy();
    expect(nameError('<script>', 150)).toBeTruthy();
    expect(nameError('x'.repeat(101), 100)).toBeTruthy();
  });

  it('FIN2: wajib, ≤2000, tolak < dan >', () => {
    expect(reasonError('  ')).toBeTruthy();
    expect(reasonError('<b>alasan</b>')).toBeTruthy();
    expect(reasonError('Typo saat input awal')).toBeNull();
  });

  it('delta nominal bertanda', () => {
    expect(formatDelta(30_000_000, 32_000_000)).toBe('+ Rp 2.000.000');
    expect(formatDelta(30_000_000, 30_000_000)).toBeNull();
  });
});

describe('Loan limit (F1.25–F1.29)', () => {
  it('search urut golongan; Employee membaca (PROB-FRONTEND-018), Dept Manager 403', async () => {
    expect((await financeSettingsService.loanLimits(rahmat)).map((row) => row.id)).toEqual(['ll-1', 'll-2', 'll-3', 'll-4', 'll-5']);
    expect(await financeSettingsService.loanLimits(budi, { isActive: false })).toHaveLength(1);
    await expect(financeSettingsService.loanLimits(sinta)).rejects.toThrow(/403/);
  });

  it('create: tulis Finance Officer saja, golongan wajib, satu baris per golongan (409)', async () => {
    await expect(financeSettingsService.createLoanLimit(ari, { jobGradeId: 'jg-mgr-2', limitAmount: '50.000.000' })).rejects.toThrow(/403/);
    await expect(financeSettingsService.createLoanLimit(rahmat, { jobGradeId: '', limitAmount: '1' })).rejects.toThrow(/422/);
    await expect(financeSettingsService.createLoanLimit(rahmat, { jobGradeId: 'jg-mgr-2', limitAmount: '' })).rejects.toThrow(/422/);
    await expect(financeSettingsService.createLoanLimit(rahmat, { jobGradeId: 'jg-staff-2', limitAmount: '1' })).rejects.toThrow(/409/);
    await expect(financeSettingsService.createLoanLimit(rahmat, { jobGradeId: 'jg-mgr-1', limitAmount: '1' })).rejects.toThrow(/409/);
    const row = await financeSettingsService.createLoanLimit(rahmat, { jobGradeId: 'jg-mgr-2', limitAmount: '0' });
    expect(row).toMatchObject({ jobGradeId: 'jg-mgr-2', limitAmount: 0, isActive: true });
  });

  it('update langsung dibaca layar Loan; nonaktif menutup ruang pinjam', async () => {
    await financeSettingsService.updateLoanLimit(rahmat, 'll-2', { limitAmount: '32.000.000', isActive: true });
    expect((await loanService.exposure()).limitAmount).toBe(32_000_000);
    await financeSettingsService.updateLoanLimit(rahmat, 'll-2', { limitAmount: '32.000.000', isActive: false });
    expect((await loanService.exposure()).limitAmount).toBe(0);
  });

  it('soft-delete: baris hilang dari daftar, golongan bisa dibuat ulang', async () => {
    await financeSettingsService.deleteLoanLimit(rahmat, 'll-5');
    expect((await financeSettingsService.loanLimits(rahmat)).map((row) => row.id)).not.toContain('ll-5');
    await expect(financeSettingsService.updateLoanLimit(rahmat, 'll-5', { limitAmount: '1', isActive: true })).rejects.toThrow(/404/);
    await expect(financeSettingsService.createLoanLimit(rahmat, { jobGradeId: 'jg-mgr-1', limitAmount: '80.000.000' })).resolves.toBeTruthy();
  });
});

describe('Advance purpose type (F1.36–F1.41)', () => {
  it('create: nama FIN1, max_amount > 0 atau kosong, nama aktif unik', async () => {
    await expect(
      financeSettingsService.createPurposeType(rahmat, { name: '<x>', isOfficialTravel: false, requiresReceipt: true, maxAmount: null, isUnlimitedAck: false }),
    ).rejects.toThrow(/422/);
    await expect(
      financeSettingsService.createPurposeType(rahmat, { name: 'Jamuan Tamu', isOfficialTravel: false, requiresReceipt: true, maxAmount: 0, isUnlimitedAck: false }),
    ).rejects.toThrow(/422/);
    await expect(
      financeSettingsService.createPurposeType(rahmat, { name: 'dinas luar kota', isOfficialTravel: true, requiresReceipt: true, maxAmount: 1, isUnlimitedAck: false }),
    ).rejects.toThrow(/409/);
    const row = await financeSettingsService.createPurposeType(rahmat, {
      name: '  Jamuan   Tamu ',
      isOfficialTravel: false,
      requiresReceipt: true,
      maxAmount: null,
      isUnlimitedAck: false,
    });
    expect(row.name).toBe('Jamuan Tamu');
    expect((await cashAdvanceService.purposeTypes()).some((item) => item.id === row.id)).toBe(true);
  });

  it('reason wajib hanya bila penanda dinas berubah; perubahan berjejak', async () => {
    await expect(financeSettingsService.updatePurposeType(rahmat, 'pt-1', { isOfficialTravel: false })).rejects.toThrow(
      /FIN_REASON_REQUIRED/,
    );
    await financeSettingsService.updatePurposeType(rahmat, 'pt-3', { maxAmount: 12_000_000 });
    await financeSettingsService.updatePurposeType(rahmat, 'pt-1', {
      isOfficialTravel: false,
      reason: 'Kebijakan region timur berubah',
    });
    const history = await financeSettingsService.purposeTypeHistory(ari, 'pt-1');
    expect(history).toMatchObject([{ changedField: 'isOfficialTravel', valueBefore: 'true', valueAfter: 'false', activity: 'U' }]);
    await expect(financeSettingsService.purposeTypeHistory(budi, 'pt-1')).rejects.toThrow(/403/);
  });

  it('jenis yang dinonaktifkan tidak bisa dipakai mengajukan uang muka', async () => {
    await financeSettingsService.updatePurposeType(rahmat, 'pt-1', { isActive: false });
    const employee = { employeeId: 'emp-maya', role: 'ROLE_EMPLOYEE' } as const;
    await expect(
      cashAdvanceService.submitAdvance(employee, {
        recipientEmployeeId: '',
        purposeTypeId: 'pt-1',
        amount: '1.000.000',
        travelStartDate: '2026-09-20',
        travelEndDate: '2026-09-21',
      }),
    ).rejects.toThrow(/422/);
  });
});

describe('Rejection reasons (F1.43–F1.47)', () => {
  it('tepat satu bawaan sistem; baris baru selalu bukan bawaan', async () => {
    expect((await financeSettingsService.rejectionReasons(budi)).filter((row) => row.isSystemDefault).map((row) => row.id)).toEqual(['rr-5']);
    const row = await financeSettingsService.createRejectionReason(rahmat, { name: 'Duplicate request', requiresFreeText: false });
    expect(row.isSystemDefault).toBe(false);
    const updated = await financeSettingsService.updateRejectionReason(rahmat, row.id, { isSystemDefault: true, requiresFreeText: true });
    expect(updated).toMatchObject({ isSystemDefault: false, requiresFreeText: true });
  });

  it('hapus baris bawaan 422; baris kustom soft-delete', async () => {
    await expect(financeSettingsService.deleteRejectionReason(rahmat, 'rr-5')).rejects.toThrow(/FIN_REJECTION_REASON_SYSTEM_DEFAULT/);
    await financeSettingsService.deleteRejectionReason(rahmat, 'rr-6');
    expect((await financeSettingsService.rejectionReasons(rahmat)).map((row) => row.id)).not.toContain('rr-6');
    await expect(financeSettingsService.deleteRejectionReason(ari, 'rr-1')).rejects.toThrow(/403/);
  });
});
