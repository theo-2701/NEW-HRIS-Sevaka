import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import { RowButton } from '@/components/RowActions';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileLabel } from '@/features/announcement/components/AnnouncementBits';
import { htmlToText } from '@/features/announcement/content';
import { useCompanyFiles, useMyAnnouncement, useMyAnnouncements } from '@/features/announcement/hooks/useAnnouncement';
import { RECIPIENT_ROLE_OPTIONS, type MyAnnouncementRow } from '@/features/announcement/types';
import { formatDateTime } from '@/lib/format';

/**
 * Employee Self-Service › Announcement (FSD-001-COMPANY §11.4 · UIC-001-COMPANY §3C.6).
 * Hanya pengumuman terbit untuk peran pemanggil; cukup token sah, nol izin bernama.
 */
export function MyAnnouncementsPage() {
  const [params] = useSearchParams();
  const [role, setRole] = useState('ROLE_EMPLOYEE');
  /* `?id=` — dibuka langsung dari kartu Announcement di Dashboard. */
  const [readingId, setReadingId] = useState<string | null>(() => params.get('id'));
  const { data: rows = [], isLoading } = useMyAnnouncements(role);

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Employee Self-Service' }, { label: 'Announcement' }]}
        title="Announcement"
        description="Pengumuman perusahaan yang ditujukan untuk peran Anda, terbaru di atas."
        actions={
          <Select
            value={role}
            onValueChange={(value) => {
              setRole(value);
              setReadingId(null);
            }}
          >
            <SelectTrigger className="h-10 w-[240px]" aria-label="Viewing as">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RECIPIENT_ROLE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.value === 'ROLE_EMPLOYEE' ? 'Employee' : option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      >
        <Card>
          <CardHead title="Pengumuman saya" />
          <DataTable<MyAnnouncementRow>
            rows={rows}
            rowKey={(row) => row.id}
            loading={isLoading}
            empty="Belum ada pengumuman untuk peran Anda."
            columns={[
              { key: 'title', header: 'Title', strong: true, render: (row) => row.title },
              { key: 'published', header: 'Published At', nowrap: true, muted: true, render: (row) => formatDateTime(row.publishedAt) },
            ]}
            actions={(row) => <RowButton onClick={() => setReadingId(row.id)}>Read</RowButton>}
          />
        </Card>
      </PageShell>

      <ReadAnnouncementModal role={role} id={readingId} onClose={() => setReadingId(null)} />
    </>
  );
}

/** C3 — Baca Pengumuman. Salah sasaran atau rancangan dijawab 404 oleh server. */
function ReadAnnouncementModal({ role, id, onClose }: { role: string; id: string | null; onClose: () => void }) {
  const { data, isLoading, isError } = useMyAnnouncement(role, id);
  const { data: files = [] } = useCompanyFiles();

  return (
    <Modal
      open={Boolean(id)}
      onOpenChange={(next) => !next && onClose()}
      size="wide"
      title={data?.title ?? 'Announcement'}
      description={data ? `Terbit ${formatDateTime(data.publishedAt)}` : undefined}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {isLoading ? (
        <p className="m-0 py-8 text-center font-body text-[13px] font-medium text-fg-3">Memuat pengumuman…</p>
      ) : isError || !data ? (
        <p className="m-0 py-8 text-center font-body text-[13px] font-medium text-fg-3">Pengumuman tidak ditemukan.</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="whitespace-pre-line font-body text-sm font-medium leading-relaxed text-fg-2">
            {htmlToText(data.content)}
          </div>
          {data.attachments.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="t-label text-fg-3">Lampiran</span>
              <div className="flex flex-col rounded-md border border-border-1">
                {data.attachments.map((item) => (
                  <div key={item.documentId} className="border-b border-border-1 px-3.5 py-2.5 last:border-b-0">
                    <FileLabel file={files.find((file) => file.documentId === item.documentId)} documentId={item.documentId} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
