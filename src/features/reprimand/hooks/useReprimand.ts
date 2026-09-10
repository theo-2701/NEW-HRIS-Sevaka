import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reprimandService } from '@/features/reprimand/services/reprimand.service';
import { toast } from '@/store/ui.store';
import type { PolicyMode, Reprimand, ReprimandCategory, ReprimandDraft } from '@/features/reprimand/types';
import type { ToastTone } from '@/store/ui.store';

export const reprimandKeys = {
  all: ['reprimands'] as const,
  list: ['reprimands', 'list'] as const,
  standing: ['reprimands', 'standing'] as const,
  categories: ['reprimands', 'categories'] as const,
  policy: ['reprimands', 'policy'] as const,
};

export function useReprimands() {
  return useQuery({ queryKey: reprimandKeys.list, queryFn: () => reprimandService.list() });
}

export function useStanding() {
  return useQuery({ queryKey: reprimandKeys.standing, queryFn: () => reprimandService.standing() });
}

export function useReprimandCategories() {
  return useQuery({ queryKey: reprimandKeys.categories, queryFn: () => reprimandService.categories() });
}

export function useReprimandPolicy() {
  return useQuery({ queryKey: reprimandKeys.policy, queryFn: () => reprimandService.policy() });
}

/** Semua mutasi menyegarkan daftar, standing, dan konfigurasi sekaligus. */
function useReprimandMutation<TVars, TResult = void>(
  mutationFn: (vars: TVars) => Promise<TResult>,
  message: (result: TResult, vars: TVars) => { text: string; tone?: ToastTone },
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (result, vars) => {
      const { text, tone = 'ok' } = message(result, vars);
      toast(text, tone);
      void queryClient.invalidateQueries({ queryKey: reprimandKeys.all });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export const useCreateReprimand = () =>
  useReprimandMutation<ReprimandDraft, Reprimand>(
    (draft) => reprimandService.create(draft),
    (row) => ({
      text: `${row.id} diajukan. Snapshot dibekukan; menunggu persetujuan checker.`,
      tone: 'info',
    }),
  );

export const useApproveReprimand = () =>
  useReprimandMutation<{ id: string; note: string }>(
    ({ id, note }) => reprimandService.approve(id, note),
    () => ({ text: 'Reprimand disetujui dan aktif. Standing dikirim ke performance-service.' }),
  );

export const useRevokeReprimand = () =>
  useReprimandMutation<{ id: string; note: string }>(
    ({ id, note }) => reprimandService.revoke(id, note),
    () => ({ text: 'Reprimand dicabut. Statusnya tidak bisa diaktifkan lagi.', tone: 'warn' }),
  );

export const useSaveCategory = () =>
  useReprimandMutation<{ category: ReprimandCategory; originalCode?: string }>(
    ({ category, originalCode }) => reprimandService.saveCategory(category, originalCode),
    (_result, { category, originalCode }) => ({
      text: originalCode ? `Kategori ${category.code} diperbarui.` : `Kategori ${category.code} ditambahkan.`,
    }),
  );

export const useDeactivateCategory = () =>
  useReprimandMutation<{ code: string }>(
    ({ code }) => reprimandService.deactivateCategory(code),
    (_result, { code }) => ({
      text: `${code} dinonaktifkan (soft — tidak ada hard-delete di server).`,
      tone: 'warn',
    }),
  );

export const useSavePolicy = () =>
  useReprimandMutation<{ mode: PolicyMode }>(
    ({ mode }) => reprimandService.savePolicy(mode),
    (_result, { mode }) => ({ text: `Mode kebijakan standing disimpan: ${mode}.` }),
  );
