import { useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { ClassBadge } from '@/features/documents/components/DocBits';
import { documentService } from '@/features/documents/services/document.service';
import type { DocActor, DocumentContent } from '@/features/documents/types';

export interface ViewerTarget {
  documentId: string;
  versionNo?: number;
  filename: string;
}

/**
 * SATU komponen bersama untuk `A2` di keempat layar berkas (`PROB-FRONTEND-029`): byte ditarik
 * lewat service ber-`Authorization`, ditampilkan dari memori (blob URL), dan blob URL dilepas saat
 * layar ditutup. Tidak pernah memasang alamat polos di `<img src>`/`<a href>`/`<embed src>`, tidak
 * menulis byte ke penyimpanan aplikasi, dan kelas SENSITIF selalu ditarik ulang serta hanya
 * ditampilkan di penampil dalam-aplikasi — bukan penampil bawaan peramban.
 */
export function DocumentViewer({
  actor,
  target,
  onClose,
}: {
  actor: DocActor;
  target: ViewerTarget | null;
  onClose: () => void;
}) {
  const [content, setContent] = useState<DocumentContent | null>(null);
  const [text, setText] = useState('');
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    setContent(null);
    setError(null);
    documentService
      .content(actor, target.documentId, target.versionNo)
      .then(async (result) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(result.blob);
        setContent(result);
        setUrl(objectUrl);
        setText(await result.blob.text());
      })
      .catch((err: Error) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUrl(null);
      setText('');
    };
  }, [actor, target]);

  if (!target) return null;

  const download = () => {
    if (!url || !content) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = content.filename;
    link.click();
  };

  return (
    <Modal
      open
      onOpenChange={(next) => !next && onClose()}
      title={target.filename}
      description={
        content?.confidentialityClass === 'SENSITIF'
          ? 'Sensitive file — shown only inside the app and fetched again every time it is opened.'
          : 'File content is fetched with your session and never stored on this device.'
      }
      size="wide"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button disabled={!content} onClick={download}>
            Download
          </Button>
        </>
      }
    >
      {error ? (
        <p className="m-0 rounded-md border border-error-200 bg-error-50 px-3.5 py-2.5 font-body text-xs font-medium text-error-700">
          {error}
        </p>
      ) : !content ? (
        <p className="m-0 py-10 text-center font-body text-[13px] font-medium text-fg-3">Loading file…</p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ClassBadge value={content.confidentialityClass} />
              <span className="font-mono text-xs text-fg-3">{content.mime}</span>
            </div>
            {content.confidentialityClass === 'BIASA' && url && (
              <Button variant="secondary" onClick={() => window.open(url, '_blank', 'noopener')}>
                Open in browser viewer
              </Button>
            )}
          </div>
          <pre className="m-0 max-h-[360px] overflow-auto whitespace-pre-wrap rounded-md border border-border-1 bg-vapor p-4 font-mono text-xs text-fg-1">
            {text}
          </pre>
        </div>
      )}
    </Modal>
  );
}
