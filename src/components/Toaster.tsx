import { AlertTriangle, Check, Info, X } from 'lucide-react';
import { useUiStore, type ToastTone } from '@/store/ui.store';
import { referenceText } from '@/lib/errorReference';
import { cn } from '@/lib/utils';

const TONE_ICON: Record<ToastTone, typeof Check> = {
  ok: Check,
  info: Info,
  warn: AlertTriangle,
  danger: X,
};

const TONE_CLASS: Record<ToastTone, string> = {
  ok: 'bg-success-100 text-success-700',
  info: 'bg-primary-200 text-secondary-700',
  warn: 'bg-warning-100 text-warning-800',
  danger: 'bg-error-100 text-error-700',
};

/**
 * Toast rumah — port `.toast` (`css/employee-flows.css`).
 * Dipakai untuk umpan balik kode respons (201/200/202/422/409):
 * `toast('Data tersimpan.', 'ok')` dari `@/store/ui.store`.
 */
export function Toaster() {
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismissToast);

  return (
    <div className="pointer-events-none fixed right-6 top-[78px] z-[3000] flex flex-col gap-2">
      {toasts.map((t) => {
        const Icon = TONE_ICON[t.tone];
        return (
          <div
            key={t.id}
            role={t.tone === 'danger' ? 'alert' : 'status'}
            onClick={() => dismiss(t.id)}
            className="pointer-events-auto flex max-w-[380px] items-start gap-3 rounded-[10px] border border-border-1 bg-white px-4 py-3 font-body text-[13px] font-semibold leading-snug text-fg-1 shadow-overlay"
          >
            <span className={cn('inline-flex size-[26px] shrink-0 items-center justify-center rounded-full', TONE_CLASS[t.tone])}>
              <Icon className="size-[15px]" />
            </span>
            <span className="flex min-w-0 flex-col gap-1.5">
              {t.message}
              {t.reference && (
                <span className="flex flex-col gap-1 rounded-md bg-vapor px-2.5 py-2 font-mono text-[11px] font-medium text-fg-2">
                  {t.reference.errorCode && <span>Error code: {t.reference.errorCode}</span>}
                  {t.reference.traceId && <span className="break-all">Trace ID: {t.reference.traceId}</span>}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void navigator.clipboard?.writeText(referenceText(t.reference!));
                    }}
                    className="self-start font-body text-xs font-bold text-secondary-700 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500"
                  >
                    Copy
                  </button>
                </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
