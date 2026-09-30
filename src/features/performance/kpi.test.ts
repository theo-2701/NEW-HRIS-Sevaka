import { beforeEach, describe, expect, it } from 'vitest';
import { kpiService, resetKpiMocks } from '@/features/performance/services/kpi.service';
import { PERF_ACTORS } from '@/features/performance/mock-data';
import type { KpiDraft, PerfRole } from '@/features/performance/types';

const as = (role: PerfRole) => PERF_ACTORS.find((row) => row.role === role)!;
const HRM = as('ROLE_HR_MANAGER');
const HRS = as('ROLE_HR_STAFF');
const DM = as('ROLE_DEPT_MANAGER');
const EMP = as('ROLE_EMPLOYEE');

const SUPPORT = '019ba5a1-c100-73f1-a3f1-4e2c015a91b7';
const DRAFT: KpiDraft = {
  itemName: 'Akurasi laporan bulanan',
  jobGradeId: 'jg-staff-2',
  targetType: 'NUMERIC',
  rawWeight: 12.5,
  isActive: true,
};

beforeEach(() => resetKpiMocks());

describe('Daftar Induk & Bobot — akses (FSD Matriks Menu/Tab → Peran)', () => {
  it('HRM/HRS/DM boleh membaca; Employee nol akses', async () => {
    await expect(kpiService.search(HRS, { page: 1, size: 50 })).resolves.toMatchObject({ totalData: 6 });
    await expect(kpiService.search(DM, { page: 1, size: 50 })).resolves.toMatchObject({ totalData: 6 });
    await expect(kpiService.search(EMP, { page: 1, size: 50 })).rejects.toMatchObject({ status: 403 });
    await expect(kpiService.jobGrades(EMP)).rejects.toMatchObject({ status: 403 });
  });

  it('HR Staff baca saja — buat, ubah, dan nonaktifkan ditolak 403', async () => {
    await expect(kpiService.create(HRS, DRAFT, 'k-hrs')).rejects.toMatchObject({ status: 403 });
    await expect(kpiService.update(HRS, SUPPORT, { rawWeight: 50 })).rejects.toMatchObject({ status: 403 });
    await expect(kpiService.deactivate(DM, SUPPORT)).rejects.toMatchObject({ status: 403 });
  });

  it('Browsing atasan: golongan + is_active=true hanya mengembalikan baris berlaku', async () => {
    const browse = await kpiService.search(DM, { jobGradeId: 'jg-staff-2', isActive: true, page: 1, size: 50 });
    expect(browse.totalData).toBe(3);
    expect(browse.rows.every((row) => row.isActive && row.jobGradeId === 'jg-staff-2')).toBe(true);
  });
});

describe('Buat item (P2.01)', () => {
  it('snapshot golongan ditulis server; Idempotency-Key yang sama → 409', async () => {
    const created = await kpiService.create(HRM, DRAFT, 'k-1');
    expect(created).toMatchObject({ jobGradeNameSnapshot: 'Staff 2', usedInSheetCount: 0, createdBy: { id: HRM.employeeId } });
    await expect(kpiService.create(HRM, DRAFT, 'k-1')).rejects.toMatchObject({ status: 409, code: 'DUPLICATE_CONFLICT' });
  });

  it('validasi nama, bobot numeric(6,2), dan golongan yang tak dikenal → 422', async () => {
    await expect(kpiService.create(HRM, { ...DRAFT, itemName: '   ' }, 'k-2')).rejects.toMatchObject({ status: 422 });
    await expect(kpiService.create(HRM, { ...DRAFT, rawWeight: 10000 }, 'k-3')).rejects.toMatchObject({ status: 422 });
    await expect(kpiService.create(HRM, { ...DRAFT, rawWeight: 1.005 }, 'k-4')).rejects.toMatchObject({ status: 422 });
    await expect(kpiService.create(HRM, { ...DRAFT, jobGradeId: 'jg-x' }, 'k-5')).rejects.toMatchObject({ status: 422 });
    await expect(kpiService.create(HRM, { ...DRAFT, rawWeight: 0.1 }, 'k-6')).resolves.toMatchObject({ rawWeight: 0.1 });
  });
});

describe('Ubah item (P2.02)', () => {
  it('payload kosong → 422; snapshot golongan hanya ditulis ulang bila golongan dikirim', async () => {
    await expect(kpiService.update(HRM, SUPPORT, {})).rejects.toMatchObject({ status: 422 });
    await kpiService.update(HRM, SUPPORT, { rawWeight: 45 });
    expect(await kpiService.get(HRM, SUPPORT)).toMatchObject({ rawWeight: 45, jobGradeNameSnapshot: 'Staff 2' });
    await kpiService.update(HRM, SUPPORT, { jobGradeId: 'jg-manager-1' });
    expect(await kpiService.get(HRM, SUPPORT)).toMatchObject({
      jobGradeId: 'jg-manager-1',
      jobGradeNameSnapshot: 'Manager 1',
      updatedBy: { id: HRM.employeeId },
    });
  });
});

describe('Nonaktifkan (P2.03, soft-delete)', () => {
  it('pemakaian di lembar tidak memblokir; baris keluar dari grid, hapus dobel → 404', async () => {
    expect((await kpiService.get(HRM, SUPPORT)).usedInSheetCount).toBe(3);
    await kpiService.deactivate(HRM, SUPPORT);
    const grid = await kpiService.search(HRM, { page: 1, size: 50 });
    expect(grid.rows.some((row) => row.id === SUPPORT)).toBe(false);
    await expect(kpiService.get(HRM, SUPPORT)).rejects.toMatchObject({ status: 404 });
    await expect(kpiService.deactivate(HRM, SUPPORT)).rejects.toMatchObject({ status: 404 });
  });
});
