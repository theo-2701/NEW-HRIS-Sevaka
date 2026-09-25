import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { TableToolbar } from '@/components/TableToolbar';
import { RowButton } from '@/components/RowActions';
import { StatusBadge } from '@/components/StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInbox, useMarkRead } from '@/features/notification/hooks/useNotification';
import { referenceLink, typeLabel } from '@/features/notification/rules';
import type { InboxQuery, InboxRow, ReadFilter } from '@/features/notification/types';
import { formatDateTime } from '@/lib/format';

type SortOption = 'NEWEST' | 'OLDEST' | 'UNREAD_FIRST' | 'READ_FIRST';

const SORTS: Record<SortOption, { label: string; query: Pick<InboxQuery, 'sortBy' | 'sortDirection'> }> = {
  NEWEST: { label: 'Newest first', query: { sortBy: 'created_at', sortDirection: 'desc' } },
  OLDEST: { label: 'Oldest first', query: { sortBy: 'created_at', sortDirection: 'asc' } },
  UNREAD_FIRST: { label: 'Unread first', query: { sortBy: 'is_read', sortDirection: 'asc' } },
  READ_FIRST: { label: 'Read first', query: { sortBy: 'is_read', sortDirection: 'desc' } },
};

const FILTERS: Record<ReadFilter, string> = { ALL: 'All status', UNREAD: 'Unread', READ: 'Read' };

/**
 * Company Management › Notification (Kotak Masuk) — FSD-001-NOTIFICATION-0.4 §1 (F2–F4) ·
 * UIC-001-NOTIFICATION-0.2 §2. Kabar milik pengguna sendiri, seluruh role.
 *
 * Klik baris = tandai dibaca (`PUT …/read`, id dibawa dari baris); klik kedua tetap 200 apa adanya.
 * Sengaja TANPA tandai-semua, hapus, pencarian teks, kategori, badge "kabar penting", dan kolom
 * NIK — semuanya tidak berjangkar kontrak (FSD §1.3, §2).
 */
export function NotificationInboxPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<ReadFilter>('ALL');
  const [sort, setSort] = useState<SortOption>('NEWEST');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);

  const query: InboxQuery = {
    isRead: filter === 'ALL' ? undefined : filter === 'READ',
    ...SORTS[sort].query,
    page,
    size,
  };
  const inbox = useInbox(query);
  const markRead = useMarkRead();

  const rows = inbox.data?.data ?? [];

  return (
    <PageShell
      crumbs={[{ label: 'Company Management' }, { label: 'Notification' }]}
      title="Notification"
      description="Notifications addressed to you. Click a notification to mark it as read."
    >
      <Card>
        <CardHead title="Inbox" sub="Newest first by default" />
        <div>
          <TableToolbar
            filters={
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={filter}
                  onValueChange={(value) => {
                    setFilter(value as ReadFilter);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 w-[160px]" aria-label="Filter status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(FILTERS) as ReadFilter[]).map((key) => (
                      <SelectItem key={key} value={key}>
                        {FILTERS[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={sort}
                  onValueChange={(value) => {
                    setSort(value as SortOption);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 w-[170px]" aria-label="Sort">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SORTS) as SortOption[]).map((key) => (
                      <SelectItem key={key} value={key}>
                        {SORTS[key].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            }
          />
          <DataTable<InboxRow>
            rows={rows}
            rowKey={(row) => row.id}
            loading={inbox.isLoading}
            empty="No notification matches this filter."
            onRowClick={(row) => !markRead.isPending && markRead.mutate(row.id)}
            columns={[
              {
                key: 'message',
                header: 'Notification',
                render: (row) => (
                  <div className="flex max-w-[520px] flex-col gap-0.5 whitespace-normal">
                    <span className={row.isRead ? 'font-semibold text-fg-2' : 'font-bold text-fg-1'}>
                      {row.title ?? typeLabel(row.notificationType)}
                    </span>
                    {row.body && <span className="text-xs font-medium text-fg-3">{row.body}</span>}
                  </div>
                ),
              },
              {
                key: 'type',
                header: 'Type',
                muted: true,
                nowrap: true,
                render: (row) => <span className="font-mono text-xs">{row.notificationType}</span>,
              },
              { key: 'received', header: 'Received', nowrap: true, render: (row) => formatDateTime(row.createdAt) },
              {
                key: 'status',
                header: 'Status',
                nowrap: true,
                render: (row) =>
                  row.isRead ? (
                    <div className="flex flex-col gap-1">
                      <StatusBadge tone="ok">Read</StatusBadge>
                      {row.readAt && (
                        <span className="text-xs text-fg-3">
                          {formatDateTime(row.readAt)}
                          {row.readAtTimezone ? ` · ${row.readAtTimezone}` : ''}
                        </span>
                      )}
                    </div>
                  ) : (
                    <StatusBadge tone="warn">Unread</StatusBadge>
                  ),
              },
            ]}
            actions={(row) => {
              const link = referenceLink(row);
              // Tanpa tautan (reference NULL / tak dikenal) → sel kosong, bukan tombol mati.
              return link ? (
                <RowButton
                  onClick={(event) => {
                    event.stopPropagation();
                    navigate(link.to);
                  }}
                >
                  {link.label}
                </RowButton>
              ) : null;
            }}
          />
          <Pagination
            page={page}
            pageSize={size}
            total={inbox.data?.totalData ?? 0}
            noun="notifications"
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setSize(next);
              setPage(1);
            }}
          />
        </div>
      </Card>
    </PageShell>
  );
}
