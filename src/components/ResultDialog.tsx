import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SUPPORT_CONTACT, serviceForPath } from '@/config/serviceCodes';
import { formatDateTime } from '@/lib/format';
import { useUiStore } from '@/store/ui.store';
import { cn } from '@/lib/utils';

/**
 * Modal hasil aksi — pengganti toast berhasil/gagal (Notulen 12 Okt 2026, keputusan #7).
 * Galat menampilkan kode `<service>-<status>` + kontak penanggung jawab supaya bisa di-screenshot
 * dan dilaporkan. Duduk di atas modal lain (z 2600) karena galat sering muncul dari dalam form.
 */
export function ResultDialog() {
  const notice = useUiStore((s) => s.notice);
  const dismiss = useUiStore((s) => s.dismissNotice);
  const ok = notice?.tone === 'ok';
  const service = notice ? serviceForPath(notice.path) : null;

  return (
    <DialogPrimitive.Root open={Boolean(notice)} onOpenChange={(open) => !open && dismiss()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[2600] [background:var(--bg-scrim)] [backdrop-filter:var(--blur-scrim)]" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[2600] flex w-[calc(100%-32px)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 animate-ovl-in flex-col items-center gap-4 rounded-xl bg-bg-surface px-6 pb-6 pt-7 text-center shadow-popup">
          <span
            className={cn(
              'inline-flex size-14 items-center justify-center rounded-full [&_svg]:size-7',
              ok ? 'bg-success-100 text-success-700' : 'bg-error-100 text-error-700',
            )}
          >
            {ok ? <Check /> : <X />}
          </span>

          <div className="flex flex-col gap-1.5">
            <DialogPrimitive.Title className="m-0 font-display text-lg font-bold leading-tight text-fg-1">
              {ok ? 'Success' : 'Something went wrong'}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="m-0 font-body text-[13px] font-medium leading-normal text-fg-2">
              {notice?.message}
            </DialogPrimitive.Description>
          </div>

          {notice && !ok && service && (
            <dl className="m-0 grid w-full grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 rounded-md border border-border-1 bg-mist px-4 py-3 text-left font-body text-xs">
              <dt className="font-medium text-fg-3">Error code</dt>
              <dd className="m-0 font-mono font-bold text-fg-1">
                {service.code}
                {notice.status ? `-${notice.status}` : ''}
                {notice.code ? ` · ${notice.code}` : ''}
              </dd>
              <dt className="font-medium text-fg-3">Service</dt>
              <dd className="m-0 font-semibold text-fg-1">{service.name}</dd>
              <dt className="font-medium text-fg-3">Time</dt>
              <dd className="m-0 font-semibold text-fg-1">{formatDateTime(notice.at)}</dd>
              <dt className="font-medium text-fg-3">Contact</dt>
              <dd className="m-0 font-semibold text-fg-1">
                {SUPPORT_CONTACT.team} · {SUPPORT_CONTACT.channel}
              </dd>
            </dl>
          )}

          <Button className="w-full" onClick={dismiss} autoFocus>
            OK
          </Button>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
