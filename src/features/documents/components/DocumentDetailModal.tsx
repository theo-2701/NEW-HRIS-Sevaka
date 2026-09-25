import type { ReactNode } from 'react';
import { Modal } from '@/components/Modal';
import { DataTable } from '@/components/DataTable';
import { RowButton } from '@/components/RowActions';
import { Button } from '@/components/ui/button';
import { ClassBadge, OriginBadge, ScanBadge, StorageBadge } from '@/features/documents/components/DocBits';
import type { ViewerTarget } from '@/features/documents/components/DocumentViewer';
import { useDocumentDetail } from '@/features/documents/hooks/useDocuments';
import { formatBytes, isRetrievable } from '@/features/documents/rules';
import { OBJECT_KIND_LABEL, TARGET_LABEL } from '@/features/documents/types';
import type { DocActor, DocVersion, OwnerType } from '@/features/documents/types';
import { formatDateTime } from '@/lib/format';

const OWNER_LABEL: Record<OwnerType, string> = {
  PERUSAHAAN: 'Company',
  KARYAWAN: 'Employee',
  OBJEK_LAIN: 'Other object',
};

function Locked({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-body text-[11px] font-bold uppercase tracking-[0.06em] text-fg-4">{label}</span>
      <span className="font-body text-[13px] font-medium text-fg-1">{children}</span>
    </div>
  );
}

/**
 * Detail + riwayat versi (`A4`) — sama persis di keempat layar berkas. Field terkunci, riwayat
 * append-only tanpa paginasi. Membuka detail tidak menulis jejak akses; membuka isi berkas iya.
 */
export function DocumentDetailModal({
  actor,
  documentId,
  ownerCaption,
  onOpenContent,
  onClose,
}: {
  actor: DocActor;
  documentId: string | null;
  ownerCaption?: string;
  onOpenContent: (target: ViewerTarget) => void;
  onClose: () => void;
}) {
  const detail = useDocumentDetail(actor, documentId);
  const row = detail.data;
  if (!documentId) return null;

  const active = row?.versions.find((ver) => ver.versionId === row.activeVersionId);

  return (
    <Modal
      open
      onOpenChange={(next) => !next && onClose()}
      title={active?.originalFilename ?? 'Document detail'}
      description="Locked details and the full version history of this file."
      size="wide"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button
            disabled={!row || !active || !isRetrievable(active.scanState)}
            onClick={() =>
              row && active && onOpenContent({ documentId: row.documentId, filename: active.originalFilename })
            }
          >
            Open file
          </Button>
        </>
      }
    >
      {detail.error ? (
        <p className="m-0 font-body text-[13px] font-medium text-error-700">{detail.error.message}</p>
      ) : !row ? (
        <p className="m-0 py-8 text-center font-body text-[13px] font-medium text-fg-3">Loading…</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
            <Locked label="Category">{row.categoryName}</Locked>
            <Locked label="Origin">
              <OriginBadge value={row.origin} />
            </Locked>
            <Locked label="Owner type">
              {OWNER_LABEL[row.ownerType]}
              {row.ownerObjectKind ? ` · ${OBJECT_KIND_LABEL[row.ownerObjectKind]}` : ''}
              {ownerCaption ? ` · ${ownerCaption}` : ''}
            </Locked>
            <Locked label="Class">
              <ClassBadge value={row.confidentialityClassEffective} />
            </Locked>
            {row.letter && (
              <>
                <Locked label="Letter number">{row.letter.letterNo ?? '—'}</Locked>
                <Locked label="Letter target">{TARGET_LABEL[row.letter.letterTarget]}</Locked>
                <Locked label="Issued at">{row.letter.issuedAt ? formatDateTime(row.letter.issuedAt) : '—'}</Locked>
              </>
            )}
          </div>

          <DataTable<DocVersion>
            rows={row.versions}
            rowKey={(ver) => ver.versionId}
            columns={[
              {
                key: 'no',
                header: 'Version',
                nowrap: true,
                render: (ver) => (
                  <span className="font-bold">
                    v{ver.versionNo}
                    {ver.versionId === row.activeVersionId ? ' · active' : ''}
                  </span>
                ),
              },
              { key: 'name', header: 'File name', render: (ver) => ver.originalFilename },
              { key: 'mime', header: 'MIME', muted: true, render: (ver) => ver.detectedMime },
              {
                key: 'size',
                header: 'Size',
                align: 'right',
                nowrap: true,
                render: (ver) => formatBytes(ver.sizeBytes),
              },
              { key: 'scan', header: 'Scan', render: (ver) => <ScanBadge value={ver.scanState} /> },
              { key: 'tier', header: 'Storage', render: (ver) => <StorageBadge value={ver.storageTier} /> },
              {
                key: 'at',
                header: 'Created',
                muted: true,
                nowrap: true,
                render: (ver) => formatDateTime(ver.createdAt),
              },
            ]}
            actions={(ver) =>
              isRetrievable(ver.scanState) ? (
                <RowButton
                  onClick={() =>
                    onOpenContent({
                      documentId: row.documentId,
                      versionNo: ver.versionNo,
                      filename: ver.originalFilename,
                    })
                  }
                >
                  Open
                </RowButton>
              ) : null
            }
          />
        </div>
      )}
    </Modal>
  );
}
