import { beforeEach, describe, expect, it } from 'vitest';
import { periodService, resetPeriodMocks } from '@/features/performance/services/period.service';
import { PERF_ACTORS } from '@/features/performance/mock-data';
import type { PerfRole } from '@/features/performance/types';

const as = (role: PerfRole) => PERF_ACTORS.find((row) => row.role === role)!;
const HRM = as('ROLE_HR_MANAGER');
const HRS = as('ROLE_HR_STAFF');
const DM = as('ROLE_DEPT_MANAGER');
const EMP = as('ROLE_EMPLOYEE');

beforeEach(() => resetPeriodMocks());

describe('Siklus & Setelan — akses (FSD Matriks Menu/Tab → Peran)', () => {
  it('grid hanya HR; DM kontekstual lewat detail; Employee nol akses', async () => {
    await expect(periodService.search(HRS, { page: 1, size: 10 })).resolves.toMatchObject({ totalData: 3 });
    await expect(periodService.search(DM, { page: 1, size: 10 })).rejects.toMatchObject({ status: 403 });
    await expect(periodService.get(DM, 'rp-2026-s1')).resolves.toMatchObject({ phase: 'SIGNING' });
    await expect(periodService.get(EMP, 'rp-2026-s1')).rejects.toMatchObject({ status: 403 });
  });

  it('HR Staff baca saja — buka periode ditolak 403', async () => {
    await expect(periodService.open(HRS, 'Semester 2 2026')).rejects.toMatchObject({ status: 403 });
  });

  it('filter fase memakai whitelist dan urut terbaru', async () => {
    const closed = await periodService.search(HRM, { phase: ['CLOSED'], page: 1, size: 10 });
    expect(closed.rows.map((row) => row.id)).toEqual(['rp-2025-s2', 'rp-2025-s1']);
  });
});

describe('Buka periode (P1.01)', () => {
  it('membekukan skala & struktur dari setelan, ringkasan kelayakan dihitung tanpa disimpan', async () => {
    const { period, summary } = await periodService.open(HRM, '  Semester 2 2026  ');
    expect(period).toMatchObject({
      periodName: 'Semester 2 2026',
      phase: 'FILLING',
      scaleLength: 5,
      assessmentStructureNameSnapshot: 'Struktur Penilaian Utama',
    });
    // Fajar bergabung sebelum periode ini dibuka → tidak "bergabung di tengah periode".
    expect(summary).toEqual({ notAssessableCount: 1, outOfAssessmentCount: 1 });
  });

  it('periode FILLING kedua ditolak 422 PERIOD_PHASE_INVALID menyebut periode penahan', async () => {
    await periodService.open(HRM, 'Semester 2 2026');
    await expect(periodService.open(HRM, 'Semester 1 2027')).rejects.toMatchObject({
      status: 422,
      code: 'PERIOD_PHASE_INVALID',
      message: expect.stringContaining('Semester 2 2026'),
    });
  });

  it('nama kosong atau >100 karakter ditolak 422', async () => {
    await expect(periodService.open(HRM, '   ')).rejects.toMatchObject({ status: 422, code: 'VALIDATION_ERROR' });
    await expect(periodService.open(HRM, 'x'.repeat(101))).rejects.toMatchObject({ status: 422 });
  });
});

describe('Transisi fase satu arah (P1.06/P1.07)', () => {
  it('FILLING → SIGNING → CLOSED; di luar urutan ditolak 422', async () => {
    const { period } = await periodService.open(HRM, 'Semester 2 2026');
    await expect(periodService.close(HRM, period.id)).rejects.toMatchObject({ code: 'PERIOD_PHASE_INVALID' });
    await periodService.startSigning(HRM, period.id);
    await expect(periodService.startSigning(HRM, period.id)).rejects.toMatchObject({ code: 'PERIOD_PHASE_INVALID' });
    await periodService.close(HRM, period.id);
    const closed = await periodService.get(HRM, period.id);
    expect(closed).toMatchObject({ phase: 'CLOSED', closedAtTimezone: 'Asia/Jakarta' });
    expect(closed.closedAt).toBeTruthy();
  });

  it('periode berikutnya boleh dibuka setelah yang lama masuk SIGNING (ekor pengesahan)', async () => {
    const { period } = await periodService.open(HRM, 'Semester 2 2026');
    await periodService.startSigning(HRM, period.id);
    await expect(periodService.open(HRM, 'Semester 1 2027')).resolves.toBeTruthy();
  });
});

describe('Daftar ketidaklayakan (P1.04/P1.05)', () => {
  it('dua daftar terpisah; bergabung di tengah periode hanya untuk periode yang sudah ada', async () => {
    const gaps = await periodService.eligibilityGaps(HRM, 'rp-2026-s1');
    expect(gaps.notAssessable.map((row) => row.reason)).toEqual(['NO_ASSESSOR_IN_STRUCTURE']);
    expect(gaps.outOfAssessment.map((row) => row.reason)).toEqual(['APPROVER_CHAIN_EXHAUSTED', 'NOT_INCLUDED_MID_PERIOD']);

    const preview = await periodService.eligibilityPreview(HRM);
    expect(preview.outOfAssessment.map((row) => row.reason)).toEqual(['APPROVER_CHAIN_EXHAUSTED']);
  });

  it('Dept Manager tidak berhak daftar ketidaklayakan', async () => {
    await expect(periodService.eligibilityGaps(DM, 'rp-2026-s1')).rejects.toMatchObject({ status: 403 });
  });
});
