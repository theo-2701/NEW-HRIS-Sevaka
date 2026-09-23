import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead, EmptyState } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DataTable } from '@/components/DataTable';
import { TabMenu } from '@/components/TabMenu';
import { RowButton } from '@/components/RowActions';
import { Button } from '@/components/ui/button';
import { AnnouncementFormModal } from '@/features/announcement/components/AnnouncementFormModal';
import {
  AnnouncementStatusBadge,
  AttachFileModal,
  FileLabel,
  PublishDialog,
} from '@/features/announcement/components/AnnouncementBits';
import { htmlToText } from '@/features/announcement/content';
import { useAnnouncement, useCompanyFiles, useDetachFile } from '@/features/announcement/hooks/useAnnouncement';
import {
  ANNOUNCEMENT_LIST_PATH,
  categoryLabel,
  recipientLabel,
  type AnnouncementAttachment,
  type PublishLogEntry,
} from '@/features/announcement/types';
import { formatDateTime } from '@/lib/format';

type Tab = 'detail' | 'log';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="font-body text-[13px] font-medium text-fg-3">{label}</dt>
      <dd className="m-0 font-body text-[13px] font-semibold text-fg-1">{children}</dd>
    </>
  );
}

/**
 * Detail pengumuman (FSD-001-COMPANY §11.3: A4 Kelola Lampiran, A6 Detail Terbit + Jejak Terbit).
 * Rancangan bisa disunting dan diterbitkan; yang terbit tampil baca saja, lampiran tetap bisa dikelola.
 */
