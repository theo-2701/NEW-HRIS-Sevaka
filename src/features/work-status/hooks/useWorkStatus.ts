import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { workStatusService } from '@/features/work-status/services/work-status.service';
import type { WorkStatusFilter, WorkStatusInput } from '@/features/work-status/types';
import { toast } from '@/store/ui.store';

const keys = { all: ['work-status'] as const };

export function useWorkStatuses(filter: WorkStatusFilter) {
  return useQuery({ queryKey: [...keys.all, filter], queryFn: () => workStatusService.search(filter) });
}

/** Simpan baru (`id` kosong) atau ubah; juga dipakai Deactivate/Activate (PUT dengan `isActive` terbalik). */
export function useSaveWorkStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: WorkStatusInput }) =>
      id ? workStatusService.update(id, input) : workStatusService.create(input),
    onSuccess: (_row, { id }) => {
      toast(id ? 'The work status was saved.' : 'The work status was added.', 'ok');
      void queryClient.invalidateQueries({ queryKey: keys.all });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}
