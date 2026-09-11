import { beforeEach, describe, expect, it } from 'vitest';
import { resetSchedulerMocks, schedulerService } from '@/features/scheduler/services/scheduler.service';
import { datesBetween, pickableShifts, weekDates } from '@/features/scheduler/rules';
import { SHIFTS } from '@/features/scheduler/mock-data';
import type { ShiftDraft } from '@/features/scheduler/types';

const shiftDraft: ShiftDraft = {
  shiftCode: 'SORE',
  shiftName: 'Shift Sore',
  shiftType: 'FIXED',
  startTime: '14:00',
  endTime: '22:00',
  breakMinutes: '45',
  cycleDef: '',
  flexBand: '',
};

beforeEach(() => {
  resetSchedulerMocks();
});

describe('Katalog shift', () => {
  it('menolak pola tetap tanpa jam lengkap', async () => {
    await expect(schedulerService.saveShift({ ...shiftDraft, endTime: '' })).rejects.toThrow(/422/);
  });

  it('menolak jam terisi pada pola non-tetap', async () => {
    await expect(
      schedulerService.saveShift({ ...shiftDraft, shiftType: 'FLEX', flexBand: '{}' }),
    ).rejects.toThrow(/harus kosong/);
  });

  it('pola siklus wajib berjeda 0 dan punya definisi siklus', async () => {
    await expect(
      schedulerService.saveShift({ ...shiftDraft, shiftType: 'CYCLE', startTime: '', endTime: '', cycleDef: '{}' }),
    ).rejects.toThrow(/berjeda 0/);
    await expect(
      schedulerService.saveShift({ ...shiftDraft, shiftType: 'CYCLE', startTime: '', endTime: '', breakMinutes: '0' }),
    ).rejects.toThrow(/definisi siklus/);
  });

  it('menolak kode yang sudah dipakai pola aktif', async () => {
    await expect(schedulerService.saveShift({ ...shiftDraft, shiftCode: 'PAGI' })).rejects.toThrow(/409/);
  });

  it('crosses midnight diturunkan dari jamnya', async () => {
    const day = await schedulerService.saveShift(shiftDraft);
    expect(day.crossesMidnight).toBe(false);
    const night = await schedulerService.saveShift({
      ...shiftDraft,
      shiftCode: 'LARUT',
      startTime: '23:00',
      endTime: '07:00',
    });
    expect(night.crossesMidnight).toBe(true);
  });

  it('tipe shift beku saat Ubah', async () => {
    const row = await schedulerService.saveShift(
      { ...shiftDraft, shiftCode: 'PAGI', shiftType: 'FLEX', startTime: '', endTime: '', flexBand: '{}' },
      'sh-1',
    );
    expect(row.shiftType).toBe('FIXED');
  });

  it('pola yang masih dirujuk roster tidak bisa dihapus', async () => {
    await expect(schedulerService.deleteShift('sh-1')).rejects.toThrow(/409/);
  });

  it('pola tanpa rujukan boleh dihapus, dan memensiunkan selalu boleh', async () => {
    await schedulerService.deleteShift('sh-4');
    expect((await schedulerService.shifts()).find((row) => row.id === 'sh-4')).toBeUndefined();
    const off = await schedulerService.toggleShift('sh-1');
    expect(off.isActive).toBe(false);
  });

  it('pola siklus tidak pernah muncul di pemilih roster', () => {
    const ids = pickableShifts(SHIFTS).map((row) => row.id);
    expect(ids).toContain('sh-1');
    expect(ids).not.toContain('sh-4');
  });
});

describe('Roster', () => {
  it('menolak baris tanpa shift dan tanpa penanda hari libur', async () => {
    await expect(
      schedulerService.saveAssignment({ employeeId: 'emp-rina', workDate: '2026-08-03', shiftId: '', isOffDay: false }),
    ).rejects.toThrow(/422/);
  });

  it('menolak dua baris pada karyawan × tanggal yang sama', async () => {
    await expect(
      schedulerService.saveAssignment({
        employeeId: 'emp-rina',
        workDate: '2026-07-27',
        shiftId: 'sh-1',
        isOffDay: false,
      }),
    ).rejects.toThrow(/409/);
  });

  it('sentuhan tangan selalu dicap individual', async () => {
    const row = await schedulerService.saveAssignment(
      { employeeId: 'emp-sari', workDate: '2026-07-28', shiftId: 'sh-1', isOffDay: false },
      'as-5',
    );
    expect(row.assignmentSource).toBe('INDIVIDUAL');
  });

  it('baris yang terikat tukar belum diputuskan tidak bisa dihapus', async () => {
    // as-1 dan as-4 terikat sw-1 yang masih menunggu keputusan.
    await expect(schedulerService.deleteAssignment('as-1')).rejects.toThrow(/409/);
    await schedulerService.deleteAssignment('as-3');
    expect((await schedulerService.assignments()).find((row) => row.id === 'as-3')).toBeUndefined();
  });
});

