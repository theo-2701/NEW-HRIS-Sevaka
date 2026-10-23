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
  useCalendarMutation<{ draft: HolidayDraft; id?: string; wasDraft?: boolean; submit?: boolean }>(
    ({ draft, id, submit }) => calendarService.saveHoliday(draft, id, submit).then(() => undefined),
    (_result, { id, wasDraft, submit }) => ({
      text: !id
        ? 'Holiday saved as Draft. Open "Edit & submit" to start approval.'
        : wasDraft && submit
          ? 'Saved and submitted; the row now waits for the checker.'
          : wasDraft
            ? 'Saved; the row stays Draft and has not been submitted.'
            : 'Changes saved; the approval status is untouched.',
    }),
  );

/**
 * Keputusan checker (K9): pintu keputusan kembali 200 "diterima", lalu status
 * ditulis saat penyelesaian workflow dikonsumsi — dua peristiwa berurutan.
 */
export function useDecideHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, kind, note }: { id: string; kind: 'APPROVED' | 'REJECTED'; note: string }) => {
      await calendarService.decideHoliday(id, kind, note);
      return kind;
    },
    onSuccess: async (kind, { id }) => {
      toast('Decision received and passed on to the approval process.', 'info');
      await calendarService.completeHolidayWorkflow(id, kind);
      toast(
        kind === 'APPROVED'
          ? 'Approved. That date is now an effective holiday.'
          : 'Rejected. The row keeps holding its slot until deleted.',
        kind === 'APPROVED' ? 'ok' : 'warn',
      );
      void queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export const useDeleteHoliday = () =>
  useCalendarMutation<{ id: string }>(
    ({ id }) => calendarService.deleteHoliday(id),
    () => ({ text: 'Holiday deleted; its date slot is free again.', tone: 'warn' }),
  );

export const useSaveWorkCalendar = () =>
  useCalendarMutation<{ draft: WorkCalendarDraft; id?: string }>(
    ({ draft, id }) => calendarService.saveWorkCalendar(draft, id).then(() => undefined),
    (_result, { id }) => ({
      text: id
        ? 'Pattern updated.'
        : 'Work pattern saved. It applies forward from its start date.',
    }),
  );

export const useDeleteWorkCalendar = () =>
  useCalendarMutation<{ id: string }>(
    ({ id }) => calendarService.deleteWorkCalendar(id),
    () => ({ text: 'Work pattern deleted.', tone: 'warn' }),
  );
