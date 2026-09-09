import { AlertTriangle, Check, Info, X } from 'lucide-react';
import { useUiStore, type ToastTone } from '@/store/ui.store';
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
            role="status"
            onClick={() => dismiss(t.id)}
            className="pointer-events-auto flex max-w-[380px] items-center gap-3 rounded-[10px] border border-border-1 bg-white px-4 py-3 font-body text-[13px] font-semibold leading-snug text-fg-1 shadow-overlay"
          >
            <span className={cn('inline-flex size-[26px] shrink-0 items-center justify-center rounded-full', TONE_CLASS[t.tone])}>
              <Icon className="size-[15px]" />
            </span>
            {t.message}
          </div>
        );
      })}
    </div>
  );
}
