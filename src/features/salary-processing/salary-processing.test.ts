import { beforeEach, describe, expect, it } from 'vitest';
import {
  resetSalaryProcessingMocks,
  salaryProcessingService as service,
} from '@/features/salary-processing/services/salary-processing.service';
import { VIEWERS } from '@/features/salary-processing/mock-data';
import { periodLabel, runBranch } from '@/features/salary-processing/rules';

const RUDI = VIEWERS[0];
const MAYA = VIEWERS[1];
const DIMAS = VIEWERS[2];

beforeEach(() => resetSalaryProcessingMocks());

describe('Proses Gaji — periode (UIC §2.1–§2.6)', () => {
  it('run cabang Insert 201 membekukan sepuluh parameter dan menulis riwayat awal', async () => {
    const result = await service.runPeriod(RUDI, { periodYear: 2026, periodMonth: 10, idempotencyKey: 'k-1' });
    expect(result).toMatchObject({ branch: 'INSERT', httpStatus: 201 });
    expect(result.period.status).toBe('CALCULATED');
    expect(await service.paramSnapshot(result.period.id)).toHaveLength(10);
    expect(await service.stateHistory(result.period.id)).toEqual([
      expect.objectContaining({ fromStatus: null, toStatus: 'CALCULATED' }),
    ]);
  });

  it('run cabang Recalculate 200 tanpa baris riwayat baru; kunci idempotensi sama tidak menjalankan ulang', async () => {
    const first = await service.runPeriod(RUDI, { periodYear: 2026, periodMonth: 9, idempotencyKey: 'k-2' });
    expect(first).toMatchObject({ branch: 'RECALCULATE', httpStatus: 200 });
    expect(await service.stateHistory('per-2026-09')).toHaveLength(1);
    const replay = await service.runPeriod(RUDI, { periodYear: 2026, periodMonth: 9, idempotencyKey: 'k-2' });
    expect(replay.period.calculated.at).toBe(first.period.calculated.at);
  });

  it('run atas periode yang sudah lewat CALCULATED ditolak 422, dan HR Manager ditolak 403', async () => {
    await expect(service.runPeriod(RUDI, { periodYear: 2026, periodMonth: 8, idempotencyKey: 'k-3' })).rejects.toThrow(/422/);
    await expect(service.runPeriod(MAYA, { periodYear: 2026, periodMonth: 11, idempotencyKey: 'k-4' })).rejects.toThrow(/403/);
    const periods = await service.searchPeriods();
    expect(runBranch(periods, 2026, 8).branch).toBe('BLOCKED');
  });

  it('review hanya dari CALCULATED dan menulis transisi ke riwayat', async () => {
    const reviewed = await service.reviewPeriod(RUDI, 'per-2026-09');
    expect(reviewed.status).toBe('REVIEWED');
    expect((await service.stateHistory('per-2026-09')).at(-1)).toMatchObject({ fromStatus: 'CALCULATED', toStatus: 'REVIEWED' });
    await expect(service.reviewPeriod(RUDI, 'per-2026-09')).rejects.toThrow(/422/);
    await expect(service.reviewPeriod(MAYA, 'per-2026-09')).rejects.toThrow(/403/);
  });

  it('grid terbaru di atas dan bisa disaring status', async () => {
    const all = await service.searchPeriods();
    expect(all.map(periodLabel)).toEqual(['PP-2026-09', 'PP-2026-08', 'PP-2026-07', 'PP-2026-06']);
    expect(await service.searchPeriods({ statuses: ['HANDED_OVER'] })).toHaveLength(2);
  });
});

