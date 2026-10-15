import { useState } from 'react';
import { ArrowRight, ListChecks } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { ListSection, Panel, PanelLink } from '@/features/dashboard/home/Panel';
import { cn } from '@/lib/utils';
import {
  ACTION_QUEUE_PANEL_LIMIT,
  arrangeQueue,
  groupQueue,
  totalQueueCount,
  type QueueItem,
} from '@/features/dashboard/home/queueRules';

/**
 * Satu baris = satu JENIS pekerjaan + angka, bukan satu item — 10 cuti tetap satu baris "10", jadi
 * panel tidak memanjang. Baris bernilai 0 tidak ditampilkan (dengan puluhan jenis dari seluruh modul,
 * deret baris kosong membuat yang benar-benar menunggu tenggelam). Angka belum siap → "…".
 */
function QueueRow({ item }: { item: QueueItem }) {
  // Anatomi baris sama dengan "My requests" & "Announcements": tile 36px + dua baris teks + elemen
  // kanan, padding p-2, hover bg penuh. Bedanya disengaja: tile ikon di panel lain bertint muda,
  // tile angka di sini ISI PENUH (bg-secondary-500, pola "terpilih/aktif" di calendar & checkbox)
  // supaya terbaca sebagai hitungan sisa tugas, bukan ikon. Saat memuat kembali ke tint muda.
  const loading = item.count === null;
  const body = (
    <>
      <span
        className={cn(
          'inline-flex size-9 items-center justify-center rounded-lg font-display text-[15px] font-bold leading-none tabular-nums',
          loading
            ? 'bg-secondary-50 text-secondary-700 ring-1 ring-inset ring-secondary-100'
            : 'bg-secondary-500 text-white',
        )}
      >
        {item.count ?? '…'}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate font-body text-sm font-semibold text-fg-1 group-hover:text-fg-link">
          {item.title}
        </span>
        <span className="truncate font-body text-xs font-medium text-fg-3">{item.detail}</span>
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
  const grid = 'grid w-full grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg p-2 text-left';

  return (
    <li>
      {item.action ? (
        <button
          type="button"
          onClick={item.action.onClick}
          className={`group ${grid} transition-colors hover:bg-secondary-50`}
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
 * Perlu tindak lanjut — pekerjaan yang menunggu SAYA, keputusan approver/checker dan tugas pribadi
 * dalam satu daftar. Baris dua kolom di layar lebar.
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
  const total = totalQueueCount(waiting);
  const totalLabel = total === null ? 'Work' : `${total} ${total === 1 ? 'item' : 'items'}`;

  return (
    <Panel
      title="To do"
      meta={
        waiting.length === 0
          ? 'Nothing waiting on you'
          : total === null
            ? 'Work waiting on you'
            : `${totalLabel} waiting on you`
      }
      icon={ListChecks}
      action={
        waiting.length > ACTION_QUEUE_PANEL_LIMIT && (
          <PanelLink onClick={() => setAllOpen(true)}>View all ({waiting.length})</PanelLink>
        )
      }
    >
      {waiting.length === 0 ? (
        <p className="m-0 py-4 font-body text-[13px] font-medium text-fg-3">Nothing is waiting for you right now.</p>
      ) : (
        <QueueGroups items={waiting.slice(0, ACTION_QUEUE_PANEL_LIMIT)} />
      )}

      <Modal
        open={allOpen}
        onOpenChange={setAllOpen}
        size="wide"
        className="max-w-[960px]"
        title="To do"
        description={`${totalLabel} across ${waiting.length} types, grouped by area. Biggest first in each group.`}
        footer={
          <Button variant="secondary" onClick={() => setAllOpen(false)}>
            Close
          </Button>
        }
      >
        {groupQueue(inModal).map((section) => (
          <ListSection
            key={section.id}
            label={section.label}
            count={section.total === null ? '…' : `${section.total} waiting`}
          >
            <QueueGroups items={section.items} />
          </ListSection>
        ))}
      </Modal>
    </Panel>
  );
}

/** Baris mengalir dua kolom di layar lebar, tanpa judul kelompok. */
function QueueGroups({ items }: { items: QueueItem[] }) {
  return (
    <ul className="m-0 grid list-none gap-x-6 gap-y-1 p-0 lg:grid-cols-2">
      {items.map((item) => (
        <QueueRow key={item.key} item={item} />
      ))}
    </ul>
  );
}
