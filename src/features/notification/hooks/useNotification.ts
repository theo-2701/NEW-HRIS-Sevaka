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
    mutationFn: ({ id }: { id: string; wasRead: boolean }) => notificationService.markRead(id),
    // Varian toast dari status baris di grid SEBELUM klik, bukan dari respons — kedua panggilan sama-sama
    // 200 berbentuk sama (FSD-NOTIFICATION 0.6 §1.2).
    onSuccess: (_result, { wasRead }) => {
      toast(wasRead ? 'Already read — nothing changed.' : 'Marked as read.', 'info');
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
};
