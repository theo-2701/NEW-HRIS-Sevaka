import { describe, expect, it } from 'vitest';
import { transitionSchema, waiveSchema } from '@/features/transitions/validation';
import { transitionService } from '@/features/transitions/services/transition.service';
import { doneCount, progressPct } from '@/features/transitions/types';

const base = { employeeId: 'emp-eka', effectiveDate: '2027-01-01' };

describe('TR-CREATE — field bercabang per tipe', () => {
  it('onboarding cukup karyawan + tanggal efektif', async () => {
    await expect(
      transitionSchema.validate({
        ...base,
        type: 'ONBOARDING',
        subtype: '',
        destinationPositionId: '',
        targetJobGradeId: '',
        reason: '',
      }),
    ).resolves.toBeTruthy();
  });

  it('transfer mewajibkan sub-tipe dan posisi tujuan', async () => {
    await expect(
      transitionSchema.validateAt('destinationPositionId', {
        ...base,
        type: 'TRANSFER',
        destinationPositionId: '',
      }),
    ).rejects.toThrow(/Posisi tujuan/);
  });

  it('target job grade hanya wajib untuk promosi/demosi', async () => {
    await expect(
      transitionSchema.validateAt('targetJobGradeId', { ...base, type: 'TRANSFER', subtype: 'PROMOTION', targetJobGradeId: '' }),
    ).rejects.toThrow(/target job grade/i);
    await expect(
      transitionSchema.validateAt('targetJobGradeId', { ...base, type: 'TRANSFER', subtype: 'LATERAL', targetJobGradeId: '' }),
    ).resolves.toBeDefined();
  });

  it('offboarding mewajibkan alasan keluar', async () => {
    await expect(
      transitionSchema.validateAt('reason', { ...base, type: 'OFFBOARDING', reason: '' }),
    ).rejects.toThrow(/Alasan keluar/);
  });
});

describe('Transfer masuk antrean persetujuan', () => {
  it('transfer lahir IN_APPROVAL tanpa task, onboarding langsung IN_PROGRESS', async () => {
    const transfer = await transitionService.create({
      type: 'TRANSFER',
      employeeId: 'emp-dimas',
      subtype: 'PROMOTION',
      destinationPositionId: 'pos-senior-fin',
      targetJobGradeId: 'gr-4a',
      reason: '',
      effectiveDate: '2027-02-01',
    });
    expect(transfer.status).toBe('IN_APPROVAL');
    expect(transfer.tasks).toHaveLength(0);

    const onboarding = await transitionService.create({
      type: 'ONBOARDING',
      employeeId: 'emp-nadia',
      subtype: '',
      destinationPositionId: '',
      targetJobGradeId: '',
      reason: '',
      effectiveDate: '2027-02-01',
    });
    expect(onboarding.status).toBe('IN_PROGRESS');
    expect(onboarding.tasks.length).toBeGreaterThan(0);
  });
});

describe('Task — dua pihak, waive, dan clearance', () => {
  it('task pengembalian aset lanjut ke AWAITING_CONFIRM, bukan COMPLETED', async () => {
    const rows = await transitionService.list();
    const offboarding = rows.find((row) => row.type === 'OFFBOARDING' && row.status === 'IN_PROGRESS')!;
    const laptop = offboarding.tasks.find((task) => /laptop/i.test(task.name))!;
    const status = await transitionService.completeTask(offboarding.id, laptop.id);
    expect(status).toBe('AWAITING_CONFIRM');
  });

  it('waive menutup task dan menyimpan alasan + kelas kontrol', async () => {
    const rows = await transitionService.list();
    const target = rows.find((row) => row.type === 'ONBOARDING')!;
    const task = target.tasks.find((item) => item.status === 'RELEASED')!;
    await transitionService.waiveTask(target.id, task.id, { control: 'ELEVATED', reason: 'Vendor terlambat' });
    const after = await transitionService.get(target.id);
    const waived = after.tasks.find((item) => item.id === task.id)!;
    expect(waived.status).toBe('WAIVED');
    expect(waived.waiveControl).toBe('ELEVATED');
    expect(waived.skipReason).toBe('Vendor terlambat');
  });

  it('force-release membersihkan task blocking dan menutup offboarding', async () => {
    const rows = await transitionService.list();
    const offboarding = rows.find((row) => row.type === 'OFFBOARDING' && row.status === 'IN_PROGRESS')!;
    await transitionService.forceRelease(offboarding.id, 'Karyawan sudah tidak dapat dihubungi');
    const after = await transitionService.get(offboarding.id);
    expect(after.status).toBe('COMPLETED');
    expect(after.tasks.filter((task) => task.clearanceBlocking && task.status !== 'COMPLETED')).toHaveLength(0);
  });

  it('progres menghitung COMPLETED, WAIVED, dan SKIPPED sebagai selesai', async () => {
    const rows = await transitionService.list();
    const row = rows.find((item) => item.status === 'COMPLETED')!;
    expect(doneCount(row)).toBe(row.tasks.length);
    expect(progressPct(row)).toBe(100);
  });
});

describe('Waive — alasan wajib', () => {
  it('menolak waive tanpa alasan', async () => {
    await expect(waiveSchema.validate({ control: 'STANDARD', reason: '  ' })).rejects.toThrow(/Alasan waive/);
  });
});
