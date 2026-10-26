import { describe, expect, it } from 'vitest';
import { DETAIL_DEMO_ERRORS, detailErrorKind } from '@/features/employees/detailError';
import { employeeService } from '@/features/employees/services/employee.service';

describe('Keadaan galat layar Detail pegawai (UIC-EMPLOYEE 0.76 §2.2)', () => {
  it('membedakan aturan cabang, layanan tak tersedia, dan tidak ditemukan', () => {
    expect(detailErrorKind(new Error(DETAIL_DEMO_ERRORS['emp-branch-rule']))).toBe('branch-rule');
    expect(detailErrorKind(new Error(DETAIL_DEMO_ERRORS['emp-unavailable']))).toBe('unavailable');
    expect(detailErrorKind(new Error('Network Error'))).toBe('unavailable');
    expect(detailErrorKind(new Error('404 — Employee not found.'))).toBe('not-found');
    // 403 selain aturan cabang tetap anti-enumeration.
    expect(detailErrorKind(new Error('403 — Outside your access.'))).toBe('not-found');
  });

  it('mode dummy: id contoh melempar galat yang dipetakan layar', async () => {
    await expect(employeeService.getById('emp-branch-rule')).rejects.toThrow(/branch setup rule/);
    await expect(employeeService.getById('emp-unavailable')).rejects.toThrow(/^503/);
  });
});
