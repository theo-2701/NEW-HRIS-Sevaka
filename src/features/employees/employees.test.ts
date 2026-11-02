import { employeeService } from '@/features/employees/services/employee.service';
import { detailErrorKind } from '@/features/employees/detailError';
import { ApiError } from '@/services/api';
import { describe, expect, it } from 'vitest';
import { employeeSearchSchema } from '@/features/employees/validation';
import { maskAccountHolder, maskAccountNumber, maskNik } from '@/features/employees/masking';

describe('validasi kriteria pencarian karyawan', () => {
  const base = { keyword: '', branchId: '', createdFrom: '', createdTo: '', employmentStatus: [] };

  it('menolak karakter skrip pada keyword (§8.6)', async () => {
    await expect(employeeSearchSchema.validate({ ...base, keyword: '<script>' })).rejects.toThrow(
      /tidak diperbolehkan/,
    );
  });

  it('menerima keyword biasa', async () => {
    await expect(employeeSearchSchema.validate({ ...base, keyword: 'NIK-0005' })).resolves.toBeTruthy();
  });

  it('menolak keyword lebih dari 150 karakter', async () => {
    await expect(employeeSearchSchema.validate({ ...base, keyword: 'a'.repeat(151) })).rejects.toThrow(
      /150 karakter/,
    );
  });

  it('menolak rentang tanggal terbalik', async () => {
    await expect(
      employeeSearchSchema.validate({ ...base, createdFrom: '2026-05-01', createdTo: '2026-04-01' }),
    ).rejects.toThrow(/mendahului/);
  });
});

describe('masking PII karyawan (UIC §1.8)', () => {
  it('menampilkan NIK utuh untuk scope HR', () => {
    expect(maskNik('NIK-0005', 'HR', false)).toBe('NIK-0005');
  });

  it('menyamarkan NIK subjek lain untuk scope non-HR', () => {
    expect(maskNik('NIK-0005', 'DEPT', false)).toBe('NIK-••••05');
  });

  it('tidak menyamarkan NIK milik sendiri', () => {
    expect(maskNik('NIK-0001', 'SELF', true)).toBe('NIK-0001');
  });

  it('hanya menampilkan 4 digit terakhir rekening subjek lain', () => {
    expect(maskAccountNumber('8830041562', false)).toBe('•••• •••• 1562');
    expect(maskAccountNumber('8830041562', true)).toBe('8830041562');
  });

  it('menyamarkan nama pemilik rekening subjek lain', () => {
    expect(maskAccountHolder('Eka Saputra', false)).toBe('Eka •••');
    expect(maskAccountHolder('Eka Saputra', true)).toBe('Eka Saputra');
  });
});

describe('DIR-DETAIL — keadaan galat (T13) dan Edit Work Data (T31)', () => {
  it('membedakan 404, 403 aturan cabang, dan 503', async () => {
    await expect(employeeService.getById('nope')).rejects.toSatisfy((e) => detailErrorKind(e) === 'NOT_FOUND');
    await expect(employeeService.getById('emp-branch-rule')).rejects.toSatisfy(
      (e) => detailErrorKind(e) === 'BRANCH_RULE',
    );
    await expect(employeeService.getById('emp-unavailable')).rejects.toSatisfy(
      (e) => detailErrorKind(e) === 'UNAVAILABLE',
    );
    expect(detailErrorKind(new ApiError('Forbidden', 403))).toBe('NOT_FOUND');
  });

  it('menyimpan subset-field dan menolak rekening tanpa bank', async () => {
    await expect(
      employeeService.updateWorkData('emp-eka', { accountNumber: '1234567890' }, 'HR_STAFF'),
    ).rejects.toThrow(/bank/);
    await expect(employeeService.updateWorkData('emp-eka', { sbu: 'SBU Barat' }, 'EMPLOYEE')).rejects.toThrow();
    const row = await employeeService.updateWorkData('emp-eka', { sbu: 'SBU Barat', workStatusId: 'ws-1' }, 'HR_STAFF');
    expect(row.sbu).toBe('SBU Barat');
    expect(row.workStatusId).toBe('ws-1');
    expect(row.costCenter).toBe('CC-FIN-PPA');
  });
});
