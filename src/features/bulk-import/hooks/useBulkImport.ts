import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bulkImportService } from '@/features/bulk-import/services/bulk-import.service';
import type { ImportBatch, ImportFilter, RowState } from '@/features/bulk-import/types';
import { toast } from '@/store/ui.store';

const keys = { all: ['employee-imports'] as const };

/** Batch belum tuntas di latar → muat ulang tiap 1 detik supaya statusnya bergerak. */
const busy = (status?: ImportBatch['importStatus']) => status === 'VALIDATING' || status === 'PROCESSING';

export function useImportBatches(filter: ImportFilter) {
  return useQuery({
    queryKey: [...keys.all, 'search', filter],
    queryFn: () => bulkImportService.search(filter),
    refetchInterval: (query) => ((query.state.data ?? []).some((row) => busy(row.importStatus)) ? 1000 : false),
  });
}

export function useImportBatch(id: string | null) {
  return useQuery({
    queryKey: [...keys.all, 'detail', id],
    queryFn: () => bulkImportService.detail(id!),
    enabled: Boolean(id),
    refetchInterval: (query) => (busy(query.state.data?.importStatus) ? 1000 : false),
  });
}

export function useImportRows(id: string | null, rowState: RowState[], status?: ImportBatch['importStatus']) {
  return useQuery({
    // Status ikut kunci: baris VALID berubah jadi IMPORTED saat batch selesai.
    queryKey: [...keys.all, 'rows', id, rowState, status],
    queryFn: () => bulkImportService.rows(id!, rowState),
    enabled: Boolean(id),
  });
}

function useImportMutation<TVars, TResult>(mutationFn: (vars: TVars) => Promise<TResult>, message?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      if (message) toast(message, 'ok');
      void queryClient.invalidateQueries({ queryKey: keys.all });
    },
    onError: (error: Error) => {
      // 409/422 juga mengubah keadaan server (batch REJECTED_FILE tercatat, status berubah) → muat ulang.
      void queryClient.invalidateQueries({ queryKey: keys.all });
      toast(error.message, 'danger');
    },
  });
}

export const useUploadImport = () =>
  useImportMutation(({ file, key }: { file: File; key: string }) => bulkImportService.upload(file, key));

export const useApproveImport = () =>
  useImportMutation(
    ({ id, note, emailDomainId }: { id: string; note: string; emailDomainId?: string }) =>
      bulkImportService.approve(id, note, emailDomainId),
    'Batch approved. The invitations are being sent.',
  );

export const useCancelImport = () =>
  useImportMutation(
    ({ id, reason }: { id: string; reason: string }) => bulkImportService.cancel(id, reason),
    'Batch cancelled. No invitation was sent; the rows stay on record.',
  );
