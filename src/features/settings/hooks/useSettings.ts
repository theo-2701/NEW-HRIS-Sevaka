import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsService } from '@/features/settings/services/settings.service';
import type { SettingChange, SettingsActor } from '@/features/settings/types';

export const settingsKeys = {
  all: ['settings'] as const,
  read: (actor: SettingsActor) => ['settings', 'read', actor.id, actor.role] as const,
  reprimandRule: ['settings', 'reprimand-rule'] as const,
};

export const useSettings = (actor: SettingsActor) =>
  useQuery({ queryKey: settingsKeys.read(actor), queryFn: () => settingsService.read(actor), retry: false });

export const useReprimandRule = () =>
  useQuery({ queryKey: settingsKeys.reprimandRule, queryFn: () => settingsService.reprimandRule() });

/** Hasil & galat A2 ditampilkan lewat modal di layar (WKT-6/WKT-7), bukan toast. */
export const useSaveSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ actor, changes }: { actor: SettingsActor; changes: SettingChange[] }) =>
      settingsService.write(actor, changes),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: settingsKeys.all }),
  });
};