export function AnnouncementDetailPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = params.get('id') ?? undefined;
  const { data, isLoading, isError } = useAnnouncement(id);
  const { data: files = [] } = useCompanyFiles();
  const detach = useDetachFile();

  const [tab, setTab] = useState<Tab>('detail');
  const [editing, setEditing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [detaching, setDetaching] = useState<AnnouncementAttachment | null>(null);

  const crumbs = [
    { label: 'Company Management' },
    { label: 'Announcement', to: ANNOUNCEMENT_LIST_PATH },
    { label: data?.title ?? 'Detail' },
  ];

  if (!id || isError) {
    return (
      <PageShell crumbs={crumbs} title="Announcement detail">
        <EmptyState
          title="Pengumuman tidak ditemukan"
          description="Buka kembali pengumuman ini dari daftar Announcement."
          action={<Button onClick={() => navigate(ANNOUNCEMENT_LIST_PATH)}>Kembali ke daftar</Button>}
        />
      </PageShell>
    );
  }

  const isDraft = data?.status === 'DRAFT';
  const fileOf = (documentId: string) => files.find((file) => file.documentId === documentId);

  return (
    <>
      <PageShell
        crumbs={crumbs}
        title={data?.title ?? 'Announcement detail'}
        description={
          isDraft
            ? 'Rancangan — masih bisa disunting sebelum diterbitkan.'
            : 'Sudah terbit — judul, isi, kategori, dan peran penerima tidak dapat diubah.'
        }
        actions={
          isDraft ? (
            <div className="flex flex-wrap items-center gap-2.5">
              <Button variant="secondary" onClick={() => setEditing(true)}>
                Edit
              </Button>
              <Button onClick={() => setPublishing(true)}>Publish</Button>
            </div>
          ) : undefined
        }
      >
        {isLoading || !data ? (
          <p className="py-10 text-center font-body text-[13px] font-medium text-fg-3">Memuat pengumuman…</p>
        ) : (
          <div className="flex flex-col gap-5">
            <TabMenu<Tab>
              value={tab}
              onChange={setTab}
              items={[
                { value: 'detail', label: 'Detail' },
                { value: 'log', label: 'Jejak Terbit', count: data.publishLog.length },
              ]}
            />

            {tab === 'detail' && (
              <div className="grid gap-5 xl:grid-cols-[1fr_380px] xl:items-start">
                <Card>
                  <CardHead title="Isi pengumuman" />
                  <dl className="m-0 grid grid-cols-[140px_1fr] gap-x-4 gap-y-2.5 rounded-md border border-border-1 bg-cloud px-4 py-3.5">
                    <Field label="Status">
                      <AnnouncementStatusBadge status={data.status} />
                    </Field>
                    <Field label="Kategori">{categoryLabel(data.category)}</Field>
                    <Field label="Peran penerima">
                      {recipientLabel(data.recipientRole) ?? <span className="text-warning-800">Belum ditentukan</span>}
                    </Field>
                    <Field label="Dibuat oleh">
                      {data.createdBy.name} · {formatDateTime(data.createdAt)}
                    </Field>
                    <Field label="Terakhir terbit">{formatDateTime(data.lastPublishedAt)}</Field>
                  </dl>
                  {!isDraft && (
                    <p className="m-0 flex items-start gap-2.5 rounded-md border border-primary-200 bg-primary-50 px-3.5 py-2.5 font-body text-[12px] font-medium leading-normal text-secondary-900">
                      <Lock className="mt-0.5 size-3.5 shrink-0 text-secondary-700" />
                      Koreksi atas pengumuman yang sudah terbit dilakukan dengan menerbitkan pengumuman baru.
                    </p>
                  )}
                  <div className="whitespace-pre-line font-body text-sm font-medium leading-relaxed text-fg-2">
                    {htmlToText(data.content)}
                  </div>
                </Card>

                <Card>
                  <CardHead
                    title="Lampiran"
                    sub="Ditautkan dari Company Files"
                    action={
                      <Button variant="secondary" onClick={() => setAttaching(true)}>
                        Tautkan berkas
                      </Button>
                    }
                  />
                  {data.attachments.length === 0 ? (
                    <p className="m-0 py-4 text-center font-body text-[13px] font-medium text-fg-3">Belum ada lampiran.</p>
                  ) : (
                    <div className="flex flex-col rounded-md border border-border-1">
                      {data.attachments.map((item) => (
                        <div
                          key={item.attachmentId}
                          className="flex items-center justify-between gap-3 border-b border-border-1 px-3.5 py-2.5 last:border-b-0"
                        >
                          <FileLabel file={fileOf(item.documentId)} documentId={item.documentId} />
                          <RowButton onClick={() => setDetaching(item)}>Cabut</RowButton>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            )}

            {tab === 'log' && (
              <Card>
                <CardHead title="Jejak terbit" sub="Tercatat otomatis setiap kali terbit dan tidak dapat diubah" />
                <DataTable<PublishLogEntry>
                  rows={data.publishLog}
                  rowKey={(row) => row.publishedAt}
                  empty="Pengumuman ini belum pernah terbit."
                  columns={[
                    { key: 'at', header: 'Published At', nowrap: true, render: (row) => formatDateTime(row.publishedAt) },
                    {
                      key: 'by',
                      header: 'Published By',
                      strong: true,
                      render: (row) => `${row.publishedBy.name} · ${row.publishedBy.nik}`,
                    },
                    { key: 'role', header: 'Recipient', render: (row) => recipientLabel(row.recipientRole) },
                    {
                      key: 'hash',
                      header: 'Content Fingerprint',
                      muted: true,
                      render: (row) => (
                        <span className="font-mono text-[12px]" title={row.contentHash}>
                          {row.contentHash ? `${row.contentHash.slice(0, 12)}…` : '—'}
                        </span>
                      ),
                    },
                  ]}
                />
              </Card>
            )}
          </div>
        )}
      </PageShell>

      {data && (
        <>
          <AnnouncementFormModal
            open={editing}
            editing={data}
            onClose={() => setEditing(false)}
            onCreated={() => setEditing(false)}
          />
          <PublishDialog announcement={publishing ? data : null} onClose={() => setPublishing(false)} />
          <AttachFileModal
            announcementId={data.id}
            attachedDocumentIds={data.attachments.map((item) => item.documentId)}
            open={attaching}
            onClose={() => setAttaching(false)}
          />
          <ConfirmDialog
            open={Boolean(detaching)}
            title="Cabut lampiran?"
            description="Berkas tetap tersimpan di Company Files; hanya tautannya ke pengumuman ini yang dicabut."
            confirmLabel="Cabut"
            tone="danger"
            loading={detach.isPending}
            onOpenChange={(open) => !open && setDetaching(null)}
            onConfirm={() =>
              detaching &&
              detach.mutate({ id: data.id, attachmentId: detaching.attachmentId }, { onSuccess: () => setDetaching(null) })
            }
          />
        </>
      )}
    </>
  );
}
