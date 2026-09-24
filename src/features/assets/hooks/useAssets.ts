import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { assetService } from '@/features/assets/services/asset.service';
import { toast } from '@/store/ui.store';
import type { AssetDraft, AssetStatus, DisposalDraft, MaintenanceType, ReturnStatus } from '@/features/assets/types';

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

function useAssetMutation<TVars, TResult>(mutationFn: (vars: TVars) => Promise<TResult>, message: (result: TResult) => string) {
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

export const useSaveCategory = () =>
  useAssetMutation(
    ({ draft, id }: { draft: { name: string; maintenanceIntervalDays: string }; id?: string }) =>
      assetService.saveCategory(draft, id),
    (row) => `Kategori ${row.name} tersimpan.`,
  );

export const useDeleteCategory = () =>
  useAssetMutation((id: string) => assetService.deleteCategory(id), () => 'Kategori dihapus.');

export const useRegisterAsset = () =>
  useAssetMutation(
    (draft: AssetDraft) => assetService.register(draft),
    (row) =>
      row.lastAssetStatus === 'NOT_AVAILABLE'
        ? `201 — ${row.assetCode} terdaftar, tetapi masih Tidak tersedia sampai datanya lengkap.`
        : `201 — ${row.assetCode} terdaftar dan siap diserahkan.`,
  );

export const useUploadPhoto = () =>
  useAssetMutation((id: string) => assetService.uploadPhoto(id), (row) => `Foto ${row.assetCode} terunggah.`);

export const useAssign = () =>
  useAssetMutation(
    ({ id, ...payload }: { id: string; employeeId: string; isComplete: boolean; note: string }) =>
      assetService.assign(id, payload),
    (row) => `${row.assetCode} diserahkan ke ${row.employeeInfo?.nama ?? '—'}.`,
  );

export const useReturnAsset = () =>
  useAssetMutation(
    ({ id, ...payload }: { id: string; assetStatus: ReturnStatus; note: string }) => assetService.returnAsset(id, payload),
    (row) => `${row.assetCode} dikembalikan.`,
  );

export const useTransfer = () =>
  useAssetMutation(
    ({ id, ...payload }: { id: string; toBranchId: string; toEmployeeId: string }) => assetService.transfer(id, payload),
    (row) => `${row.assetCode} dipindahkan — dua event serah-terima tercatat.`,
  );

export const useMaintain = () =>
  useAssetMutation(
    ({
      id,
      ...payload
    }: {
      id: string;
      maintenanceType: MaintenanceType;
      maintenanceDate: string;
      cost: string;
      note: string;
    }) => assetService.maintain(id, payload),
    (row) => `Maintenance ${row.assetCode} tercatat.`,
  );

export const useLease = () =>
  useAssetMutation(
    ({ id, ...payload }: { id: string; vendorId: string; leaseContractNumber: string }) => assetService.lease(id, payload),
    (row) => `Kontrak sewa ${row.assetCode} tersimpan.`,
  );

export const useResidual = () =>
  useAssetMutation(
    ({ id, value }: { id: string; value: string }) => assetService.setResidual(id, value),
    (row) => `Nilai residu ${row.assetCode} diperbarui.`,
  );

export const useDispose = () =>
  useAssetMutation(
    ({ id, draft }: { id: string; draft: DisposalDraft }) => assetService.dispose(id, draft),
    (row) => `${row.assetCode} dilepas.`,
  );

export const useCancelAuction = () =>
  useAssetMutation((id: string) => assetService.cancelAuction(id), (row) => `Lelang ${row.assetCode} dibatalkan.`);
