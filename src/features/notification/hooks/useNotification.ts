import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '@/features/notification/services/notification.service';
import { toast } from '@/store/ui.store';
import type { InboxQuery } from '@/features/notification/types';

export const notificationKeys = {
  all: ['notifications'] as const,
  inbox: (query: InboxQuery) => ['notifications', 'inbox', query] as const,
  unread: ['notifications', 'has-unread'] as const,
};

export const useInbox = (query: InboxQuery) =>
  useQuery({ queryKey: notificationKeys.inbox(query), queryFn: () => notificationService.inbox(query) });

export const useHasUnread = () =>
  useQuery({ queryKey: notificationKeys.unread, queryFn: () => notificationService.hasUnread() });

export const useMarkRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationService.markRead(id),
    onSuccess: ({ changed }) => {
      // Panggilan kedua tetap 200 apa adanya — bukan error (TSD §2.3 aturan tambahan #1).
      toast(changed ? 'Marked as read.' : 'Already read — nothing changed.', changed ? 'ok' : 'info');
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
};
