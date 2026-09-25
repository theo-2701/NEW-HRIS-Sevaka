import type { LucideIcon } from 'lucide-react';
import { ArrowRight, ListChecks } from 'lucide-react';
import { Panel } from '@/features/dashboard/home/Panel';
import { cn } from '@/lib/utils';

export interface QueueItem {
  key: string;
  count: number | null;
  title: string;
  detail: string;
  icon: LucideIcon;
  action?: { label: string; onClick: () => void };
}

/**
 * Antrean yang menunggu HR/manajemen — tiap baris satu pintu tindak lanjut. Angka tampil di ubin
 * bertint biru; baris yang kosong meredup supaya yang benar-benar menunggu langsung terlihat.
 */
export function ActionQueue({ items }: { items: QueueItem[] }) {
  return (
    <Panel title="Perlu tindak lanjut" meta="Diperbarui saat halaman dibuka" icon={ListChecks}>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {items.map((item) => {
          const idle = item.count === 0;
          const Icon = item.icon;
          const clickable = Boolean(item.action) && !idle;
          return (
            <li key={item.key}>
              <button
                type="button"
                disabled={!clickable}
                onClick={item.action?.onClick}
                className={cn(
                  'group grid w-full grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition duration-200 ease-standard',
                  idle ? 'border-transparent bg-vapor/60' : 'border-border-1 bg-bg-surface',
                  clickable ? 'hover:border-secondary-200 hover:bg-secondary-50' : 'cursor-default',
                )}
              >
                <span
                  className={cn(
                    'flex size-12 flex-col items-center justify-center rounded-lg font-display text-xl font-bold leading-none tabular-nums',
                    idle
                      ? 'bg-bg-surface text-fg-4 ring-1 ring-inset ring-border-1'
                      : 'bg-secondary-50 text-secondary-700 ring-1 ring-inset ring-secondary-100',
                  )}
                >
                  {item.count ?? '…'}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span
                    className={cn(
                      'flex items-start gap-1.5 font-body text-sm font-semibold leading-snug',
                      idle ? 'text-fg-3' : 'text-fg-1',
                    )}
                  >
                    <Icon
                      className={cn('mt-0.5 size-4 shrink-0', idle ? 'text-fg-4' : 'text-secondary-600')}
                      strokeWidth={1.75}
                    />
                    <span>{item.title}</span>
                  </span>
                  <span className="font-body text-xs font-medium text-fg-3">
                    {idle ? 'Tidak ada yang menunggu.' : item.detail}
                  </span>
                </span>
                {clickable ? (
                  <span className="inline-flex items-center gap-1 whitespace-nowrap font-body text-[13px] font-semibold text-fg-link group-hover:text-fg-link-hover">
                    {item.action!.label}
                    <ArrowRight
                      className="size-3.5 transition-transform group-hover:translate-x-0.5"
                      strokeWidth={1.75}
                    />
                  </span>
                ) : (
                  <span />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
