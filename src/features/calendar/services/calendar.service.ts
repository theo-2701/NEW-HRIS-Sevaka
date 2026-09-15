import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import { acknowledge } from '@/services/decision';
import type { DecisionAck } from '@/services/decision';
import { DAILY } from '@/features/attendance/mock-data';
import { HOLIDAYS, ME, WORK_CALENDARS } from '@/features/calendar/mock-data';
import { APPROVAL_STATUS_LABEL } from '@/features/calendar/types';
import type {
  CalendarHoliday,
  HolidayDraft,
  WorkCalendar,
  WorkCalendarDraft,
} from '@/features/calendar/types';

/**
 * API service Calendar (FSD-001-TIME §1 · UIC-001-TIME §2).
 *
 * Endpoint kontrak:
 *   GET/POST/PATCH/DELETE /holidays · PATCH …/{id}/approve · /reject
 *   GET/POST/PATCH/DELETE /work-calendars
 *
 * Aturan yang ditegakkan di sini:
 *  • Layer nasional disemai sistem — tidak bisa dibuat, diubah, atau dihapus
 *    dari layar ini (422).
 *  • Slot libur adalah **tanggal × tipe × scope**, dan baris hidup apa pun
 *    memegangnya — termasuk yang sudah ditolak (409).
 *  • Baris baru lahir sebagai DRAFT; menyimpan DRAFT sekaligus mengajukannya.
 *  • Setelah tersimpan hanya nama dan sumber yang terbuka; tanggal, tipe, dan
 *    scope beku.
 *  • Menolak butuh alasan (422); pengaju tidak pernah memutuskan barisnya
 *    sendiri (403).
 *  • Libur APPROVED yang sudah dirujuk hari kehadiran bernilai tidak bisa
 *    dihapus (409).
 *  • Pola kerja: hanya nama dan tanggal akhir yang bisa diubah — scope, tujuh
 *    sakelar hari, dan tanggal mulai beku supaya penilaian lampau tidak pernah
 *    ditulis ulang. Dua pola aktif pada scope sama tidak boleh bertindih (409),
 *    dan pola company aktif terakhir tidak boleh dihapus/diakhiri (422).
 */
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

const cloneHoliday = (row: CalendarHoliday): CalendarHoliday => ({ ...row });
const cloneCalendar = (row: WorkCalendar): WorkCalendar => ({ ...row, workingDays: { ...row.workingDays } });

let mockHolidays: CalendarHoliday[] = HOLIDAYS.map(cloneHoliday);
let mockCalendars: WorkCalendar[] = WORK_CALENDARS.map(cloneCalendar);

export function resetCalendarMocks() {
  mockHolidays = HOLIDAYS.map(cloneHoliday);
  mockCalendars = WORK_CALENDARS.map(cloneCalendar);
}

export interface HolidayFilter {
  approvalStatus?: string;
  holidayType?: string;
  from?: string;
  to?: string;
  name?: string;
}

export interface WorkCalendarFilter {
  scopeLevel?: string;
  name?: string;
}

function findHoliday(id: string): CalendarHoliday {
  const row = mockHolidays.find((item) => item.id === id);
  if (!row) throw new Error('404 — baris libur tidak ditemukan.');
  return row;
}

function findCalendar(id: string): WorkCalendar {
  const row = mockCalendars.find((item) => item.id === id);
  if (!row) throw new Error('404 — pola kerja tidak ditemukan.');
  return row;
}

/** Berapa pola company yang masih hidup (tanpa tanggal akhir)? */
function liveCompanyPatterns(): WorkCalendar[] {
  return mockCalendars.filter((row) => row.scopeLevel === 'COMPANY' && !row.effectiveUntil);
}

