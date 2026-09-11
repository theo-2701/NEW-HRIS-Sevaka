import { beforeEach, describe, expect, it } from 'vitest';
import { calendarService, resetCalendarMocks } from '@/features/calendar/services/calendar.service';
import { holidayOn, patternFor, resolveDay } from '@/features/calendar/rules';
import { HOLIDAYS, WORK_CALENDARS } from '@/features/calendar/mock-data';
import type { HolidayDraft, WorkCalendarDraft } from '@/features/calendar/types';

const holidayDraft: HolidayDraft = {
  holidayDate: '2026-09-20',
  holidayName: 'HUT Cabang Makassar',
  holidayType: 'REGIONAL',
  scopeLevel: 'LOCATION',
  scopeRef: 'br-4',
  isJointLeave: false,
  source: 'SE HR Makassar',
};

const patternDraft: WorkCalendarDraft = {
  calendarName: 'Finance 4 Hari Kerja',
  scopeLevel: 'UNIT',
  scopeRef: 'unit-fin',
  workingDays: { mon: true, tue: true, wed: true, thu: true, fri: false, sat: false, sun: false },
  effectiveFrom: '2027-01-01',
  effectiveUntil: '',
};

beforeEach(() => {
  resetCalendarMocks();
});

describe('Holiday — dua lapis', () => {
  it('menolak pembuatan baris nasional dari layar ini', async () => {
    await expect(
      calendarService.saveHoliday({ ...holidayDraft, holidayType: 'NATIONAL', scopeLevel: '', scopeRef: '' }),
    ).rejects.toThrow(/422/);
  });

  it('menolak libur regional tanpa scope lengkap', async () => {
    await expect(calendarService.saveHoliday({ ...holidayDraft, scopeRef: '' })).rejects.toThrow(/scope/);
  });

  it('baris baru lahir sebagai Draft', async () => {
    const row = await calendarService.saveHoliday(holidayDraft);
    expect(row.approvalStatus).toBe('DRAFT');
    expect(row.isSystem).toBe(false);
  });

  it('menyimpan baris Draft sekaligus mengajukannya', async () => {
    const draftRow = HOLIDAYS.find((row) => row.approvalStatus === 'DRAFT')!;
    const row = await calendarService.saveHoliday(
      { ...holidayDraft, holidayName: 'HUT Unit Operations' },
      draftRow.id,
    );
    expect(row.approvalStatus).toBe('PENDING_APPROVAL');
  });

  it('slot tanggal × tipe × scope dipegang baris hidup apa pun, termasuk yang ditolak', async () => {
    // hol-6 berstatus REJECTED pada 1 Juni 2026, REGIONAL, br-4.
    await expect(
      calendarService.saveHoliday({ ...holidayDraft, holidayDate: '2026-06-01' }),
    ).rejects.toThrow(/409/);
  });

  it('slot bebas lagi setelah baris yang memegangnya dihapus', async () => {
    await calendarService.deleteHoliday('hol-6');
    const row = await calendarService.saveHoliday({ ...holidayDraft, holidayDate: '2026-06-01' });
    expect(row.holidayDate).toBe('2026-06-01');
  });

  it('tanggal, tipe, dan scope beku saat Ubah', async () => {
    const row = await calendarService.saveHoliday(
      { ...holidayDraft, holidayDate: '2027-01-01', holidayType: 'COMPANY', holidayName: 'Nama baru' },
      'hol-3',
    );
    expect(row.holidayDate).toBe('2026-12-26');
    expect(row.holidayName).toBe('Nama baru');
  });
});

describe('Holiday — maker–checker', () => {
  it('pengaju tidak pernah memutuskan barisnya sendiri', async () => {
    // hol-7 diajukan emp-hendra, yaitu identitas sesi.
    await expect(calendarService.decideHoliday('hol-7', 'APPROVED', '')).rejects.toThrow(/403/);
  });

  it('penolakan butuh alasan', async () => {
    await expect(calendarService.decideHoliday('hol-4', 'REJECTED', '   ')).rejects.toThrow(/alasan/);
  });

  it('menyetujui membuat tanggal itu libur yang berlaku', async () => {
    const row = await calendarService.decideHoliday('hol-4', 'APPROVED', '');
    expect(row.approvalStatus).toBe('APPROVED');
    expect(row.approvedBy).toBe('emp-hendra');
  });

  it('baris yang sudah diputuskan tidak bisa diputuskan lagi', async () => {
    await calendarService.decideHoliday('hol-4', 'APPROVED', '');
    await expect(calendarService.decideHoliday('hol-4', 'REJECTED', 'Berubah pikiran.')).rejects.toThrow(/422/);
  });
});

describe('Holiday — penghapusan', () => {
  it('menolak menghapus baris nasional', async () => {
    await expect(calendarService.deleteHoliday('hol-1')).rejects.toThrow(/422/);
  });

  it('baris yang ditolak boleh dihapus — justru itu cara membebaskan slotnya', async () => {
    await calendarService.deleteHoliday('hol-6');
    const rows = await calendarService.holidays({});
    expect(rows.find((row) => row.id === 'hol-6')).toBeUndefined();
  });

  it('libur yang berlaku boleh dihapus selama belum ada hari kehadiran bernilai di tanggalnya', async () => {
    // hol-3 berlaku pada 26 Desember 2026; dataset kehadiran tidak menyentuh tanggal itu.
    await calendarService.deleteHoliday('hol-3');
    const rows = await calendarService.holidays({});
    expect(rows.find((row) => row.id === 'hol-3')).toBeUndefined();
  });
});

