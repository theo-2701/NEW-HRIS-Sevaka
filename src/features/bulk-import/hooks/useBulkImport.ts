import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bulkImportService } from '@/features/bulk-import/services/bulk-import.service';
import type { ImportSession } from '@/features/bulk-import/types';
import { toast } from '@/store/ui.store';

const keys = { all: ['bulk-import'] as const };
const busy = (status: string) => status === 'VALIDATING' || status === 'PROCESSING';

/** Pola bertiket: survei ulang selama ada batch yang masih diperiksa/dikirim. */
export const useImportBatches = () =>
  useQuery({
    queryKey: [...keys.all, 'batches'],
    queryFn: () => bulkImportService.list(),
    refetchInterval: (query) => (query.state.data?.some((row) => busy(row.importStatus)) ? 1000 : false),
  });

export const useImportRows = (id: string | null, failedOnly: boolean, status: string | undefined) =>
  useQuery({
    queryKey: [...keys.all, 'rows', id, failedOnly, status],
    queryFn: () => bulkImportService.rows(id!, failedOnly),
    enabled: Boolean(id),
  });

function useImportMutation<TVars, TResult>(fn: (vars: TVars) => Promise<TResult>, message: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      toast(message, 'ok');
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export const useUploadImport = (session: ImportSession) =>
  useImportMutation(
    ({ file, key }: { file: File; key: string }) => bulkImportService.upload(session, file, key),
    'File received and being checked. Nothing is sent until another HR Manager approves it.',
  );

export const useApproveImport = (session: ImportSession) =>
  useImportMutation(
    ({ id, domain, note }: { id: string; domain: string; note: string }) => bulkImportService.approve(session, id, domain, note),
    'Approved. Invitations are being sent to every valid row.',
  );

export const useCancelImport = () =>
  useImportMutation(({ id, reason }: { id: string; reason: string }) => bulkImportService.cancel(id, reason), 'Import cancelled.');
