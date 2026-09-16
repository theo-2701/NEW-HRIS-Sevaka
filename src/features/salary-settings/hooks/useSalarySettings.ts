import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { salarySettingsService } from '@/features/salary-settings/services/salary-settings.service';
import { authorizationKeys } from '@/features/payroll-authorization/hooks/usePayrollAuthorization';
import { toast } from '@/store/ui.store';
import type {
  Actor,
  BatchItemInput,
  ComponentDraft,
  ComponentFilter,
  TraitProposalInput,
  UmpFilter,
  ValueProposalInput,
} from '@/features/salary-settings/types';

export const salarySettingsKeys = {
  all: ['salary-settings'] as const,
  components: (filter: ComponentFilter) => ['salary-settings', 'components', filter] as const,
  values: (employeeId: string) => ['salary-settings', 'values', employeeId] as const,
  batches: ['salary-settings', 'batches'] as const,
  ump: (filter: UmpFilter) => ['salary-settings', 'ump', filter] as const,
};

export const useComponents = (filter: ComponentFilter = {}) =>
  useQuery({ queryKey: salarySettingsKeys.components(filter), queryFn: () => salarySettingsService.components(filter) });

export const useEmployeeValues = (employeeId: string) =>
  useQuery({
    queryKey: salarySettingsKeys.values(employeeId),
    queryFn: () => salarySettingsService.employeeValues(employeeId),
    enabled: Boolean(employeeId),
  });

export const useSettingsBatches = () =>
  useQuery({ queryKey: salarySettingsKeys.batches, queryFn: () => salarySettingsService.batches() });

export const useUmpAttestations = (filter: UmpFilter = {}) =>
  useQuery({ queryKey: salarySettingsKeys.ump(filter), queryFn: () => salarySettingsService.umpAttestations(filter) });

/** Usulan yang dibuat di sini langsung mengisi antrean Authorization & Handover. */
function useSettingsMutation<TVars, TResult>(
  mutationFn: (vars: TVars) => Promise<TResult>,
  message: (result: TResult, vars: TVars) => string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (result, vars) => {
      toast(message(result, vars), 'ok');
      void queryClient.invalidateQueries({ queryKey: salarySettingsKeys.all });
      void queryClient.invalidateQueries({ queryKey: authorizationKeys.all });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export const useCreateComponent = () =>
  useSettingsMutation(
    ({ actor, draft }: { actor: Actor; draft: ComponentDraft }) => salarySettingsService.createComponent(actor, draft),
    (row) => `Komponen ${row.componentCode} dibuat dan langsung aktif.`,
  );

export const useRenameComponent = () =>
  useSettingsMutation(
    ({ actor, id, name }: { actor: Actor; id: string; name: string }) =>
      salarySettingsService.renameComponent(actor, id, name),
    (row) => `Nama ${row.componentCode} diperbarui.`,
  );

export const useDeleteComponent = () =>
  useSettingsMutation(
    ({ actor, id }: { actor: Actor; id: string }) => salarySettingsService.deleteComponent(actor, id),
    (row) => `Komponen ${row.id} dihapus.`,
  );

export const useProposeTrait = () =>
  useSettingsMutation(
    ({ actor, id, input }: { actor: Actor; id: string; input: TraitProposalInput }) =>
      salarySettingsService.proposeTraitChange(actor, id, input),
    (row) => `Usulan sifat ${row.componentCode} dikirim — menunggu keputusan HR Manager.`,
  );

export const useProposeValue = () =>
  useSettingsMutation(
    ({ actor, input }: { actor: Actor; input: ValueProposalInput }) =>
      salarySettingsService.proposeValueChange(actor, input),
    (row) => `Usulan ${row.id} dikirim — berlaku ${row.effectiveFrom} bila disetujui.`,
  );

export const useCreateBatch = () =>
  useSettingsMutation(
    ({ actor, name }: { actor: Actor; name: string }) => salarySettingsService.createBatch(actor, name),
    (row) => `Kumpulan ${row.batchName} dibuat sebagai draft.`,
  );

export const useAddBatchItem = () =>
  useSettingsMutation(
    ({ actor, id, item }: { actor: Actor; id: string; item: BatchItemInput }) =>
      salarySettingsService.addBatchItem(actor, id, item),
    (row) => `Anggota ditambahkan — kumpulan ini kini berisi ${row.items.length} baris.`,
  );

export const useRemoveBatchItem = () =>
  useSettingsMutation(
    ({ actor, id, employeeId, componentId }: { actor: Actor; id: string; employeeId: string; componentId: string }) =>
      salarySettingsService.removeBatchItem(actor, id, employeeId, componentId),
    () => 'Anggota dikeluarkan dari kumpulan.',
  );

export const useSubmitBatch = () =>
  useSettingsMutation(
    ({ actor, id }: { actor: Actor; id: string }) => salarySettingsService.submitBatch(actor, id),
    (row) =>
      row.requiresEscalation
        ? `${row.batchName} dikunci dan diajukan — melewati ambang, jadi perlu penyetuju eskalasi.`
        : `${row.batchName} dikunci dan diajukan ke HR Manager.`,
  );

export const useDeleteBatch = () =>
  useSettingsMutation(
    ({ actor, id }: { actor: Actor; id: string }) => salarySettingsService.deleteBatch(actor, id),
    () => 'Kumpulan draft dibatalkan.',
  );