export const calendarService = {
  async holidays(filter: HolidayFilter = {}): Promise<CalendarHoliday[]> {
    if (MOCK) {
      await delay();
      return mockHolidays
        .filter((row) => {
          if (filter.approvalStatus && row.approvalStatus !== filter.approvalStatus) return false;
          if (filter.holidayType && row.holidayType !== filter.holidayType) return false;
          if (filter.from && row.holidayDate < filter.from) return false;
          if (filter.to && row.holidayDate > filter.to) return false;
          if (filter.name && !row.holidayName.toLowerCase().includes(filter.name.toLowerCase())) return false;
          return true;
        })
        .sort((a, b) => (a.holidayDate < b.holidayDate ? -1 : 1))
        .map(cloneHoliday);
    }
    const { data } = await api.post<{ data: CalendarHoliday[] }>('/holidays/search', { filters: filter });
    return data.data;
  },

  /** Baru → DRAFT. Menyimpan DRAFT = sekaligus mengajukan untuk approval. */
  async saveHoliday(draft: HolidayDraft, id?: string): Promise<CalendarHoliday> {
    if (MOCK) {
      await delay(350);
      const name = draft.holidayName.trim();
      if (!name) throw new Error('422 — nama libur wajib diisi.');

      if (id) {
        const row = findHoliday(id);
        if (row.isSystem) {
          throw new Error('422 — baris nasional disemai sistem dan tidak bisa diubah di layar ini.');
        }
        // Hanya nama dan sumber yang terbuka; tanggal/tipe/scope beku.
        row.holidayName = name;
        row.source = draft.source.trim();
        if (row.approvalStatus === 'DRAFT') row.approvalStatus = 'PENDING_APPROVAL';
        return cloneHoliday(row);
      }

      if (!draft.holidayDate || !draft.holidayType) {
        throw new Error('422 — tanggal, nama, dan tipe libur wajib diisi.');
      }
      if (draft.holidayType === 'NATIONAL') {
        throw new Error('422 — layer nasional disemai sistem dan tidak bisa dibuat di sini.');
      }
      if (draft.holidayType === 'REGIONAL' && (!draft.scopeLevel || !draft.scopeRef)) {
        throw new Error('422 — libur regional butuh scope level dan scope-nya sekaligus.');
      }

      const scopeRef = draft.holidayType === 'REGIONAL' ? draft.scopeRef : null;
      const clash = mockHolidays.find(
        (row) =>
          row.holidayDate === draft.holidayDate &&
          row.holidayType === draft.holidayType &&
          (row.scopeRef ?? null) === scopeRef,
      );
      if (clash) {
        throw new Error(
          `409 — baris ${APPROVAL_STATUS_LABEL[clash.approvalStatus].toLowerCase()} "${clash.holidayName}" sudah memegang slot tanggal × tipe × scope ini. Hapus dulu baris itu.`,
        );
      }

      const row: CalendarHoliday = {
        id: `hol-${mockHolidays.length + 10}`,
        holidayDate: draft.holidayDate,
        holidayName: name,
        holidayType: draft.holidayType,
        scopeLevel: draft.holidayType === 'REGIONAL' ? (draft.scopeLevel as CalendarHoliday['scopeLevel']) : null,
        scopeRef,
        isJointLeave: draft.isJointLeave,
        isSystem: false,
        source: draft.source.trim(),
        approvalStatus: 'DRAFT',
        createdBy: ME,
      };
      mockHolidays = [...mockHolidays, row];
      return cloneHoliday(row);
    }

    const { data } = id
      ? await api.put<CalendarHoliday>(`/holidays/${id}`, { holiday_name: draft.holidayName, source: draft.source })
      : await api.post<CalendarHoliday>('/holidays', draft);
    return data;
  },

  /**
   * `POST /holidays/{id}/approval` (UIC-TIME §2.1.6). Pintu ini MENERIMA
   * keputusan (200) — status baru tertulis saat `workflow.process.completed`
   * dikonsumsi (K9). Catatan opsional di kedua cabang (FSD §1.4).
   */
  async decideHoliday(id: string, kind: 'APPROVED' | 'REJECTED', note: string): Promise<DecisionAck<CalendarHoliday>> {
    if (MOCK) {
      await delay(400);
      const row = findHoliday(id);
      if (row.createdBy === ME) {
        throw new Error('403 — pemisahan tugas: pengaju tidak pernah memutuskan barisnya sendiri.');
      }
      if (row.approvalStatus !== 'PENDING_APPROVAL') {
        throw new Error('422 — hanya baris yang menunggu keputusan yang bisa diputuskan.');
      }
      void note;
      return acknowledge(cloneHoliday(row));
    }
    const { data } = await api.post<DecisionAck<CalendarHoliday>>(`/holidays/${id}/approval`, {
      decision: kind,
      note: note || undefined,
    });
    return data;
  },

  /** Mock saja — pengganti konsumsi `workflow.process.completed` untuk libur. */
  async completeHolidayWorkflow(id: string, kind: 'APPROVED' | 'REJECTED'): Promise<CalendarHoliday> {
    await delay(150);
    const row = findHoliday(id);
    row.approvalStatus = kind;
    row.approvedBy = ME;
    row.approvedAt = new Date().toISOString();
    return cloneHoliday(row);
  },

  async deleteHoliday(id: string): Promise<void> {
    if (MOCK) {
      await delay(250);
      const row = findHoliday(id);
      if (row.isSystem) {
        throw new Error('422 — baris nasional disemai sistem dan tidak bisa dihapus di sini.');
      }
      // Baris ditolak pun boleh dihapus — justru itu cara membebaskan slotnya.
      const scored = DAILY.filter((day) => day.workDate === row.holidayDate).length;
      if (row.approvalStatus === 'APPROVED' && scored) {
        throw new Error(`409 — ${scored} hari kehadiran yang sudah dinilai masih merujuk tanggal ini; liburnya tidak bisa dihapus.`);
      }
      mockHolidays = mockHolidays.filter((item) => item.id !== id);
      return;
    }
    await api.delete(`/holidays/${id}`);
  },

  async workCalendars(filter: WorkCalendarFilter = {}): Promise<WorkCalendar[]> {
    if (MOCK) {
      await delay();
      return mockCalendars
        .filter((row) => {
          if (filter.scopeLevel && row.scopeLevel !== filter.scopeLevel) return false;
          if (filter.name && !row.calendarName.toLowerCase().includes(filter.name.toLowerCase())) return false;
          return true;
        })
        .map(cloneCalendar);
    }
    const { data } = await api.post<{ data: WorkCalendar[] }>('/work-calendars/search', { filters: filter });
    return data.data;
  },

  async saveWorkCalendar(draft: WorkCalendarDraft, id?: string): Promise<WorkCalendar> {
    if (MOCK) {
      await delay(350);
      const name = draft.calendarName.trim();
      if (!name) throw new Error('422 — nama pola wajib diisi.');
      const until = draft.effectiveUntil || null;

      if (id) {
        const row = findCalendar(id);
        if (until && until < row.effectiveFrom) {
          throw new Error('422 — tanggal akhir tidak boleh mendahului tanggal mulai.');
        }
        if (until && row.scopeLevel === 'COMPANY' && liveCompanyPatterns().length === 1) {
          throw new Error('422 — pola company aktif terakhir tidak bisa diakhiri tanpa penggantinya.');
        }
        // Scope, tujuh sakelar hari, dan tanggal mulai beku.
        row.calendarName = name;
        row.effectiveUntil = until;
        return cloneCalendar(row);
      }

      if (!draft.scopeLevel || !draft.effectiveFrom) {
        throw new Error('422 — nama, scope level, dan tanggal mulai wajib diisi.');
      }
      const scopeRef = draft.scopeLevel === 'COMPANY' ? null : draft.scopeRef || null;
      if (draft.scopeLevel !== 'COMPANY' && !scopeRef) {
        throw new Error('422 — pola unit atau lokasi butuh scope-nya.');
      }
      if (until && until < draft.effectiveFrom) {
        throw new Error('422 — tanggal akhir tidak boleh mendahului tanggal mulai.');
      }

      // Dua rentang [from, until] beririsan bila masing-masing mulai sebelum yang lain berakhir.
      const OPEN_END = '9999-12-31';
      const overlap = mockCalendars.find((row) => {
        if (row.scopeLevel !== draft.scopeLevel || (row.scopeRef ?? null) !== scopeRef) return false;
        return row.effectiveFrom <= (until ?? OPEN_END) && draft.effectiveFrom <= (row.effectiveUntil ?? OPEN_END);
      });
      if (overlap) {
        throw new Error('409 — sudah ada pola aktif pada scope itu yang rentangnya bertindih.');
      }

      const row: WorkCalendar = {
        id: `wc-${mockCalendars.length + 10}`,
        calendarName: name,
        scopeLevel: draft.scopeLevel,
        scopeRef,
        workingDays: { ...draft.workingDays },
        effectiveFrom: draft.effectiveFrom,
        effectiveUntil: until,
        createdBy: ME,
      };
      mockCalendars = [...mockCalendars, row];
      return cloneCalendar(row);
    }

    const { data } = id
      ? await api.put<WorkCalendar>(`/work-calendars/${id}`, { calendar_name: draft.calendarName, effective_until: draft.effectiveUntil || null })
      : await api.post<WorkCalendar>('/work-calendars', draft);
    return data;
  },

  async deleteWorkCalendar(id: string): Promise<void> {
    if (MOCK) {
      await delay(250);
      const row = findCalendar(id);
      if (row.scopeLevel === 'COMPANY' && liveCompanyPatterns().length === 1) {
        throw new Error('422 — pola company aktif terakhir tidak bisa dihapus; buat penggantinya dulu.');
      }
      mockCalendars = mockCalendars.filter((item) => item.id !== id);
      return;
    }
    await api.delete(`/work-calendars/${id}`);
  },
};
