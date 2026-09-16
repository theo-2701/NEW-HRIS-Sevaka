import { beforeEach, describe, expect, it } from 'vitest';
import {
  resetSalaryProcessingMocks,
  salaryProcessingService as periods,
  setLockGateFailure,
} from '@/features/salary-processing/services/salary-processing.service';
import {
  payrollAuthorizationService as service,
  resetPayrollAuthorizationMocks,
} from '@/features/payroll-authorization/services/payroll-authorization.service';
import { VIEWERS } from '@/features/payroll-authorization/mock-data';
import type { Actor } from '@/features/payroll-authorization/types';

const MAYA = VIEWERS[0];
const HESTI = VIEWERS[1];
const RUDI = VIEWERS[2];

beforeEach(() => {
  resetSalaryProcessingMocks();
  resetPayrollAuthorizationMocks();
});

/** PP-2026-09 baru CALCULATED — ditinjau dulu oleh Penjalan sebelum bisa dikunci Pemeriksa. */
async function reviewSeptember() {
  await periods.reviewPeriod({ employeeId: 'emp-rudi', role: 'ROLE_PAYROLL_OFFICER' }, 'per-2026-09');
}

describe('Otorisasi — kunci periode (UIC §3.1)', () => {
  it('kunci hanya dari REVIEWED, oleh HR Manager yang bukan penghitung', async () => {
    await expect(periods.lockPeriod(MAYA, 'per-2026-09')).rejects.toThrow(/422/);
    await reviewSeptember();
    await expect(periods.lockPeriod(RUDI, 'per-2026-09')).rejects.toThrow(/403/);
    const locked = await periods.lockPeriod(MAYA, 'per-2026-09');
    expect(locked.status).toBe('LOCKED');
    expect((await periods.stateHistory('per-2026-09')).at(-1)).toMatchObject({
      fromStatus: 'REVIEWED',
      toStatus: 'LOCKED',
    });
  });

  it('pengunci tidak boleh orang yang menjalankan perhitungan', async () => {
    await reviewSeptember();
    const calculator: Actor = { employeeId: 'emp-rudi', role: 'ROLE_HR_MANAGER' };
    await expect(periods.lockPeriod(calculator, 'per-2026-09')).rejects.toThrow(/PAY_MAKER_CHECKER_VIOLATION/);
  });

  it.each([
    ['time', /PAY_LOCK_BLOCKED_TIME_MISMATCH/],
    ['finance', /PAY_LOCK_BLOCKED_FINANCE_INCOMPLETE/],
    ['param', /PAY_LOCK_BLOCKED_NO_PARAM_SNAPSHOT/],
  ] as const)('gerbang %s punya kode penolakannya sendiri', async (gate, code) => {
    resetSalaryProcessingMocks();
    await reviewSeptember();
    setLockGateFailure(gate);
    await expect(periods.lockPeriod(MAYA, 'per-2026-09')).rejects.toThrow(code);
  });
});

describe('Otorisasi — buka kembali (UIC §3.2)', () => {
  it('hanya pemegang kunci baris ini, alasan minimal 10 karakter', async () => {
    const other: Actor = { employeeId: 'emp-lain', role: 'ROLE_HR_MANAGER' };
    await expect(
      periods.reopenPeriod(other, 'per-2026-08', { targetStatus: 'REVIEWED', reason: 'alasan yang cukup panjang' }),
    ).rejects.toThrow(/PAY_MAKER_CHECKER_VIOLATION/);
    await expect(
      periods.reopenPeriod(MAYA, 'per-2026-08', { targetStatus: 'REVIEWED', reason: 'pendek' }),
    ).rejects.toThrow(/422/);
    const row = await periods.reopenPeriod(MAYA, 'per-2026-08', {
      targetStatus: 'REVIEWED',
      reason: 'Ada fakta lembur susulan sebelum cutoff yang perlu dikoreksi.',
    });
    expect(row).toMatchObject({ status: 'REVIEWED', locked: null });
    expect((await periods.stateHistory('per-2026-08')).at(-1)?.reason).toMatch(/lembur susulan/);
  });

  it('periode yang sudah diserahkan tidak bisa dibuka kembali', async () => {
    await expect(
      periods.reopenPeriod(MAYA, 'per-2026-07', { targetStatus: 'REVIEWED', reason: 'mencoba membuka yang permanen' }),
    ).rejects.toThrow(/422/);
  });
});

describe('Otorisasi — penyerahan (UIC §3.3 & §3.11)', () => {
  it('temuan terbuka bersubjek karyawan menahan otorisasi', async () => {
    await reviewSeptember();
    await periods.lockPeriod(MAYA, 'per-2026-09');
    await expect(periods.authorizeHandover(MAYA, 'per-2026-09')).rejects.toThrow(/PAY_OPEN_FINDING_BLOCKS_HANDOVER/);
  });

  it('PP-2026-08 nol temuan terbuka: diserahkan dan menulis baris jembatan', async () => {
    const before = await service.handoverPending();
    const row = await periods.authorizeHandover(MAYA, 'per-2026-08');
    expect(row.status).toBe('HANDED_OVER');
    const after = await service.handoverPending();
    expect(after).toHaveLength(before.length + 1);
    expect(after.some((item) => item.periodId === 'per-2026-08')).toBe(true);
  });
});

