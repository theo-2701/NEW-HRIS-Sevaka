import { Bell } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Panel, PanelLink } from '@/features/dashboard/home/Panel';
import { notificationKeys, useInbox } from '@/features/notification/hooks/useNotification';
import { notificationService } from '@/features/notification/services/notification.service';
import { referenceLink, typeLabel } from '@/features/notification/rules';
import { NOTIFICATION_PATH } from '@/features/notification/types';
import type { InboxRow } from '@/features/notification/types';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

const LATEST = { sortBy: 'created_at', sortDirection: 'desc', page: 1, size: 5 } as const;

/**
 * Notifikasi — potongan singkat Kotak Masuk (FSD-NOTIFICATION · `N1`): lima kejadian terbaru, titik
 * untuk yang belum dibaca. Klik = tandai dibaca diam-diam (`N2`) lalu buka perkaranya; tanpa tautan
 * berkontrak → ke Kotak Masuk. Bukan pengganti menu Notification, hanya pintu cepatnya.
 */
export function NotificationsPanel({ className }: { className?: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useInbox(LATEST);
  const rows = data?.data ?? [];
  const unread = rows.filter((row) => !row.isRead).length;

  const open = (row: InboxRow) => {
    if (!row.isRead) {
      void notificationService
        .markRead(row.id)
        .then(() => queryClient.invalidateQueries({ queryKey: notificationKeys.all }));
    }
    navigate(referenceLink(row)?.to ?? NOTIFICATION_PATH);
  };

  return (
    <Panel
      title="Notifikasi"
      meta={isLoading ? 'Memuat…' : unread ? `${unread} belum dibaca` : 'Semua sudah dibaca'}
      icon={Bell}
      className={className}
      action={<PanelLink onClick={() => navigate(NOTIFICATION_PATH)}>Lihat semua</PanelLink>}
    >
      {isLoading ? (
        <p className="m-0 py-4 font-body text-[13px] font-medium text-fg-3">Memuat notifikasi…</p>
      ) : isError ? (
        <p className="m-0 py-4 font-body text-[13px] font-medium text-fg-3">Notifikasi belum tersedia.</p>
      ) : rows.length === 0 ? (
        <p className="m-0 py-4 font-body text-[13px] font-medium text-fg-3">Belum ada notifikasi.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {rows.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => open(row)}
                className="group grid w-full grid-cols-[10px_minmax(0,1fr)] items-start gap-3 rounded-lg p-2 text-left transition-colors hover:bg-secondary-50"
              >
                <span
                  aria-label={row.isRead ? undefined : 'Belum dibaca'}
                  className={cn('mt-1.5 size-2 rounded-full', row.isRead ? 'bg-transparent' : 'bg-secondary-500')}
                />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span
                    className={cn(
                      'truncate font-body text-sm group-hover:text-fg-link',
                      row.isRead ? 'font-medium text-fg-2' : 'font-semibold text-fg-1',
                    )}
                  >
                    {row.title || typeLabel(row.notificationType)}
                  </span>
                  {row.body && <span className="truncate font-body text-xs font-medium text-fg-3">{row.body}</span>}
                  <span className="font-body text-[11px] font-medium text-fg-4">{formatDateTime(row.createdAt)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