describe('Proses Gaji — temuan (UIC §2.7–§2.10)', () => {
  it('filter OPEN sama dengan final_state kosong', async () => {
    const open = await service.searchFindings('per-2026-09', { finalStates: ['OPEN'] });
    expect(open).toHaveLength(8);
    expect(open.every((row) => row.finalState === null)).toBe(true);
  });

  it('Diterima wajib beralasan 422; repeat_count menghitung Diterima periode sebelumnya + 1', async () => {
    await expect(service.resolveFinding(RUDI, 'FND-0002', { finalState: 'DITERIMA', resolutionReason: ' ' })).rejects.toThrow(
      /PAY_FINDING_RESOLUTION_REASON_REQUIRED/,
    );
    const row = await service.resolveFinding(RUDI, 'FND-0002', { finalState: 'DITERIMA', resolutionReason: 'SBU default belum ada' });
    expect(row).toMatchObject({ finalState: 'DITERIMA', repeatCount: 2, resolvedBy: 'emp-rudi' });
    await expect(service.resolveFinding(RUDI, 'FND-0002', { finalState: 'DIPERBAIKI', resolutionReason: '' })).rejects.toThrow(
      /409 PAY_FINDING_ALREADY_RESOLVED/,
    );
  });

  it('PERIOD_NOT_PICKED_UP tidak bisa Diperbaiki manual, tetapi boleh Diterima dengan repeat_count null', async () => {
    await expect(service.resolveFinding(RUDI, 'FND-0013', { finalState: 'DIPERBAIKI', resolutionReason: '' })).rejects.toThrow(
      /PAY_FINDING_PERIOD_NOT_PICKED_UP_MANUAL_FIX/,
    );
    const row = await service.resolveFinding(RUDI, 'FND-0013', { finalState: 'DITERIMA', resolutionReason: 'Klien sedang migrasi' });
    expect(row.repeatCount).toBeNull();
  });

  it('HR Manager hanya membaca — resolve ditolak 403', async () => {
    await expect(service.resolveFinding(MAYA, 'FND-0001', { finalState: 'DIPERBAIKI', resolutionReason: '' })).rejects.toThrow(/403/);
  });

  it('bulk-resolve: lintas periode 422, baris tertutup dikeluarkan ke skipped', async () => {
    await expect(service.bulkResolve(RUDI, ['FND-0002', 'FND-0013'], 'alasan')).rejects.toThrow(/PAY_BULK_RESOLVE_CROSS_PERIOD/);
    await service.resolveFinding(RUDI, 'FND-0003', { finalState: 'DIPERBAIKI', resolutionReason: '' });
    const result = await service.bulkResolve(RUDI, ['FND-0002', 'FND-0003'], 'SBU default belum tersedia');
    expect(result).toEqual({
      resolvedCount: 1,
      resolvedIds: ['FND-0002'],
      skipped: [{ id: 'FND-0003', reason: 'ALREADY_RESOLVED' }],
    });
  });
});

describe('Proses Gaji — impor riwayat (UIC §2.11–§2.14)', () => {
  const draft = {
    employeeId: 'pay-bayu',
    monthYear: '2026-03',
    grossTaxableIncomeAmount: '4500000',
    pph21WithheldAmount: '67500',
    bpjsContributionAmount: '135000',
  };

  it('bulan pada/sesudah periode gaji pertama ditolak 422', async () => {
    await expect(service.submitImport(RUDI, { ...draft, monthYear: '2026-06' })).rejects.toThrow(
      /PAY_HISTORY_IMPORT_MONTH_ALREADY_RUN/,
    );
    const { row } = await service.submitImport(RUDI, { ...draft, monthYear: '2026-05' });
    expect(row).toMatchObject({ isActive: true, verifiedBy: null, sourceMarker: 'LEGACY_SYSTEM_IMPORT' });
  });

  it('koreksi oleh pengimpor asal 403; oleh maker lain menonaktifkan baris lama', async () => {
    await expect(service.submitImport(RUDI, { ...draft, employeeId: 'pay-cahyo', monthYear: '2026-01' })).rejects.toThrow(
      /403 PAY_MAKER_CHECKER_VIOLATION/,
    );
    const result = await service.submitImport(DIMAS, { ...draft, employeeId: 'pay-cahyo', monthYear: '2026-01' });
    expect(result.supersededId).toBe('HIM-0001');
    const rows = await service.searchImports({ employeeId: 'pay-cahyo' });
    expect(rows.find((row) => row.id === 'HIM-0001')?.isActive).toBe(false);
    expect(rows.filter((row) => row.monthYear === '2026-01' && row.isActive)).toHaveLength(1);
  });

  it('verifikasi: bukan HR Manager 403, sekali saja 409', async () => {
    const { row } = await service.submitImport(RUDI, draft);
    await expect(service.verifyImport(DIMAS, row.id)).rejects.toThrow(/403/);
    const verified = await service.verifyImport(MAYA, row.id);
    expect(verified.verifiedBy).toBe('emp-maya');
    await expect(service.verifyImport(MAYA, row.id)).rejects.toThrow(/409 PAY_HISTORY_IMPORT_ALREADY_VERIFIED/);
  });
});
