import { afterAll, describe, expect, it } from 'vitest';
import { batchSchema, haltSchema, resumeSchema } from '@/features/mass-resignation/validation';
import {
  massResignationService,
  stopAllThrottles,
} from '@/features/mass-resignation/services/mass-resignation.service';
import { CURRENT_USER, isTerminal } from '@/features/mass-resignation/types';

afterAll(() => stopAllThrottles());

describe('MR-CREATE — draft-first & blast radius', () => {
  it('menolak batch tanpa karyawan terpilih', async () => {
    await expect(
      batchSchema.validateAt('employeeIds', { employeeIds: [] }),
    ).rejects.toThrow(/minimal satu karyawan/);
  });

  it('dry-run tidak menghitung baris diri sendiri (larangan self-resign)', async () => {
    const withSelf = await massResignationService.dryRun(['emp-agus', 'emp-tony', 'emp-bunga']);
    expect(withSelf.impacted).toBe(2);
    expect(withSelf.overThreshold).toBe(false);
  });

  it('batch baru selalu lahir sebagai DRAFT milik maker yang login', async () => {
    const row = await massResignationService.createDraft({
      reason: 'LAYOFF',
      leaveDate: '2026-12-01',
      employeeIds: ['emp-agus', 'emp-bunga', 'emp-tony'],
      notes: '',
    });
    expect(row.status).toBe('DRAFT');
    expect(row.maker).toBe(CURRENT_USER);
    // Baris diri sendiri tidak ikut terhitung.
    expect(row.total).toBe(2);
  });
});

describe('MR-APPROVE — SoD & pembekuan hash', () => {
  it('menolak approve oleh maker sendiri', async () => {
    const rows = await massResignationService.list();
    const own = rows.find((row) => row.maker === CURRENT_USER && row.status === 'DRAFT')!;
    await massResignationService.submit(own.id);
    await expect(massResignationService.approve(own.id, 'oke')).rejects.toThrow(/409/);
  });

  it('approve membekukan selection hash', async () => {
    const rows = await massResignationService.list();
    const target = rows.find((row) => row.status === 'IN_APPROVAL' && row.maker !== CURRENT_USER)!;
    const hash = await massResignationService.approve(target.id, 'Disetujui manajemen');
    expect(hash).toMatch(/^sha256:[0-9a-f]{24}$/);
  });
});

describe('MR-PROCESS — anti-TOCTOU', () => {
  it('hash yang tidak cocok ditolak 409 dan batch tetap APPROVED', async () => {
    const rows = await massResignationService.list();
    const approved = rows.find((row) => row.status === 'APPROVED')!;
    await expect(massResignationService.process(approved.id, 'sha256:deadbeef')).rejects.toThrow(/409/);
    const after = await massResignationService.list();
    expect(after.find((row) => row.id === approved.id)!.status).toBe('APPROVED');
  });

  it('hash yang cocok memulai pemrosesan dan memberi correlation id', async () => {
    const rows = await massResignationService.list();
    const approved = rows.find((row) => row.status === 'APPROVED')!;
    const correlation = await massResignationService.process(approved.id, approved.selectionHash!);
    expect(correlation).toMatch(/^corr-[0-9a-f]{6}$/);
    const after = await massResignationService.list();
    expect(after.find((row) => row.id === approved.id)!.status).toBe('PROCESSING');
  });
});

describe('MR-HALT / MR-RESUME — circuit-breaker', () => {
  it('halt menghentikan batch dan cancel-remaining menyudahi sebagai PARTIAL', async () => {
    const rows = await massResignationService.list();
    const running = rows.find((row) => row.status === 'PROCESSING' && row.maker !== CURRENT_USER)!;
    await massResignationService.halt(running.id, 'Menunggu keputusan direksi');
    let after = await massResignationService.list();
    expect(after.find((row) => row.id === running.id)!.status).toBe('HALTED');

    await massResignationService.cancelRemaining(running.id, 'Sisanya dibatalkan');
    after = await massResignationService.list();
    const finished = after.find((row) => row.id === running.id)!;
    expect(finished.status).toBe('PARTIAL');
    expect(isTerminal(finished.status)).toBe(true);
  });

  it('alasan halt dan catatan approver wajib diisi', async () => {
    await expect(haltSchema.validate({ reason: '   ' })).rejects.toThrow(/Alasan halt/);
    await expect(resumeSchema.validate({ action: 'RESUME', note: '' })).rejects.toThrow(/Catatan approver/);
  });
});
