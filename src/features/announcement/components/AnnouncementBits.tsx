import { FileText } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Modal } from '@/components/Modal';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { formatFileSize } from '@/features/announcement/content';
import { useAttachFile, useCompanyFiles, usePublishAnnouncement } from '@/features/announcement/hooks/useAnnouncement';
import {
  STATUS_LABEL,
  categoryLabel,
  recipientLabel,
  type AnnouncementRow,
  type AnnouncementStatus,
  type CompanyFile,
} from '@/features/announcement/types';

export function AnnouncementStatusBadge({ status }: { status: AnnouncementStatus }) {
  return <StatusBadge tone={status === 'PUBLISHED' ? 'ok' : 'mute'}>{STATUS_LABEL[status]}</StatusBadge>;
}

/** Nama/ukuran/jenis lampiran dibaca dari Company Files, bukan disimpan di pengumuman. */
export function FileLabel({ file, documentId }: { file?: CompanyFile; documentId: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <FileText className="size-4 shrink-0 text-secondary-500" />
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-body text-[13px] font-semibold text-fg-1">{file?.name ?? documentId}</span>
        {file && (
          <span className="font-body text-[11.5px] font-medium text-fg-3">
            {formatFileSize(file.sizeBytes)} · {file.mimeType.split('/').pop()?.toUpperCase()}
          </span>
        )}
      </span>
    </span>
  );
}

/** Konfirmasi Terbitkan (A5) — peringatan tetap, tanpa orang kedua. */
export function PublishDialog({ announcement, onClose }: { announcement: AnnouncementRow | null; onClose: () => void }) {
  const publish = usePublishAnnouncement();
  const recipient = announcement ? recipientLabel(announcement.recipientRole) : null;

  return (
    <ConfirmDialog
      open={Boolean(announcement)}
      title="Terbitkan pengumuman?"
      description="Tidak dapat ditarik. Judul, isi, kategori, dan peran penerima akan beku, dan surel terkirim ke seluruh pemegang peran sasaran."
      confirmLabel="Terbitkan"
      loading={publish.isPending}
      onOpenChange={(open) => !open && onClose()}
      onConfirm={() => announcement && publish.mutate(announcement.id, { onSuccess: onClose })}
    >
      {announcement && (
        <dl className="m-0 grid grid-cols-[120px_1fr] gap-x-3 gap-y-1.5 rounded-md border border-border-1 bg-cloud px-3.5 py-3 font-body text-[13px]">
          <dt className="font-medium text-fg-3">Judul</dt>
          <dd className="m-0 font-semibold text-fg-1">{announcement.title}</dd>
          <dt className="font-medium text-fg-3">Kategori</dt>
          <dd className="m-0 font-semibold text-fg-1">{categoryLabel(announcement.category)}</dd>
          <dt className="font-medium text-fg-3">Peran penerima</dt>
          <dd className={recipient ? 'm-0 font-semibold text-fg-1' : 'm-0 font-semibold text-warning-800'}>
            {recipient ?? 'Belum diisi — lengkapi lewat Edit sebelum terbit'}
          </dd>
        </dl>
      )}
    </ConfirmDialog>
  );
}

/** Tautkan dari Company Files — memilih berkas yang sudah ada, nol jalur unggah. */
export function AttachFileModal({
  announcementId,
  attachedDocumentIds,
  open,
  onClose,
}: {
  announcementId: string;
  attachedDocumentIds: string[];
  open: boolean;
  onClose: () => void;
}) {
  const { data: files = [], isLoading } = useCompanyFiles();
  const attach = useAttachFile();
  const available = files.filter((file) => !attachedDocumentIds.includes(file.documentId));

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Tautkan dari Company Files"
      description="Pilih berkas perusahaan yang sudah tersimpan. Berkas baru diunggah lewat menu Company Files."
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="flex max-h-[340px] flex-col overflow-y-auto rounded-md border border-border-1">
        {isLoading ? (
          <p className="m-0 py-8 text-center font-body text-[13px] font-medium text-fg-3">Memuat berkas…</p>
        ) : available.length === 0 ? (
          <p className="m-0 py-8 text-center font-body text-[13px] font-medium text-fg-3">
            Semua berkas Company Files sudah tertaut.
          </p>
        ) : (
          available.map((file) => (
            <div
              key={file.documentId}
              className="flex items-center justify-between gap-3 border-b border-border-1 px-3.5 py-2.5 last:border-b-0"
            >
              <FileLabel file={file} documentId={file.documentId} />
              <Button
                variant="secondary"
                disabled={attach.isPending}
                onClick={() => attach.mutate({ id: announcementId, documentId: file.documentId })}
              >
                Tautkan
              </Button>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}