describe('Otorisasi — usulan gaji (UIC §3.4–§3.10)', () => {
  it('usulan sifat: pengaju tidak boleh memutuskan, setuju tidak langsung mengubah sifat aktif', async () => {
    const queue = await service.traitQueue();
    expect(queue).toHaveLength(1);
    await expect(service.approveTrait(RUDI, 'SC-003')).rejects.toThrow(/403/);
    const approved = await service.approveTrait(MAYA, 'SC-003');
    expect(approved).toMatchObject({ proposalState: 'MENUNGGU_PERSETUJUAN', isOvertimeBasis: false, approvedBy: 'emp-maya' });
  });

  it('menolak usulan sifat mengembalikan komponen ke AKTIF tanpa field alasan', async () => {
    const rejected = await service.rejectTrait(MAYA, 'SC-003');
    expect(rejected).toMatchObject({ proposalState: 'AKTIF', proposedIsOvertimeBasis: null, proposedEffectiveFrom: null });
    expect(await service.traitQueue()).toHaveLength(0);
  });

  it('usulan individual: antrean hanya yang menunggu, tolak wajib beralasan', async () => {
    const queue = await service.proposalQueue();
    expect(queue.map((row) => row.id)).toEqual(['PRP-0001']);
    await expect(service.rejectProposal(MAYA, 'PRP-0001', '  ')).rejects.toThrow(/422/);
    const rejected = await service.rejectProposal(MAYA, 'PRP-0001', 'Pagu kenaikan cabang sudah habis semester ini.');
    expect(rejected).toMatchObject({ approvalState: 'DITOLAK', approvedBy: 'emp-maya' });
    expect(await service.proposalQueue()).toHaveLength(0);
    expect((await service.decidedProposals()).map((row) => row.id)).toContain('PRP-0001');
  });

  it('usulan individual: pengaju tidak boleh menyetujui usulannya sendiri', async () => {
    const maker: Actor = { employeeId: 'emp-rudi', role: 'ROLE_HR_MANAGER' };
    await expect(service.approveProposal(maker, 'PRP-0001')).rejects.toThrow(/PAY_MAKER_CHECKER_VIOLATION/);
    const approved = await service.approveProposal(MAYA, 'PRP-0001');
    expect(approved.approvalState).toBe('DISETUJUI');
  });

  it('kumpulan tereskalasi: HR Manager ditolak menyetujui, penyetuju eskalasi lolos', async () => {
    await expect(service.approveBatch(MAYA, 'BATCH-0001')).rejects.toThrow(/PAY_MAKER_CHECKER_VIOLATION/);
    const approved = await service.approveBatch(HESTI, 'BATCH-0001');
    expect(approved).toMatchObject({ status: 'DISETUJUI', decidedBy: 'emp-hesti' });
  });

  it('menolak kumpulan tetap milik HR Manager dan wajib beralasan', async () => {
    await expect(service.rejectBatch(MAYA, 'BATCH-0001', ' ')).rejects.toThrow(/422/);
    const rejected = await service.rejectBatch(MAYA, 'BATCH-0001', 'Anggaran kenaikan ditunda menunggu review keuangan.');
    expect(rejected.status).toBe('DITOLAK');
    await expect(service.approveBatch(HESTI, 'BATCH-0001')).rejects.toThrow(/422/);
  });

  it('kumpulan DRAFT belum tampil di antrean pemeriksa', async () => {
    expect((await service.batches()).map((row) => row.id)).toEqual(['BATCH-0001']);
  });
});

describe('Otorisasi — ekspor ulang (UIC §3.13)', () => {
  it('gerbang i: periode yang belum diserahkan ditolak, alasannya tetap tercatat', async () => {
    await expect(service.requestReexport(MAYA, 'per-2026-09', 'Klien minta salinan')).rejects.toThrow(
      /PAY_HANDOVER_NOT_YET_SUBMITTED/,
    );
    const log = await service.reexportLog();
    expect(log[0]).toMatchObject({ periodId: 'per-2026-09', gateResult: 'DITOLAK_PERIODE_BELUM_DISERAHKAN' });
  });

  it('gerbang ii: baris jembatan yang belum diambil klien ditolak', async () => {
    await expect(service.requestReexport(MAYA, 'per-2026-07', 'Ingin salinan cadangan')).rejects.toThrow(
      /PAY_HANDOVER_ALREADY_DONE/,
    );
    expect((await service.reexportLog())[0].gateResult).toBe('DITOLAK_BARIS_BELUM_KOSONG');
  });

  it('kedua gerbang lolos: baris jembatan disalin ulang dan menunggu diambil', async () => {
    const row = await service.requestReexport(MAYA, 'per-2026-06', 'Klien melaporkan file rusak.');
    expect(row.gateResult).toBe('DISETUJUI');
    expect((await service.handoverPending()).some((item) => item.periodId === 'per-2026-06')).toBe(true);
  });

  it('hanya HR Manager yang boleh mengajukan ekspor ulang', async () => {
    await expect(service.requestReexport(RUDI, 'per-2026-06', 'Coba dari peran lain')).rejects.toThrow(/403/);
  });
});
