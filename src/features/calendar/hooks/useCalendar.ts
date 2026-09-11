import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { calendarService } from '@/features/calendar/services/calendar.service';
import { toast } from '@/store/ui.store';
import type { HolidayFilter, WorkCalendarFilter } from '@/features/calendar/services/calendar.service';
import type { HolidayDraft, WorkCalendarDraft } from '@/features/calendar/types';
import type { ToastTone } from '@/store/ui.store';

export const calendarKeys = {
  all: ['calendar'] as const,
  holidays: (filter: HolidayFilter) => ['calendar', 'holidays', filter] as const,
  patterns: (filter: WorkCalendarFilter) => ['calendar', 'work-calendars', filter] as const,
};

export function useHolidays(filter: HolidayFilter) {
  return useQuery({ queryKey: calendarKeys.holidays(filter), queryFn: () => calendarService.holidays(filter) });
}

export function useWorkCalendars(filter: WorkCalendarFilter) {
  return useQuery({ queryKey: calendarKeys.patterns(filter), queryFn: () => calendarService.workCalendars(filter) });
}

function useCalendarMutation<TVars, TResult = void>(
  mutationFn: (vars: TVars) => Promise<TResult>,
  message: (result: TResult, vars: TVars) => { text: string; tone?: ToastTone },
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (result, vars) => {
      const { text, tone = 'ok' } = message(result, vars);
      toast(text, tone);
      void queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export const useSaveHoliday = () =>
  useCalendarMutation<{ draft: HolidayDraft; id?: string; wasDraft?: boolean }>(
    ({ draft, id }) => calendarService.saveHoliday(draft, id).then(() => undefined),
    (_result, { id, wasDraft }) => ({
      text: !id
        ? '201 — libur tersimpan sebagai Draft. Buka "Edit & submit" untuk memulai approval.'
        : wasDraft
          ? '200 — tersimpan sekaligus diajukan; barisnya kini menunggu checker.'
          : '200 — perubahan tersimpan; status approval tidak tersentuh.',
    }),
  );

export const useDecideHoliday = () =>
  useCalendarMutation<{ id: string; kind: 'APPROVED' | 'REJECTED'; note: string }>(
    ({ id, kind, note }) => calendarService.decideHoliday(id, kind, note).then(() => undefined),
    (_result, { kind }) => ({
      text:
        kind === 'APPROVED'
          ? '200 — approval selesai; tanggal itu kini libur yang berlaku.'
          : '200 — approval selesai; barisnya Ditolak dan tetap memegang slotnya.',
      tone: kind === 'APPROVED' ? 'ok' : 'warn',
    }),
  );

export const useDeleteHoliday = () =>
  useCalendarMutation<{ id: string }>(
    ({ id }) => calendarService.deleteHoliday(id),
    () => ({ text: '200 — libur dihapus; slot tanggalnya bebas lagi.', tone: 'warn' }),
  );

export const useSaveWorkCalendar = () =>
  useCalendarMutation<{ draft: WorkCalendarDraft; id?: string }>(
    ({ draft, id }) => calendarService.saveWorkCalendar(draft, id).then(() => undefined),
    (_result, { id }) => ({
      text: id
        ? '200 — pola diperbarui.'
        : '201 — pola kerja tersimpan; ia berlaku ke depan sejak tanggal mulainya.',
    }),
  );

export const useDeleteWorkCalendar = () =>
  useCalendarMutation<{ id: string }>(
    ({ id }) => calendarService.deleteWorkCalendar(id),
    () => ({ text: '200 — pola kerja dihapus.', tone: 'warn' }),
  );
