import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { assetService } from '@/features/assets/services/asset.service';
import { toast } from '@/store/ui.store';
import type {
  AssetActor,
  AssetDraft,
  AssetStatus,
  DisposalDraft,
  MaintenanceType,
  ReturnStatus,
} from '@/features/assets/types';

export const assetKeys = {
  all: ['assets'] as const,
  categories: ['assets', 'categories'] as const,
  list: (statuses: AssetStatus[], search: string) => ['assets', 'list', statuses.join(','), search] as const,
  detail: (id: string) => ['assets', 'detail', id] as const,
  history: (id: string) => ['assets', 'history', id] as const,
  disposals: ['assets', 'disposals'] as const,
};

export const useAssetCategories = () =>
  useQuery({ queryKey: assetKeys.categories, queryFn: () => assetService.categories() });

export const useAssets = (statuses: AssetStatus[] = [], search = '') =>
  useQuery({ queryKey: assetKeys.list(statuses, search), queryFn: () => assetService.assets({ statuses, search }) });

export const useAsset = (id: string) =>
  useQuery({ queryKey: assetKeys.detail(id), queryFn: () => assetService.asset(id), enabled: Boolean(id) });

export const useAssetHistory = (id: string) =>
  useQuery({ queryKey: assetKeys.history(id), queryFn: () => assetService.history(id), enabled: Boolean(id) });

export const useDisposals = () => useQuery({ queryKey: assetKeys.disposals, queryFn: () => assetService.disposals() });

function useAssetMutation<TVars, TResult>(
  mutationFn: (vars: TVars) => Promise<TResult>,
  message: (result: TResult) => string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (result) => {
      toast(message(result), 'ok');
      void queryClient.invalidateQueries({ queryKey: assetKeys.all });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

type WithActor<T> = T & { actor: AssetActor };

export const useSaveCategory = () =>
  useAssetMutation(
    ({ actor, draft, id }: WithActor<{ draft: { name: string; maintenanceIntervalDays: string }; id?: string }>) =>
      assetService.saveCategory(actor, draft, id),
    (row) => `Kategori ${row.name} tersimpan.`,
  );

export const useDeleteCategory = () =>
  useAssetMutation(
    ({ actor, id }: WithActor<{ id: string }>) => assetService.deleteCategory(actor, id),
    () => 'Kategori dihapus.',
  );

export const useRegisterAsset = () =>
  useAssetMutation(
    ({ actor, draft }: WithActor<{ draft: AssetDraft }>) => assetService.register(actor, draft),
    (row) =>
      row.lastAssetStatus === 'NOT_AVAILABLE'
        ? `201 — ${row.assetCode} terdaftar, tetapi masih Tidak tersedia sampai datanya lengkap.`
        : `201 — ${row.assetCode} terdaftar dan siap diserahkan.`,
  );

export const useUploadPhoto = () =>
  useAssetMutation(
    ({ actor, id }: WithActor<{ id: string }>) => assetService.uploadPhoto(actor, id),
    (row) => `Foto ${row.assetCode} terunggah.`,
  );

export const useAssign = () =>
  useAssetMutation(
    ({ actor, id, ...payload }: WithActor<{ id: string; employeeId: string; isComplete: boolean; note: string }>) =>
      assetService.assign(actor, id, payload),
    (row) => `${row.assetCode} diserahkan ke ${row.employeeInfo?.nama ?? '—'}.`,
  );

export const useReturnAsset = () =>
  useAssetMutation(
    ({
      actor,
      id,
      ...payload
    }: WithActor<{ id: string; assetStatus: ReturnStatus; assetLocation: string; note: string }>) =>
      assetService.returnAsset(actor, id, payload),
    (row) => `${row.assetCode} dikembalikan.`,
  );

export const useTransfer = () =>
  useAssetMutation(
    ({
      actor,
      id,
      ...payload
    }: WithActor<{
      id: string;
      toBranchId: string;
      transferReason: string;
      transferDate: string;
      photoAttached: boolean;
    }>) => assetService.transfer(actor, id, payload),
    (row) => `${row.assetCode} dipindahkan ke branch baru.`,
  );

export const useMaintain = () =>
  useAssetMutation(
    ({
      actor,
      id,
      ...payload
    }: WithActor<{
      id: string;
      maintenanceType: MaintenanceType;
      maintenanceDate: string;
      cost: string;
      note: string;
    }>) => assetService.maintain(actor, id, payload),
    (row) => `Maintenance ${row.assetCode} tercatat.`,
  );

export const useLease = () =>
  useAssetMutation(
    ({
      actor,
      id,
      ...payload
    }: WithActor<{ id: string; vendorId: string; leaseContractNumber: string; photoAttached: boolean }>) =>
      assetService.lease(actor, id, payload),
    (row) => `Kontrak sewa ${row.assetCode} tersimpan.`,
  );

export const useResidual = () =>
  useAssetMutation(
    ({ actor, id, value }: WithActor<{ id: string; value: string }>) => assetService.setResidual(actor, id, value),
    (row) => `Nilai residu ${row.assetCode} diperbarui.`,
  );

export const useDispose = () =>
  useAssetMutation(
    ({ actor, id, draft }: WithActor<{ id: string; draft: DisposalDraft }>) => assetService.dispose(actor, id, draft),
    (row) => `${row.assetCode} dilepas.`,
  );
