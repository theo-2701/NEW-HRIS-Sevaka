import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { objectionService } from '@/features/performance/services/objection.service';
import { toast } from '@/store/ui.store';
import type { ObjectionDraft, ObjectionSearch, PerfActor } from '@/features/performance/types';

export const objectionKeys = {
  all: ['performance', 'objections'] as const,
  list: (who: string, query: ObjectionSearch) => ['performance', 'objections', 'list', who, query] as const,
  mine: (who: string) => ['performance', 'objections', 'mine', who] as const,
  detail: (who: string, id: string) => ['performance', 'objections', 'detail', who, id] as const,
  windows: (who: string, query: object) => ['performance', 'objections', 'windows', who, query] as const,
  deadline: ['performance', 'objections', 'deadline-days'] as const,
};

export const useObjections = (actor: PerfActor, query: ObjectionSearch, enabled: boolean) =>
  useQuery({
    queryKey: objectionKeys.list(actor.employeeId, query),
    queryFn: () => objectionService.search(actor, query),
    enabled,
  });

export const useMyObjections = (actor: PerfActor, enabled: boolean) =>
  useQuery({ queryKey: objectionKeys.mine(actor.employeeId), queryFn: () => objectionService.mine(actor), enabled });

export const useObjection = (actor: PerfActor, id: string | null) =>
  useQuery({
    queryKey: objectionKeys.detail(actor.employeeId, id ?? ''),
    queryFn: () => objectionService.get(actor, id!),
    enabled: Boolean(id),
    retry: false,
  });

export const useReopenWindows = (actor: PerfActor, query: { page: number; size: number }, enabled: boolean) =>
  useQuery({
    queryKey: objectionKeys.windows(actor.employeeId, query),
    queryFn: () => objectionService.reopenSearch(actor, query),
    enabled,
  });

export const useDeadlineDays = (enabled: boolean) =>
  useQuery({ queryKey: objectionKeys.deadline, queryFn: () => objectionService.deadlineDays(), enabled });

function useObjectionMutation<TVars, TResult>(mutationFn: (vars: TVars) => Promise<TResult>, success?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      if (success) toast(success, 'ok');
      void queryClient.invalidateQueries({ queryKey: objectionKeys.all });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export const useCreateObjection = (actor: PerfActor) =>
  useObjectionMutation(({ draft, idempotencyKey }: { draft: ObjectionDraft; idempotencyKey: string }) =>
    objectionService.create(actor, draft, idempotencyKey),
  );

export const useAnswerObjection = (actor: PerfActor) =>
  useObjectionMutation(
    ({ id, text, idempotencyKey }: { id: string; text: string; idempotencyKey: string }) =>
      objectionService.answer(actor, id, text, idempotencyKey),
    'Jawaban tersimpan; sanggahan berstatus dijawab.',
  );

export const useReopenWindow = (actor: PerfActor) =>
  useObjectionMutation(({ sheetId, reason, idempotencyKey }: { sheetId: string; reason: string; idempotencyKey: string }) =>
    objectionService.reopen(actor, sheetId, reason, idempotencyKey),
  );
