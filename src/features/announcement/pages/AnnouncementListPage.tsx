import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { TableToolbar } from '@/components/TableToolbar';
import { RowActions, RowButton } from '@/components/RowActions';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AnnouncementFormModal } from '@/features/announcement/components/AnnouncementFormModal';
import { AnnouncementStatusBadge, PublishDialog } from '@/features/announcement/components/AnnouncementBits';
import { useAnnouncement, useAnnouncements } from '@/features/announcement/hooks/useAnnouncement';
import {
  CATEGORY_OPTIONS,
  announcementDetailPath,
  categoryLabel,
  recipientLabel,
  type AnnouncementCategory,
  type AnnouncementRow,
  type AnnouncementStatus,
} from '@/features/announcement/types';
import { formatDateTime } from '@/lib/format';

const ALL = 'ALL';
const detailPath = announcementDetailPath;

/**
 * Company Management › Announcement (FSD-001-COMPANY §11.3 · UIC-001-COMPANY §3C).
 *
 * Satu grid untuk rancangan dan terbit. Simpan rancangan dan terbitkan adalah dua aksi
 * (dua izin) terpisah; sesudah terbit keempat medan beku, lampiran tetap boleh ditambah.
 */
export function AnnouncementListPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>(ALL);
  const [category, setCategory] = useState<string>(ALL);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [composing, setComposing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<AnnouncementRow | null>(null);

  const filter = useMemo(
    () => ({
      status: status === ALL ? undefined : (status as AnnouncementStatus),
      category: category === ALL ? undefined : (category as AnnouncementCategory),
      keyword: keyword.trim() || undefined,
      page,
      size,
    }),
    [status, category, keyword, page, size],
  );

  const { data, isLoading } = useAnnouncements(filter);
  const editing = useAnnouncement(editingId ?? undefined);

  const changeFilter = (apply: () => void) => {
    apply();
    setPage(1);
  };

  const rowActions = (row: AnnouncementRow) =>
    row.status === 'DRAFT' ? (
      <RowActions
        actions={[
          { label: 'Edit', onSelect: () => setEditingId(row.id) },
          { label: 'Publish', onSelect: () => setPublishing(row) },
          { label: 'View Detail', onSelect: () => navigate(detailPath(row.id)) },
        ]}
      />
    ) : (
      <RowButton onClick={() => navigate(detailPath(row.id))}>View Detail</RowButton>
    );

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Company Management' }, { label: 'Announcement' }]}
        title="Announcement"
        description="Susun pengumuman perusahaan untuk satu peran penerima, lalu terbitkan. Pengumuman yang sudah terbit tidak dapat diubah atau ditarik."
        actions={<Button onClick={() => setComposing(true)}>New announcement</Button>}
      >
        <Card>
          <CardHead title="Daftar pengumuman" sub="Rancangan dan yang sudah terbit" />

          <div className="flex flex-col">
            <TableToolbar
              filters={
                <>
                  <Select value={status} onValueChange={(value) => changeFilter(() => setStatus(value))}>
                    <SelectTrigger className="h-10 w-[170px]" aria-label="Status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>Semua status</SelectItem>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="PUBLISHED">Published</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={category} onValueChange={(value) => changeFilter(() => setCategory(value))}>
                    <SelectTrigger className="h-10 w-[170px]" aria-label="Kategori">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>Semua kategori</SelectItem>
                      {CATEGORY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              }
              search={{
                value: keyword,
                onChange: (value) => changeFilter(() => setKeyword(value)),
                placeholder: 'Cari judul',
              }}
            />

            <DataTable<AnnouncementRow>
              rows={data?.rows ?? []}
              rowKey={(row) => row.id}
              loading={isLoading}
              empty="Belum ada pengumuman."
              columns={[
                { key: 'title', header: 'Title', strong: true, render: (row) => row.title },
                { key: 'category', header: 'Category', render: (row) => categoryLabel(row.category) },
                {
                  key: 'recipient',
                  header: 'Recipient',
                  render: (row) => recipientLabel(row.recipientRole) ?? <span className="text-fg-4">Belum ditentukan</span>,
                },
                { key: 'status', header: 'Status', render: (row) => <AnnouncementStatusBadge status={row.status} /> },
                {
                  key: 'published',
                  header: 'Last Published',
                  muted: true,
                  nowrap: true,
                  render: (row) => formatDateTime(row.lastPublishedAt),
                },
              ]}
              actions={rowActions}
            />

            <Pagination
              page={page}
              pageSize={size}
              total={data?.totalData ?? 0}
              noun="announcements"
              onPageChange={setPage}
              onPageSizeChange={(next) => {
                setSize(next);
                setPage(1);
              }}
            />
          </div>
        </Card>
      </PageShell>

      <AnnouncementFormModal
        open={composing || Boolean(editingId && editing.data)}
        editing={editingId ? (editing.data ?? null) : null}
        onClose={() => {
          setComposing(false);
          setEditingId(null);
        }}
        onCreated={(id) => {
          setComposing(false);
          navigate(detailPath(id));
        }}
      />
      <PublishDialog announcement={publishing} onClose={() => setPublishing(null)} />
    </>
  );
}
