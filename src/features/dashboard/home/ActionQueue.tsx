import { Panel } from '@/features/dashboard/home/Panel';
import { cn } from '@/lib/utils';

export interface QueueItem {
  key: string;
  count: number | null;
  title: string;
  detail: string;
  action?: { label: string; onClick: () => void };
}

/** Antrean yang menunggu HR/manajemen — tiap baris satu pintu tindak lanjut. */
export function ActionQueue({ items }: { items: QueueItem[] }) {
  return (
    <Panel title="Perlu tindak lanjut" meta="Diperbarui saat halaman dibuka">
      <ul className="m-0 flex list-none flex-col divide-y divide-border-1 p-0">
        {items.map((item) => {
          const idle = item.count === 0;
          return (
            <li key={item.key} className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-4 py-3 first:pt-0 last:pb-0">
              <span
                className={cn(
                  'font-display text-[26px] font-bold leading-none tracking-[-0.02em] tabular-nums',
                  idle ? 'text-fg-4' : 'text-fg-1',
                )}
              >
                {item.count ?? '…'}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className={cn('font-body text-sm font-semibold', idle ? 'text-fg-3' : 'text-fg-1')}>
                  {item.title}
                </span>
                <span className="font-body text-xs font-medium text-fg-3">{idle ? 'Tidak ada yang menunggu.' : item.detail}</span>
              </span>
              {item.action && !idle ? (
                <button
                  type="button"
                  onClick={item.action.onClick}
                  className="font-body text-[13px] font-semibold text-fg-link hover:text-fg-link-hover hover:underline"
                >
                  {item.action.label}
                </button>
              ) : (
                <span />
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
