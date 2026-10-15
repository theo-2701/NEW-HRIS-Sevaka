import { useState } from 'react';
import { ArrowRight, ListChecks } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { Panel, PanelLink } from '@/features/dashboard/home/Panel';
import {
  ACTION_QUEUE_PANEL_LIMIT,
  GROUP_ORDER,
  arrangeQueue,
  type QueueItem,
} from '@/features/dashboard/home/queueRules';

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
  const [allOpen, setAllOpen] = useState(false);
  const waiting = arrangeQueue(items);
  // Di modal, aksi menutup modal dulu supaya layar tujuan (atau modal lain) tidak tertumpuk.
  const inModal = waiting.map((item) =>
    item.action
      ? { ...item, action: { ...item.action, onClick: () => (setAllOpen(false), item.action!.onClick()) } }
      : item,
  );

  return (
    <Panel
      title="Perlu tindak lanjut"
      meta="Pekerjaan yang menunggu Anda"
      icon={ListChecks}
      action={
        waiting.length > ACTION_QUEUE_PANEL_LIMIT && (
          <PanelLink onClick={() => setAllOpen(true)}>Lihat semua ({waiting.length})</PanelLink>
        )
      }
    >
      {waiting.length === 0 ? (
        <p className="m-0 py-4 font-body text-[13px] font-medium text-fg-3">Tidak ada yang menunggu Anda saat ini.</p>
      ) : (
        <QueueGroups items={waiting.slice(0, ACTION_QUEUE_PANEL_LIMIT)} />
      )}

      <Modal
        open={allOpen}
        onOpenChange={setAllOpen}
        size="wide"
        title="Perlu tindak lanjut"
        description={`${waiting.length} jenis pekerjaan menunggu Anda.`}
        footer={
          <Button variant="secondary" onClick={() => setAllOpen(false)}>
            Tutup
          </Button>
        }
      >
        <QueueGroups items={inModal} />
      </Modal>
    </Panel>
  );
}

/** Baris dikelompokkan; judul kelompok hanya bila kedua kelompok hadir. */
function QueueGroups({ items }: { items: QueueItem[] }) {
  const groups = GROUP_ORDER.map((group) => ({ group, rows: items.filter((item) => item.group === group) })).filter(
    (entry) => entry.rows.length > 0,
  );
  return (
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
  );
}