describe('Bulk assignment', () => {
  const draft = {
    employeeIds: ['emp-rina', 'emp-budi'],
    from: '2026-07-27',
    to: '2026-07-29',
    shiftId: 'sh-2',
  };

  it('pratinjau menghitung tanpa menggerakkan satu baris pun', async () => {
    const preview = schedulerService.previewBulk(draft);
    // Rina: 27 individual (skip), 28 bulk (tulis ulang), 29 bulk (tulis ulang).
    // Budi: 27 bulk (tulis ulang), 28 individual (skip), 29 belum ada (buat).
    expect(preview.created).toBe(1);
    expect(preview.overwritten).toBe(3);
    expect(preview.skippedIndividual).toBe(2);
    const rows = await schedulerService.assignments();
    expect(rows.find((row) => row.id === 'as-2')!.shiftId).toBe('sh-1');
  });

  it('melangkahi baris individual dan baris yang terikat tukar', async () => {
    await schedulerService.runBulk(draft);
    const rows = await schedulerService.assignments();
    // as-1 milik Rina 27 Juli: individual DAN terikat sw-1 → tidak tersentuh.
    expect(rows.find((row) => row.id === 'as-1')!.shiftId).toBe('sh-1');
    // as-2 hasil bulk sebelumnya → ditulis ulang.
    expect(rows.find((row) => row.id === 'as-2')!.shiftId).toBe('sh-2');
    // as-8 individual milik Budi → tidak tersentuh.
    expect(rows.find((row) => row.id === 'as-8')!.isOffDay).toBe(true);
  });

  it('menolak rentang terbalik dan pilihan kosong', async () => {
    await expect(schedulerService.runBulk({ ...draft, employeeIds: [] })).rejects.toThrow(/422/);
    await expect(schedulerService.runBulk({ ...draft, to: '2026-07-20' })).rejects.toThrow(/mendahului/);
    await expect(schedulerService.runBulk({ ...draft, shiftId: '' })).rejects.toThrow(/pola shift/);
  });
});

describe('Tukar shift', () => {
  it('hanya sah pada tanggal kerja yang sama', async () => {
    await expect(schedulerService.createSwap('as-1', 'as-5')).rejects.toThrow(/tanggal kerja yang sama/);
  });

  it('menolak baris yang sudah terikat tukar belum diputuskan', async () => {
    await expect(schedulerService.createSwap('as-1', 'as-9')).rejects.toThrow(/409/);
  });

  it('permintaan baru tidak menggerakkan roster', async () => {
    const swap = await schedulerService.createSwap('as-7', 'as-9');
    expect(swap.swapStatus).toBe('PENDING_APPROVAL');
    const rows = await schedulerService.assignments();
    expect(rows.find((row) => row.id === 'as-7')!.assignmentSource).toBe('BULK');
  });

  it('pengaju tidak pernah memutuskan tukarnya sendiri', async () => {
    // sw-1 diajukan atas baris Rina; identitas sesi adalah Hendra, jadi boleh.
    // Yang dilarang: tukar yang barisnya milik Hendra sendiri.
    const swap = await schedulerService.createSwap('as-9', 'as-7');
    await expect(schedulerService.decideSwap(swap.id, 'APPROVED')).rejects.toThrow(/403/);
  });

  it('disetujui menukar pola kedua baris sebagai satu paket', async () => {
    const before = await schedulerService.assignments();
    const mine = before.find((row) => row.id === 'as-1')!;
    const other = before.find((row) => row.id === 'as-4')!;

    await schedulerService.decideSwap('sw-1', 'APPROVED');

    const after = await schedulerService.assignments();
    expect(after.find((row) => row.id === 'as-1')!.shiftId).toBe(other.shiftId);
    expect(after.find((row) => row.id === 'as-4')!.shiftId).toBe(mine.shiftId);
    expect(after.find((row) => row.id === 'as-1')!.assignmentSource).toBe('SWAP');
    expect(after.find((row) => row.id === 'as-4')!.assignmentSource).toBe('SWAP');
  });

  it('ditolak tidak menyentuh roster sama sekali', async () => {
    const before = await schedulerService.assignments();
    await schedulerService.decideSwap('sw-1', 'REJECTED');
    const after = await schedulerService.assignments();
    expect(after).toEqual(before);
  });

  it('penarikan menyisakan jejak Cancelled', async () => {
    const swap = await schedulerService.createSwap('as-9', 'as-7');
    const row = await schedulerService.withdrawSwap(swap.id);
    expect(row.swapStatus).toBe('CANCELLED');
    expect((await schedulerService.swaps()).find((item) => item.id === swap.id)).toBeTruthy();
  });

  it('permintaan yang sudah diputuskan tidak bisa diputuskan lagi', async () => {
    await expect(schedulerService.decideSwap('sw-2', 'APPROVED')).rejects.toThrow(/422/);
  });
});

describe('Aturan tanggal', () => {
  it('rentang inklusif di kedua ujung', () => {
    expect(datesBetween('2026-07-27', '2026-07-29')).toEqual(['2026-07-27', '2026-07-28', '2026-07-29']);
  });

  it('satu minggu selalu tujuh hari', () => {
    const week = weekDates('2026-07-27');
    expect(week).toHaveLength(7);
    expect(week[0]).toBe('2026-07-27');
    expect(week[6]).toBe('2026-08-02');
  });
});
