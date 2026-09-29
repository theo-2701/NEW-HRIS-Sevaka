import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { erasureService } from '@/features/settings/services/erasure.service';
import { settingsService } from '@/features/settings/services/settings.service';
import type {
  ErasureDraft,
  ErasureSearch,
  SettingChange,
  SettingsActor,
  VersionSearch,
} from '@/features/settings/types';

export const settingsKeys = {
  all: ['settings'] as const,
  read: (actor: SettingsActor) => ['settings', 'read', actor.id, actor.role] as const,
  reprimandRule: ['settings', 'reprimand-rule'] as const,
  versions: (actor: SettingsActor, search: VersionSearch) => ['settings', 'versions', actor.id, search] as const,
  erasureAll: ['settings', 'erasure'] as const,
  erasureSearch: (actor: SettingsActor, search: ErasureSearch) =>
    ['settings', 'erasure', 'search', actor.id, search] as const,
  erasureDetail: (actor: SettingsActor, id: string) => ['settings', 'erasure', 'detail', actor.id, id] as const,
  erasureSubjects: ['settings', 'erasure', 'subjects'] as const,
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

/** `A3` — Riwayat Perubahan. */
export const useSettingVersions = (actor: SettingsActor, search: VersionSearch) =>
  useQuery({
    queryKey: settingsKeys.versions(actor, search),
    queryFn: () => settingsService.searchVersions(actor, search),
    placeholderData: keepPreviousData,
    retry: false,
  });

/** `A5`/`A6`/`A7` — Permintaan Penghapusan Data. */
export const useErasureRequests = (actor: SettingsActor, search: ErasureSearch) =>
  useQuery({
    queryKey: settingsKeys.erasureSearch(actor, search),
    queryFn: () => erasureService.search(actor, search),
    placeholderData: keepPreviousData,
    retry: false,
  });

export const useErasureDetail = (actor: SettingsActor, id: string | null) =>
  useQuery({
    queryKey: settingsKeys.erasureDetail(actor, id ?? ''),
    queryFn: () => erasureService.detail(actor, id!),
    enabled: Boolean(id),
    retry: false,
  });

export const useErasureSubjects = () =>
  useQuery({ queryKey: settingsKeys.erasureSubjects, queryFn: () => erasureService.subjects() });

export const useCreateErasure = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ actor, draft }: { actor: SettingsActor; draft: ErasureDraft }) =>
      erasureService.create(actor, draft),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: settingsKeys.erasureAll }),
  });
};
