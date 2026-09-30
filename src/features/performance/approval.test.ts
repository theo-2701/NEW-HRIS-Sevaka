import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { approvalService, flushWorkflow, resetApprovalMocks } from '@/features/performance/services/approval.service';
import { resetSheetMocks, sheetService } from '@/features/performance/services/sheet.service';
import { PERF_ACTORS } from '@/features/performance/mock-data';

const who = (id: string) => PERF_ACTORS.find((row) => row.employeeId === id)!;
const HESTI = who('emp-hesti');
const LUKMAN = who('emp-lukman');
const BUDI = who('emp-budi-dm');
const RINA = who('emp-rina-amelia');
const DEDI = who('emp-dedi');
const YANTI = who('emp-yanti');
const page = { page: 1, size: 20 };

/** Lengkapi nilai awal RS-0001 lalu ajukan — putaran 1 menunggu Rina. */
async function submitDedi() {
  await sheetService.setInitialValue(BUDI, 'rs-0001', 'rsi-0001-2', 'Baik', 'k-2');
  await sheetService.setInitialValue(BUDI, 'rs-0001', 'rsi-0001-3', 'Selesai', 'k-3');
  return sheetService.submit(BUDI, 'rs-0001');
}

beforeEach(() => {
  resetSheetMocks();
  resetApprovalMocks();
});
afterEach(() => resetApprovalMocks());

describe('Antrean persetujuan (P4.04)', () => {
  it('identitas penyetuju dari token; HRS & EMP tanpa antrean', async () => {
    await expect(approvalService.pending(RINA, page)).resolves.toMatchObject({ totalData: 0 });
    await submitDedi();
    const queue = await approvalService.pending(RINA, page);
    expect(queue.rows).toHaveLength(1);
    expect(queue.rows[0]).toMatchObject({
      reviewSheetId: 'rs-0001',
      employee: { name: 'Dedi Kurniawan' },
      cycleNo: 1,
      roundNo: 1,
      assessorScoreDistribution: { ratedCount: 3, totalCount: 3, averageScore: null },
    });
    await expect(approvalService.pending(BUDI, page)).resolves.toMatchObject({ totalData: 0 });
    await expect(approvalService.pending(LUKMAN, page)).rejects.toMatchObject({ status: 403 });
    await expect(approvalService.pending(DEDI, page)).rejects.toMatchObject({ status: 403 });
  });
});

describe('Putuskan (P4.02, pola K9)', () => {
  it('202 FORWARDED tidak mengubah status; status berubah setelah alur kerja selesai', async () => {
    await submitDedi();
    await expect(approvalService.decide(RINA, 'rs-0001', { decision: 'APPROVED' })).resolves.toMatchObject({
      status: 'FORWARDED',
    });
    expect((await sheetService.get(BUDI, 'rs-0001')).status).toBe('PENDING_APPROVAL');
    await expect(approvalService.decide(RINA, 'rs-0001', { decision: 'APPROVED' })).rejects.toMatchObject({ status: 422 });
    flushWorkflow();
    expect((await sheetService.get(BUDI, 'rs-0001')).status).toBe('APPROVED');
    const rounds = await approvalService.rounds(RINA, 'rs-0001');
    expect(rounds[0]).toMatchObject({ outcome: 'APPROVED', decisionReason: null });
    expect(rounds[0].decidedAt).not.toBeNull();
  });

  it('hanya penyetuju putaran berjalan; alasan wajib untuk Kembalikan/Tolak final', async () => {
    await submitDedi();
    await expect(approvalService.decide(HESTI, 'rs-0001', { decision: 'APPROVED' })).rejects.toMatchObject({ status: 403 });
    await expect(approvalService.decide(RINA, 'rs-0001', { decision: 'RETURNED', decisionReason: '  ' })).rejects.toMatchObject({
      status: 422,
      code: 'VALIDATION_ERROR',
    });
    await expect(approvalService.decide(RINA, 'rs-0004', { decision: 'APPROVED' })).rejects.toMatchObject({ status: 404 });
  });

  it('Kembalikan → dikembalikan ke penilai; ajukan ulang = putaran 2 dan jatah habis', async () => {
    await submitDedi();
    await approvalService.decide(RINA, 'rs-0001', { decision: 'RETURNED', decisionReason: 'Lengkapi bukti.' });
    flushWorkflow();
    expect((await sheetService.get(BUDI, 'rs-0001')).status).toBe('RETURNED_TO_ASSESSOR');
    await expect(sheetService.submit(BUDI, 'rs-0001')).resolves.toMatchObject({ cycleNo: 1, roundNo: 2 });
    await expect(
      approvalService.decide(RINA, 'rs-0001', { decision: 'RETURNED', decisionReason: 'Lagi.' }),
    ).rejects.toMatchObject({ status: 422, code: 'RETURN_QUOTA_EXCEEDED' });
    await approvalService.decide(RINA, 'rs-0001', { decision: 'REJECTED_FINAL', decisionReason: 'Tetap belum terukur.' });
    flushWorkflow();
    expect((await sheetService.get(BUDI, 'rs-0001')).status).toBe('REJECTED_FINAL');
  });

  it('HR Manager penadah terakhir: lembar Rina diajukan ulang ke Hesti dengan jatah sudah terpakai', async () => {
    await sheetService.submit(HESTI, 'rs-0003');
    const queue = await approvalService.pending(HESTI, page);
    expect(queue.rows[0]).toMatchObject({ reviewSheetId: 'rs-0003', roundNo: 2 });
    await expect(
      approvalService.decide(HESTI, 'rs-0003', { decision: 'RETURNED', decisionReason: 'x' }),
    ).rejects.toMatchObject({ code: 'RETURN_QUOTA_EXCEEDED' });
  });
});

describe('Riwayat putaran (P4.03)', () => {
  it('HR seluruh company, karyawan hanya lembarnya sendiri, penyetuju terlibat', async () => {
    await expect(approvalService.rounds(LUKMAN, 'rs-0004')).resolves.toHaveLength(2);
    await expect(approvalService.rounds(YANTI, 'rs-0004')).resolves.toHaveLength(2);
    await expect(approvalService.rounds(RINA, 'rs-0004')).resolves.toHaveLength(2);
    await expect(approvalService.rounds(DEDI, 'rs-0004')).rejects.toMatchObject({ status: 404 });
    const rounds = await approvalService.rounds(HESTI, 'rs-0004');
    expect(rounds.map((row) => row.outcome)).toEqual(['RETURNED', 'REJECTED_FINAL']);
  });
});
