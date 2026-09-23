import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { announcementService } from '@/features/announcement/services/announcement.service';
import { toast } from '@/store/ui.store';
import type { AnnouncementDraft, AnnouncementFilter } from '@/features/announcement/types';

export const announcementKeys = {
  all: ['announcement'] as const,
  list: (filter: AnnouncementFilter) => ['announcement', 'list', filter] as const,
  detail: (id: string) => ['announcement', 'detail', id] as const,
  files: ['announcement', 'company-files'] as const,
  mine: (role: string) => ['announcement', 'mine', role] as const,
  myDetail: (role: string, id: string) => ['announcement', 'mine', role, id] as const,
};

export const useAnnouncements = (filter: AnnouncementFilter) =>
  useQuery({ queryKey: announcementKeys.list(filter), queryFn: () => announcementService.search(filter) });

export const useAnnouncement = (id: string | undefined) =>
  useQuery({
    queryKey: announcementKeys.detail(id ?? ''),
    queryFn: () => announcementService.get(id!),
    enabled: Boolean(id),
    retry: false,
  });

export const useCompanyFiles = () =>
  useQuery({ queryKey: announcementKeys.files, queryFn: () => announcementService.companyFiles() });

export const useMyAnnouncements = (role: string) =>
  useQuery({ queryKey: announcementKeys.mine(role), queryFn: () => announcementService.myList(role) });

export const useMyAnnouncement = (role: string, id: string | null) =>
  useQuery({
    queryKey: announcementKeys.myDetail(role, id ?? ''),
    queryFn: () => announcementService.myGet(role, id!),
    enabled: Boolean(id),
    retry: false,
  });

function useAnnouncementMutation<TVars, TResult>(mutationFn: (vars: TVars) => Promise<TResult>, success: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      toast(success, 'ok');
      void queryClient.invalidateQueries({ queryKey: announcementKeys.all });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export const useCreateAnnouncement = () =>
  useAnnouncementMutation((draft: AnnouncementDraft) => announcementService.create(draft), 'Rancangan pengumuman tersimpan.');

export const useUpdateAnnouncement = () =>
  useAnnouncementMutation(
    ({ id, patch }: { id: string; patch: Partial<AnnouncementDraft> }) => announcementService.update(id, patch),
    'Rancangan pengumuman diperbarui.',
  );

export const usePublishAnnouncement = () =>
  useAnnouncementMutation((id: string) => announcementService.publish(id), 'Pengumuman diterbitkan.');

export const useAttachFile = () =>
  useAnnouncementMutation(
    ({ id, documentId }: { id: string; documentId: string }) => announcementService.attach(id, documentId),
    'Lampiran ditautkan.',
  );

export const useDetachFile = () =>
  useAnnouncementMutation(
    ({ id, attachmentId }: { id: string; attachmentId: string }) => announcementService.detach(id, attachmentId),
    'Lampiran dicabut.',
  );
