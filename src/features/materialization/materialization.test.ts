import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/store/auth.store';
import { materializationService } from '@/features/materialization/services/materialization.service';
import { setupStatus } from '@/features/materialization/types';

const as = (role: string) => useAuthStore.setState({ user: { id: 'u', name: 'Tony Stark', email: 't@ptdika.co.id', role } });

beforeEach(() => as('ROLE_HR_MANAGER'));

describe('Materialization (FSD-001-EMPLOYEE 0.83 §17, §21)', () => {
  it('status: kurang dari 2 orang = Incomplete; orang nonaktif = Understaffed', async () => {
    const rows = await materializationService.search();
    expect(rows.find((row) => row.id === 'mz-trf-promo')?.status).toBe('INCOMPLETE');
    // Sari Dewanti (SUSPENDED) menjadi penyetuju Onboarding default.
    expect(rows.find((row) => row.id === 'mz-onb-default')?.status).toBe('UNDERSTAFFED');
    expect((await materializationService.coverage()).understaffed).toBeGreaterThan(0);
  });

  it('simpan: validasi 2 orang, petugas ≠ penyetuju, item terkunci; versi baru tercatat di riwayat', async () => {
    const setup = await materializationService.get('mz-onb-default');
    const payroll = setup.sections.MAIN!.find((task) => task.name.startsWith('Payroll'))!;
    const original = structuredClone(setup);

    payroll.approvers = [payroll.handlers[0], payroll.approvers[1]];
    await expect(materializationService.save(setup)).rejects.toThrow(/both a handler and an approver/);

    const eligible = await materializationService.eligible(setup);
    const replacement = eligible.find((p) => !payroll.handlers.some((h) => h.employeeId === p.employeeId))!;
    const fixed = structuredClone(original);
    const task = fixed.sections.MAIN!.find((item) => item.name.startsWith('Payroll'))!;
    task.approvers = [replacement, original.sections.MAIN!.find((item) => item.name.startsWith('Payroll'))!.approvers[1]];
    const saved = await materializationService.save(fixed);
    expect(saved.version).toBe(4);
    const history = await materializationService.history('mz-onb-default');
    expect(history[0]).toMatchObject({ version: 4, action: 'Updated' });

    const locked = structuredClone(saved);
    locked.sections.MAIN = locked.sections.MAIN!.filter((item) => !item.locked);
    await expect(materializationService.save(locked)).rejects.toThrow(/HRIS access/);
  });

  it('pemilih petugas: hanya role yang dipetakan dan cabang setup (Onboarding/Offboarding)', async () => {
    const sby = await materializationService.eligible({ type: 'OFFBOARDING', branchId: 'br-sby' });
    expect(sby.map((p) => p.name)).toEqual(['Rudi Setiadi']);
    await materializationService.setRole('ROLE_GA_STAFF', false);
    expect(await materializationService.eligible({ type: 'OFFBOARDING', branchId: 'br-sby' })).toEqual([]);
    await materializationService.setRole('ROLE_GA_STAFF', true);
  });

  it('setup kembar 409; HR Staff hanya membaca (403)', async () => {
    const duplicate = materializationService.blank('ONBOARDING', null, null);
    duplicate.sections.MAIN!.push({ ...materializationService.newTask(), name: 'X' });
    await expect(materializationService.save(duplicate)).rejects.toThrow(/^422|^409/);
    as('ROLE_HR_STAFF');
    await expect(materializationService.setRole('ROLE_EMPLOYEE', true)).rejects.toThrow(/^403/);
    expect(setupStatus(materializationService.blank('OFFBOARDING', null, 'br-bdg'))).toBe('INCOMPLETE');
  });
});
