import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tempAssignmentService } from '@/features/temp-assignment/services/temp-assignment.service';
import type { TaFilter } from '@/features/temp-assignment/services/temp-assignment.service';
import { taEmployeeName } from '@/features/temp-assignment/mock-data';
import type { TaAction, TaDraft, TaSession } from '@/features/temp-assignment/types';
import { toast } from '@/store/ui.store';

const keys = {
  all: ['temp-assignment'] as const,
  list: (filter: TaFilter) => ['temp-assignment', 'list', filter] as const,
  seats: (orgUnitId: string) => ['temp-assignment', 'seats', orgUnitId] as const,
};

export const useTempAssignments = (filter: TaFilter) =>
  useQuery({ queryKey: keys.list(filter), queryFn: () => tempAssignmentService.list(filter, taEmployeeName) });

export const useVacantSeats = (orgUnitId: string) =>
  useQuery({
    queryKey: keys.seats(orgUnitId),
    queryFn: () => tempAssignmentService.vacantSeats(orgUnitId),
    enabled: Boolean(orgUnitId),
  });

const ACTION_DONE: Record<TaAction, string> = {
  approve: 'Assignment approved. It becomes active on its start date.',
  reject: 'Assignment rejected.',
  cancel: 'Assignment cancelled.',
  return: 'Employee returned early; the assignment seat is released.',
  extend: 'Return date extended.',
};

function useTaMutation<TVars>(fn: (vars: TVars) => Promise<unknown>, message: (vars: TVars) => string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (_result, vars) => {
      toast(message(vars), 'ok');
      void queryClient.invalidateQueries({ queryKey: keys.all });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export const useCreateTempAssignment = (session: TaSession) =>
  useTaMutation<{ draft: TaDraft; idempotencyKey: string }>(
    ({ draft, idempotencyKey }) => tempAssignmentService.create(session, draft, idempotencyKey),
    () => 'Assignment submitted for approval.',
  );

export const useTaAction = (session: TaSession) =>
  useTaMutation<{ id: string; action: Exclude<TaAction, 'extend'> }>(
    ({ id, action }) => tempAssignmentService.act(session, id, action),
    ({ action }) => ACTION_DONE[action],
  );

export const useExtendTempAssignment = (session: TaSession) =>
  useTaMutation<{ id: string; returnDate: string }>(
    ({ id, returnDate }) => tempAssignmentService.extend(session, id, returnDate),
    () => ACTION_DONE.extend,
  );
