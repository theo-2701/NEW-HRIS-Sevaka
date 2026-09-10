import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsService } from '@/features/time-off/services/settings.service';
import { toast } from '@/store/ui.store';
import type { AccrualPolicyDraft, BlackoutDraft, LeaveTypeDraft } from '@/features/time-off/types';
import type { ToastTone } from '@/store/ui.store';

export const settingsKeys = {
  all: ['time-off', 'settings'] as const,
  types: ['time-off', 'settings', 'leave-types'] as const,
  policies: ['time-off', 'settings', 'accrual-policies'] as const,
  blackouts: ['time-off', 'settings', 'blackouts'] as const,
};

export function useSettingsLeaveTypes() {
  return useQuery({ queryKey: settingsKeys.types, queryFn: () => settingsService.leaveTypes() });
}

export function useAccrualPolicies() {
  return useQuery({ queryKey: settingsKeys.policies, queryFn: () => settingsService.accrualPolicies() });
}

export function useBlackouts() {
  return useQuery({ queryKey: settingsKeys.blackouts, queryFn: () => settingsService.blackouts() });
}

function useSettingsMutation<TVars, TResult = void>(
  mutationFn: (vars: TVars) => Promise<TResult>,
  message: (result: TResult, vars: TVars) => { text: string; tone?: ToastTone },
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (result, vars) => {
      const { text, tone = 'ok' } = message(result, vars);
      toast(text, tone);
      void queryClient.invalidateQueries({ queryKey: settingsKeys.all });
      // Katalog jenis cuti juga dipakai layar Request dan Balance.
      void queryClient.invalidateQueries({ queryKey: ['time-off'] });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export const useSaveLeaveType = () =>
  useSettingsMutation<{ draft: LeaveTypeDraft; id?: string }>(
    ({ draft, id }) => settingsService.saveLeaveType(draft, id).then(() => undefined),
    (_result, { id }) => ({
      text: id
        ? '200 — jenis cuti diperbarui; aturan yang diperketat hanya berlaku untuk pengajuan sejak sekarang.'
        : '201 — jenis cuti tersimpan dan langsung bisa dipilih di form pengajuan.',
    }),
  );

export const useDeleteLeaveType = () =>
  useSettingsMutation<{ id: string }>(
    ({ id }) => settingsService.deleteLeaveType(id),
    () => ({ text: '200 — baris dihapus.', tone: 'warn' }),
  );

export const useCreateAccrualPolicy = () =>
  useSettingsMutation<AccrualPolicyDraft>(
    (draft) => settingsService.createAccrualPolicy(draft).then(() => undefined),
    () => ({ text: '201 — kebijakan akrual tersimpan; proses bulanan membacanya mulai tanggal berlaku.' }),
  );

export const useEndAccrualPolicy = () =>
  useSettingsMutation<{ id: string; effectiveUntil: string }>(
    ({ id, effectiveUntil }) => settingsService.endAccrualPolicy(id, effectiveUntil),
    () => ({ text: '200 — kebijakan dihentikan; akrual berhenti membacanya mulai bulan berikutnya.', tone: 'warn' }),
  );

export const useSaveBlackout = () =>
  useSettingsMutation<{ draft: BlackoutDraft; id?: string }>(
    ({ draft, id }) => settingsService.saveBlackout(draft, id).then(() => undefined),
    (_result, { id }) => ({
      text: id
        ? '200 — periode blackout diperbarui.'
        : '201 — periode blackout tersimpan; gerbang submit membacanya mulai sekarang.',
    }),
  );

export const useDeleteBlackout = () =>
  useSettingsMutation<{ id: string }>(
    ({ id }) => settingsService.deleteBlackout(id),
    () => ({ text: '200 — periode blackout dihapus.', tone: 'warn' }),
  );
