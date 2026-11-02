import { describe, expect, it } from 'vitest';
import { transitionSchema, waiveSchema } from '@/features/transitions/validation';
import { transitionService } from '@/features/transitions/services/transition.service';
import { setupService } from '@/features/transitions/services/setup.service';
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
    ).rejects.toThrow(/Destination seat/);
  });

  it('target job grade hanya wajib untuk promosi/demosi', async () => {
    await expect(
      transitionSchema.validateAt('targetJobGradeId', { ...base, type: 'TRANSFER', subtype: 'PROMOTION', targetJobGradeId: '' }),
    ).rejects.toThrow(/target grade/i);
    await expect(
      transitionSchema.validateAt('targetJobGradeId', { ...base, type: 'TRANSFER', subtype: 'LATERAL', targetJobGradeId: '' }),
    ).resolves.toBeDefined();
  });

  it('offboarding mewajibkan alasan keluar', async () => {
    await expect(
      transitionSchema.validateAt('reason', { ...base, type: 'OFFBOARDING', reason: '' }),
    ).rejects.toThrow(/Reason is required/);
  });
});

describe('Transfer masuk antrean persetujuan', () => {
  it('transfer lahir IN_APPROVAL tanpa task, onboarding langsung IN_PROGRESS', async () => {
    const transfer = await transitionService.create({
      type: 'TRANSFER',
      employeeId: 'emp-nadia',
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

describe('Exclusion & guard server (UIC-EMPLOYEE §5)', () => {
  it('karyawan dengan transisi struktural terbuka ditolak 409', async () => {
    // Dimas sudah punya TRANSFER IN_APPROVAL di seed.
    await expect(
      transitionService.create({
        type: 'OFFBOARDING',
        employeeId: 'emp-dimas',
        subtype: '',
        destinationPositionId: '',
        targetJobGradeId: '',
        reason: 'RESIGN',
        effectiveDate: '2027-03-01',
      }),
    ).rejects.toThrow(/409/);
  });

  it('promosi tanpa golongan tujuan ditolak 422 oleh server', async () => {
    await expect(
      transitionService.create({
        type: 'TRANSFER',
        employeeId: 'emp-nadia',
        subtype: 'DEMOTION',
        destinationPositionId: '',
        targetJobGradeId: '',
        reason: '',
        effectiveDate: '2027-03-01',
      }),
    ).rejects.toThrow(/422/);
  });

  it('konfirmasi hanya dari AWAITING_CONFIRM', async () => {
    const rows = await transitionService.list();
    const onboarding = rows.find((row) => row.type === 'ONBOARDING' && row.status === 'IN_PROGRESS')!;
    const released = onboarding.tasks.find((task) => task.status === 'RELEASED')!;
    await expect(transitionService.confirmTask(onboarding.id, released.id)).rejects.toThrow(/409/);
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

describe('Transition terpadu (TSD-EMPLOYEE 0.212 §7.23–§7.26)', () => {
  it('transfer disetujui ⇒ paket dari setup lahir; IN tertahan sampai OUT tuntas; petugas bukan pengaju', async () => {
    const draft = {
      type: 'TRANSFER' as const,
      employeeId: 'emp-hub-test',
      subtype: 'LATERAL',
      destinationPositionId: 'pos-lead-ops',
      targetJobGradeId: '',
      reason: '',
      effectiveDate: '2027-02-01',
      facilityWithdrawnNote: 'Laptop',
      facilityProvidedNote: '',
    };
    const created = await transitionService.create(draft, 'emp-sari');
    expect(created.tasks).toHaveLength(0);
    const row = await transitionService.completeApprovalWorkflow(created.id);
    expect(row.setupId).toBe('setup-trf');
    expect(row.tasks.some((t) => t.name === 'Facility provided')).toBe(false);
    expect(row.tasks.filter((t) => t.side === 'PROVISION').every((t) => t.status === 'PENDING')).toBe(true);
    expect(row.tasks.every((t) => t.handlerId !== 'emp-sari')).toBe(true);
  });

  it('selesai → konfirmasi karyawan → persetujuan; penyetuju keliru ditolak', async () => {
    const [tr] = (await transitionService.list()).filter((t) => t.id === 'TR-2026-0405');
    const laptop = tr.tasks.find((t) => t.name === 'Assign laptop & access card')!;
    expect(await transitionService.completeTask(tr.id, laptop.id)).toBe('AWAITING_CONFIRM');
    await transitionService.confirmTask(tr.id, laptop.id);
    await expect(transitionService.approveTask('emp-sari', tr.id, laptop.id)).rejects.toThrow(/403/);
    await expect(transitionService.rejectTask('emp-hendra', tr.id, laptop.id, ' ')).rejects.toThrow(/422/);
    await transitionService.approveTask('emp-hendra', tr.id, laptop.id);
    expect((await transitionService.get(tr.id)).tasks.find((t) => t.id === laptop.id)?.status).toBe('COMPLETED');
  });

  it('antrean onboarding ditutup HR Manager; ESS hanya melihat miliknya', async () => {
    const queue = await transitionService.escalations();
    const onboarding = queue.find((row) => row.type === 'ONBOARDING')!;
    expect(await transitionService.closeQueue(onboarding.transitionId, 'Promoted before onboarding finished')).toBe(1);
    await expect(transitionService.closeQueue(onboarding.transitionId, '')).rejects.toThrow(/404/);
    const mine = await transitionService.myTransitions('emp-eka');
    expect(mine.every((row) => row.employeeId === 'emp-eka')).toBe(true);
  });
});

describe('Materialization setup (§7.23.3)', () => {
  it('minimal dua petugas, tanpa nama ganda, role harus ditandai', async () => {
    const [onb] = await setupService.list();
    const bad = { ...onb, tasks: onb.tasks.map((t, i) => (i === 1 ? { ...t, handlers: ['emp-rina'] } : t)) };
    await expect(setupService.save('HR_MANAGER', bad, 'emp-hendra')).rejects.toThrow(/EMP-VAL-710/);
    const overlap = { ...onb, tasks: onb.tasks.map((t, i) => (i === 2 ? { ...t, approvers: ['emp-budi', 'emp-hendra'] } : t)) };
    await expect(setupService.save('HR_MANAGER', overlap, 'emp-hendra')).rejects.toThrow(/EMP-VAL-711/);
    await expect(setupService.save('HR_STAFF', onb, 'emp-sari')).rejects.toThrow(/403/);
    const saved = await setupService.save('HR_MANAGER', onb, 'emp-hendra');
    expect(saved.version).toBe(onb.version + 1);
    await setupService.setRole('HR_MANAGER', 'acc-5', false);
    await expect(setupService.save('HR_MANAGER', saved, 'emp-hendra')).rejects.toThrow(/EMP-VAL-712/);
  });
});
