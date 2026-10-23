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
        ? 'Leave type updated. Tightened rules only apply to requests from now on.'
        : 'Leave type saved and available in the request form right away.',
    }),
  );

export const useDeleteLeaveType = () =>
  useSettingsMutation<{ id: string }>(
    ({ id }) => settingsService.deleteLeaveType(id),
    () => ({ text: 'Row deleted.', tone: 'warn' }),
  );

export const useCreateAccrualPolicy = () =>
  useSettingsMutation<AccrualPolicyDraft>(
    (draft) => settingsService.createAccrualPolicy(draft).then(() => undefined),
    () => ({ text: 'Accrual policy saved. The monthly run reads it from its effective date.' }),
  );

export const useEndAccrualPolicy = () =>
  useSettingsMutation<{ id: string; effectiveUntil: string }>(
    ({ id, effectiveUntil }) => settingsService.endAccrualPolicy(id, effectiveUntil),
    () => ({ text: 'Policy ended. Accrual stops reading it from next month.', tone: 'warn' }),
  );

export const useSaveBlackout = () =>
  useSettingsMutation<{ draft: BlackoutDraft; id?: string }>(
    ({ draft, id }) => settingsService.saveBlackout(draft, id).then(() => undefined),
    (_result, { id }) => ({
      text: id
        ? 'Blackout period updated.'
        : 'Blackout period saved. The submit gate reads it from now on.',
    }),
  );

export const useDeleteBlackout = () =>
  useSettingsMutation<{ id: string }>(
    ({ id }) => settingsService.deleteBlackout(id),
    () => ({ text: 'Blackout period deleted.', tone: 'warn' }),
  );
