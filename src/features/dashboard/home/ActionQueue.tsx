import type { LucideIcon } from 'lucide-react';
import { ArrowRight, ListChecks } from 'lucide-react';
import { Panel } from '@/features/dashboard/home/Panel';

export interface QueueItem {
  key: string;
  count: number | null;
  title: string;
  detail: string;
  icon: LucideIcon;
  /** `decide` = menunggu keputusan saya sebagai approver/checker; `mine` = tugas pribadi saya. */
  group: 'decide' | 'mine';
  action?: { label: string; onClick: () => void };
}

const GROUP_TITLE: Record<QueueItem['group'], string> = { decide: 'Menunggu keputusan Anda', mine: 'Tugas Anda' };

/**
 * Satu baris = satu JENIS pekerjaan + angka, bukan satu item — 10 cuti tetap satu baris "10", jadi
 * panel tidak memanjang. Baris bernilai 0 tidak ditampilkan (dengan puluhan jenis dari seluruh modul,
 * deret baris kosong membuat yang benar-benar menunggu tenggelam). Angka belum siap → "…".
 */
function QueueRow({ item }: { item: QueueItem }) {
  const Icon = item.icon;
  const body = (
    <>
      <span className="font-display text-[26px] font-bold leading-none tracking-[-0.02em] text-secondary-700 tabular-nums">
        {item.count ?? '…'}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex items-center gap-1.5 font-body text-sm font-semibold leading-snug text-fg-1">
          <Icon className="size-4 shrink-0 text-fg-3" strokeWidth={1.75} />
          <span className="truncate">{item.title}</span>
        </span>
        <span className="font-body text-xs font-medium leading-snug text-fg-3">{item.detail}</span>
      </span>
      {item.action ? (
        <span className="inline-flex items-center gap-1 whitespace-nowrap font-body text-[13px] font-semibold text-fg-link group-hover:text-fg-link-hover">
          {item.action.label}
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={1.75} />
        </span>
      ) : (
        <span />
      )}
    </>
  );
  const grid = 'grid w-full grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 px-1 py-3 text-left';

  return (
    <li className="border-b border-vapor">
      {item.action ? (
        <button
          type="button"
          onClick={item.action.onClick}
          className={`group ${grid} rounded-md transition-colors hover:bg-secondary-50`}
        >
          {body}
        </button>
      ) : (
        <div className={grid}>{body}</div>
      )}
    </li>
  );
}

/**
 * Perlu tindak lanjut — pekerjaan yang menunggu SAYA. Dua kelompok: keputusan sebagai
 * approver/checker, dan tugas pribadi (berlaku untuk semua peran). Baris dua kolom di layar lebar.
 */
export function ActionQueue({ items }: { items: QueueItem[] }) {
  const waiting = items.filter((item) => item.count !== 0);
  const hidden = items.length - waiting.length;
  const groups = (['decide', 'mine'] as const)
    .map((group) => ({ group, rows: waiting.filter((item) => item.group === group) }))
    .filter((entry) => entry.rows.length > 0);

  return (
    <Panel title="Perlu tindak lanjut" meta="Pekerjaan yang menunggu Anda" icon={ListChecks}>
      {groups.length === 0 ? (
        <p className="m-0 py-4 font-body text-[13px] font-medium text-fg-3">Tidak ada yang menunggu Anda saat ini.</p>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map(({ group, rows }) => (
            <section key={group} className="flex flex-col">
              {groups.length > 1 && (
                <h3 className="m-0 border-b border-border-1 pb-2 font-body text-[11px] font-bold uppercase tracking-[0.08em] text-fg-3">
                  {GROUP_TITLE[group]}
                </h3>
              )}
              <ul className="m-0 grid list-none gap-x-8 p-0 lg:grid-cols-2">
                {rows.map((item) => (
                  <QueueRow key={item.key} item={item} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      {hidden > 0 && groups.length > 0 && (
        <p className="m-0 pt-3 font-body text-xs font-medium text-fg-4">Jenis lain: tidak ada yang menunggu.</p>
      )}
    </Panel>
  );
}
