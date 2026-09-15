import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { financeSecurityService } from '@/features/finance-security/services/finance-security.service';
import { toast } from '@/store/ui.store';
import type { ToastTone } from '@/store/ui.store';
import type {
  Actor,
  DisputeHoldRow,
  ExportInput,
  ExportLogFilter,
  ExportResult,
  HoldFilter,
  HoldTargetType,
  MedicalLogFilter,
  PlaceHoldInput,
  ReleaseHoldResult,
} from '@/features/finance-security/types';

export const financeSecurityKeys = {
  holds: (actor: Actor, filter: HoldFilter) => ['finance-security', 'holds', actor.employeeId, filter] as const,
  targets: (actor: Actor, type: HoldTargetType | '') => ['finance-security', 'targets', actor.employeeId, type] as const,
  exports: (actor: Actor, filter: ExportLogFilter) => ['finance-security', 'exports', actor.employeeId, filter] as const,
  medical: (actor: Actor, filter: MedicalLogFilter) => ['finance-security', 'medical', actor.employeeId, filter] as const,
};

export function useHolds(actor: Actor, filter: HoldFilter = {}) {
  return useQuery({
    queryKey: financeSecurityKeys.holds(actor, filter),
    queryFn: () => financeSecurityService.holds(actor, filter),
    retry: false,
  });
}

export function useHoldTargets(actor: Actor, targetType: HoldTargetType | '') {
  return useQuery({
    queryKey: financeSecurityKeys.targets(actor, targetType),
    queryFn: () => financeSecurityService.holdTargets(actor, targetType as HoldTargetType),
    enabled: Boolean(targetType),
    retry: false,
  });
}

export function useExportLogs(actor: Actor, filter: ExportLogFilter = {}) {
  return useQuery({
    queryKey: financeSecurityKeys.exports(actor, filter),
    queryFn: () => financeSecurityService.exportLogs(actor, filter),
    retry: false,
  });
}

export function useMedicalLogs(actor: Actor, filter: MedicalLogFilter = {}) {
  return useQuery({
    queryKey: financeSecurityKeys.medical(actor, filter),
    queryFn: () => financeSecurityService.medicalAccessLogs(actor, filter),
    retry: false,
  });
}

/** Tanpa kunci: hold dibaca Benefit, Loan, dan Pencairan — seluruh cache dimuat ulang. */
function useSecurityMutation<TVars, TResult>(
  mutationFn: (vars: TVars) => Promise<TResult>,
  message: (result: TResult, vars: TVars) => { text: string; tone?: ToastTone },
  after?: (result: TResult) => void,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (result, vars) => {
      after?.(result);
      const { text, tone = 'ok' } = message(result, vars);
      toast(text, tone);
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export const usePlaceHold = () =>
  useSecurityMutation<{ actor: Actor; input: PlaceHoldInput }, DisputeHoldRow>(
    ({ actor, input }) => financeSecurityService.placeHold(actor, input),
    (row) => ({
      text: `201 Created — hold dipasang pada ${row.targetRequestNo} tanpa sebab (asimetri FD-112). Penandaan pencairan baris ini ditolak selama hold aktif.`,
    }),
  );

export const useReleaseHold = () =>
  useSecurityMutation<{ actor: Actor; hold: DisputeHoldRow; note: string }, ReleaseHoldResult>(
    ({ actor, hold, note }) => financeSecurityService.releaseHold(actor, hold.id, { isActive: false, releasedReasonNote: note }),
    (result) => ({
      text: `200 OK — hold ${result.hold.targetRequestNo} dicabut; baris tetap tersimpan sebagai riwayat.${result.notifiesHrManager ? ' HR Manager dikabari karena pelepasnya Finance Officer.' : ''}`,
    }),
  );

function downloadCsv(fileName: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export const useRunExport = () =>
  useSecurityMutation<{ actor: Actor; input: ExportInput }, ExportResult>(
    ({ actor, input }) => financeSecurityService.runExport(actor, input),
    (result) => ({
      text: `Berkas ${result.fileName} diunduh — ${result.log?.rowCount ?? '?'} baris. Jejak unduhan ditulis dalam transaksi yang sama.`,
    }),
    (result) => downloadCsv(result.fileName, result.csv),
  );