describe('Work calendar', () => {
  it('menolak pola unit tanpa scope', async () => {
    await expect(calendarService.saveWorkCalendar({ ...patternDraft, scopeRef: '' })).rejects.toThrow(/scope/);
  });

  it('menolak rentang yang bertindih pada scope yang sama', async () => {
    await expect(
      calendarService.saveWorkCalendar({ ...patternDraft, scopeRef: 'unit-ops', effectiveFrom: '2026-06-01' }),
    ).rejects.toThrow(/409/);
  });

  it('scope yang pernah berakhir boleh dipakai lagi', async () => {
    const row = await calendarService.saveWorkCalendar({
      ...patternDraft,
      scopeLevel: 'LOCATION',
      scopeRef: 'br-4',
      effectiveFrom: '2026-01-01',
    });
    expect(row.effectiveFrom).toBe('2026-01-01');
  });

  it('scope, hari kerja, dan tanggal mulai beku saat Ubah', async () => {
    const row = await calendarService.saveWorkCalendar(
      {
        ...patternDraft,
        calendarName: 'Operations diganti nama',
        scopeLevel: 'COMPANY',
        scopeRef: '',
        workingDays: { mon: false, tue: false, wed: false, thu: false, fri: false, sat: false, sun: false },
        effectiveFrom: '2020-01-01',
        effectiveUntil: '2027-12-31',
      },
      'wc-2',
    );
    expect(row.scopeLevel).toBe('UNIT');
    expect(row.effectiveFrom).toBe('2026-03-01');
    expect(row.workingDays.sat).toBe(true);
    expect(row.calendarName).toBe('Operations diganti nama');
    expect(row.effectiveUntil).toBe('2027-12-31');
  });

  it('pola company aktif terakhir tidak bisa diakhiri maupun dihapus', async () => {
    await expect(
      calendarService.saveWorkCalendar({ ...patternDraft, scopeLevel: 'COMPANY', scopeRef: '', effectiveUntil: '2027-01-01' }, 'wc-1'),
    ).rejects.toThrow(/terakhir/);
    await expect(calendarService.deleteWorkCalendar('wc-1')).rejects.toThrow(/422/);
  });
});

describe('Kalender efektif — FC-01', () => {
  it('pola paling spesifik yang menang', () => {
    // Rina di Finance/br-1 → hanya pola company yang cocok.
    expect(patternFor(WORK_CALENDARS, 'emp-rina', '2026-07-15')?.id).toBe('wc-1');
    // Sari di Operations → pola unit mengalahkan company.
    expect(patternFor(WORK_CALENDARS, 'emp-sari', '2026-07-15')?.id).toBe('wc-2');
  });

  it('pola yang sudah berakhir tidak ikut dipertimbangkan', () => {
    expect(patternFor(WORK_CALENDARS, 'emp-budi', '2025-06-15')?.id).toBe('wc-3');
    expect(patternFor(WORK_CALENDARS, 'emp-budi', '2026-07-15')?.id).toBe('wc-2');
  });

  it('libur hanya berlaku bila sudah disetujui dan scope-nya cocok', () => {
    expect(holidayOn(HOLIDAYS, 'emp-rina', '2026-08-17')?.id).toBe('hol-1');
    // hol-4 masih menunggu keputusan, jadi belum berlaku.
    expect(holidayOn(HOLIDAYS, 'emp-rina', '2026-08-18')).toBeNull();
  });

  it('roster mengalahkan pola, dan libur mengalahkan keduanya', () => {
    // 29 Juli 2026: Rina punya roster hari libur.
    const rostered = resolveDay(HOLIDAYS, WORK_CALENDARS, 'emp-rina', '2026-07-29');
    expect(rostered.source).toBe('ROSTER');
    expect(rostered.working).toBe(false);

    // 27 Juli 2026: Rina punya roster shift pagi.
    const shift = resolveDay(HOLIDAYS, WORK_CALENDARS, 'emp-rina', '2026-07-27');
    expect(shift.source).toBe('ROSTER');
    expect(shift.label).toBe('Shift Pagi');

    // 17 Agustus 2026: tanpa roster, libur nasional menang.
    const holiday = resolveDay(HOLIDAYS, WORK_CALENDARS, 'emp-rina', '2026-08-17');
    expect(holiday.source).toBe('HOLIDAY');
    expect(holiday.working).toBe(false);
  });

  it('tanpa roster dan tanpa libur, pola yang menentukan', () => {
    // Sabtu 1 Agustus 2026: Operations bekerja, Finance libur.
    expect(resolveDay(HOLIDAYS, WORK_CALENDARS, 'emp-sari', '2026-08-01').working).toBe(true);
    expect(resolveDay(HOLIDAYS, WORK_CALENDARS, 'emp-rina', '2026-08-01').working).toBe(false);
  });
});
