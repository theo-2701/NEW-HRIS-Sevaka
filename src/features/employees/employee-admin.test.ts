import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/store/auth.store';
import {
  changeEmployeeRole,
  employeeRole,
  employeeService,
  updateWorkData,
} from '@/features/employees/services/employee.service';

const as = (role: string) => useAuthStore.setState({ user: { id: 'u', name: 'Tony Stark', email: 't@ptdika.co.id', role } });

beforeEach(() => as('ROLE_HR_MANAGER'));

describe('Edit Work Data (FSD-001-EMPLOYEE 0.83 §1, TSD §7.2.5)', () => {
  it('badan kosong 422; cabang pegawai berkursi bercabang 422; rekening wajib berbank', async () => {
    await expect(updateWorkData('emp-eka', {})).rejects.toThrow(/No changes/);
    await expect(updateWorkData('emp-eka', { branchId: 'br-jkt' })).rejects.toThrow(/follows the position/);
    await expect(updateWorkData('emp-eka', { accountNumber: '1234567' })).rejects.toThrow(/bank/);
  });

  it('menyimpan hanya medan yang diubah; pegawai tanpa kursi bercabang boleh pindah cabang', async () => {
    await updateWorkData('emp-eka', { workStatusId: 'ws-contract', bankCode: 'bni', accountNumber: '9988776655', accountHolderName: 'Eka Saputra' });
    const eka = await employeeService.getById('emp-eka');
    expect(eka).toMatchObject({ workStatusId: 'ws-contract', bank: { bankCode: 'bni', accountNumber: '9988776655' } });
    await updateWorkData('emp-nur', { branchId: 'br-bdg' });
    expect((await employeeService.getById('emp-nur')).branchName).toBe('BR-Bandung');
  });
});

describe('Change Role (§15, TSD §7.4.14)', () => {
  it('diri sendiri 403; karyawan tidak aktif 422; peran di luar hak 403; peran sama = tidak berubah', async () => {
    await expect(changeEmployeeRole('emp-tony', 'ROLE_HR_STAFF')).rejects.toThrow(/own role/);
    await expect(changeEmployeeRole('emp-sari', 'ROLE_GA_STAFF')).rejects.toThrow(/active employee/);
    await expect(changeEmployeeRole('emp-lia', 'ROLE_SUPER_ADMIN')).rejects.toThrow(/^403/);
    expect(await changeEmployeeRole('emp-doni', 'ROLE_GA_STAFF')).toBe(false);
  });

  it('HR Manager mengubah Employee → Department Manager', async () => {
    expect(await employeeRole('emp-nur')).toBe('ROLE_EMPLOYEE');
    expect(await changeEmployeeRole('emp-nur', 'ROLE_DEPARTMENT_MANAGER')).toBe(true);
    expect(await employeeRole('emp-nur')).toBe('ROLE_DEPARTMENT_MANAGER');
  });
});
