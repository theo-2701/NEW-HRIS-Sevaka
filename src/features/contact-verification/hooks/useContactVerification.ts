import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { contactVerificationService } from '@/features/contact-verification/services/contact-verification.service';
import type { CancelReason, ContactKind, ContactVerification, QueueFilter } from '@/features/contact-verification/types';
import { formatDate } from '@/lib/format';
import { toast } from '@/store/ui.store';

const keys = { all: ['contact-verification'] as const };

export const useContactQueue = (filter: { keyword: string; status: QueueFilter }) =>
  useQuery({ queryKey: [...keys.all, filter], queryFn: () => contactVerificationService.search(filter) });

export function useSendLinks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ kind, ids }: { kind: ContactKind; ids: string[] }) =>
      contactVerificationService.sendLinks(kind, ids),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: keys.all }),
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export function useCancelAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ row, reasonCode, reasonText }: { row: ContactVerification; reasonCode: CancelReason | ''; reasonText: string }) =>
      contactVerificationService.cancelAccess(row, reasonCode, reasonText),
    onSuccess: (result, { row }) => {
      toast(
        `Access for ${row.employeeName} revoked now. An offboarding request (effective ${formatDate(result.effectiveDate)}) awaits approval.`,
        'ok',
      );
      void queryClient.invalidateQueries({ queryKey: keys.all });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export const useConfirmContact = () =>
  useMutation({ mutationFn: (token: string) => contactVerificationService.confirm(token) });
