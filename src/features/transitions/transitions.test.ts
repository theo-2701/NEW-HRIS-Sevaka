import { describe, expect, it } from 'vitest';
import { transitionSchema, waiveSchema } from '@/features/transitions/validation';
import { transitionService } from '@/features/transitions/services/transition.service';
import { doneCount, progressPct } from '@/features/transitions/types';
import { startOffboardingForCancelledAccess } from '@/features/transitions/services/transition.service';

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

  it('posisi tujuan transfer boleh kosong (FSD 0.24 §5.1)', async () => {
    await expect(
      transitionSchema.validateAt('destinationPositionId', {
        ...base,
        type: 'TRANSFER',
        destinationPositionId: '',
      }),
    ).resolves.toBe('');
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
    ).rejects.toThrow(/reason/);
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
      facilityProvided: '',
      facilityWithdrawn: '',
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
      facilityProvided: '',
      facilityWithdrawn: '',
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
        facilityProvided: '',
        facilityWithdrawn: '',
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
        facilityProvided: '',
        facilityWithdrawn: '',
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

  it('force-release = waive ELEVATED atas task blocking yang terbuka, lalu offboarding tertutup (FSD 0.15)', async () => {
    const rows = await transitionService.list();
    const offboarding = rows.find((row) => row.type === 'OFFBOARDING' && row.status === 'IN_PROGRESS')!;
    const openBlocking = offboarding.tasks
      .filter((task) => task.clearanceBlocking && task.status !== 'COMPLETED' && task.status !== 'WAIVED')
      .map((task) => task.id);
    await transitionService.forceRelease(offboarding.id, 'Karyawan sudah tidak dapat dihubungi');
    const after = await transitionService.get(offboarding.id);
    expect(after.status).toBe('COMPLETED');
    const released = after.tasks.filter((task) => openBlocking.includes(task.id));
    expect(released.every((task) => task.status === 'WAIVED' && task.waiveControl === 'ELEVATED')).toBe(true);
    expect(
      after.tasks.filter((task) => task.clearanceBlocking && !['COMPLETED', 'WAIVED'].includes(task.status)),
    ).toHaveLength(0);
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
    await expect(waiveSchema.validate({ control: 'STANDARD', reason: '  ' })).rejects.toThrow(/reason/);
  });
});

describe('FSD 0.83 — persetujuan task, fasilitas, eskalasi, Onboarding Closure', () => {
  it('task wajib persetujuan: selesai ⇒ AWAITING_APPROVAL; penyetuju menolak dengan alasan lalu menyetujui', async () => {
    const approvals = await transitionService.myTasks('approvals');
    const waiting = approvals.find(({ task }) => task.status === 'AWAITING_APPROVAL')!;
    await expect(transitionService.rejectTask(waiting.transition.id, waiting.task.id, ' ')).rejects.toThrow(/^422/);
    await transitionService.rejectTask(waiting.transition.id, waiting.task.id, 'Photo of the handover is missing');
    const returned = (await transitionService.get(waiting.transition.id)).tasks.find((task) => task.id === waiting.task.id)!;
    expect(returned).toMatchObject({ status: 'IN_PROGRESS', rejectReason: 'Photo of the handover is missing' });
    // Petugas menyelesaikan ulang — dua-pihak menunggu konfirmasi dulu, lalu persetujuan.
    const next = await transitionService.completeTask(waiting.transition.id, waiting.task.id);
    if (next === 'AWAITING_CONFIRM') await transitionService.confirmTask(waiting.transition.id, waiting.task.id);
    await transitionService.approveTask(waiting.transition.id, waiting.task.id);
    const done = (await transitionService.get(waiting.transition.id)).tasks.find((task) => task.id === waiting.task.id)!;
    expect(done.status).toBe('COMPLETED');
  });

  it('bukan penyetuju tidak dapat menyetujui (403)', async () => {
    const approvals = await transitionService.myTasks('approvals');
    const any = approvals[0];
    await expect(transitionService.approveTask(any.transition.id, any.task.id, 'Someone Else')).rejects.toThrow(/^403/);
  });

  it('catatan fasilitas melahirkan task Facility provided/withdrawn; lebih dari 500 karakter 422', async () => {
    const draft = {
      type: 'OFFBOARDING' as const,
      employeeId: 'emp-eka',
      subtype: '',
      destinationPositionId: '',
      targetJobGradeId: '',
      reason: 'DECEASED',
      effectiveDate: '2027-05-01',
      facilityProvided: '',
      facilityWithdrawn: 'Official house',
    };
    await expect(transitionService.create({ ...draft, facilityWithdrawn: 'x'.repeat(501) })).rejects.toThrow(/^422/);
  });

  it('eskalasi memuat transisi tanpa setup dan yang lewat tanggal efektif', async () => {
    const reasons = (await transitionService.escalations()).map((item) => item.reason);
    expect(reasons).toContain('NO_SETUP');
    expect(reasons).toContain('PAST_EFFECTIVE');
  });

  it('Cancel access menutup onboarding ke antrean; Close onboarding mengeluarkannya', async () => {
    startOffboardingForCancelledAccess({ name: 'Maya Kusuma', reasonLabel: 'Candidate withdrew' });
    const queue = await transitionService.closureQueue();
    const maya = queue.find((row) => row.employee === 'Maya Kusuma')!;
    expect(maya.closure?.reason).toBe('ACCESS_CANCELLED');
    const closed = await transitionService.closeOnboarding(maya.id, 'Checked with IT');
    expect(closed).toBeGreaterThan(0);
    expect((await transitionService.closureQueue()).some((row) => row.id === maya.id)).toBe(false);
    await expect(transitionService.closeOnboarding(maya.id, '')).rejects.toThrow(/^404/);
  });
});
