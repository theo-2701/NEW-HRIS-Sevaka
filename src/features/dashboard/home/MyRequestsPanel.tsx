import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Banknote, CalendarDays, ClipboardList, Clock3, Receipt, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '@/components/Modal';
import { Segmented } from '@/components/Segmented';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Panel, PanelLink } from '@/features/dashboard/home/Panel';
import { MY_REQUESTS_PANEL_LIMIT } from '@/features/dashboard/home/myRequestRules';
import { useMyRequests } from '@/features/dashboard/hooks/useDashboard';
import type { MyRequest, MyRequestKind } from '@/features/dashboard/types';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

const KIND_ICON: Record<MyRequestKind, LucideIcon> = {
  LEAVE: CalendarDays,
  OVERTIME: Clock3,
  CLAIM: Receipt,
  CASH_ADVANCE: Wallet,
  LOAN: Banknote,
};

const KIND_LABEL: Record<MyRequestKind, string> = {
  LEAVE: 'Cuti',
  OVERTIME: 'Lembur',
  CLAIM: 'Reimbursement',
  CASH_ADVANCE: 'Cash advance',
  LOAN: 'Pinjaman',
};

/** Satu baris pengajuan — dipakai bersama panel dan modal "Lihat semua". */
function MyRequestRow({ row, onOpen }: { row: MyRequest; onOpen: (row: MyRequest) => void }) {
  const Icon = KIND_ICON[row.kind];
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(row)}
        className="group grid w-full grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-secondary-50"
      >
        <span
          className={cn(
            'inline-flex size-9 items-center justify-center rounded-lg ring-1 ring-inset',
            row.open ? 'bg-secondary-50 text-secondary-700 ring-secondary-100' : 'bg-vapor text-fg-3 ring-border-1',
          )}
        >
          <Icon className="size-4" strokeWidth={1.75} />
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate font-body text-sm font-semibold text-fg-1 group-hover:text-fg-link">
            {row.title}
          </span>
          <span className="truncate font-body text-xs font-medium text-fg-3">
            {row.detail} · diajukan {formatDate(row.submittedAt)}
          </span>
        </span>
        <StatusBadge tone={row.tone}>{row.statusLabel}</StatusBadge>
      </button>
    </li>
  );
}

type KindFilter = MyRequestKind | 'ALL';

/** Daftar lengkap pengajuan saya, disaring per jenis. Jenis tanpa data tidak ditawarkan. */
function MyRequestsModal({
  open,
  onOpenChange,
  rows,
  onOpen,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: MyRequest[];
  onOpen: (row: MyRequest) => void;
}) {
  const [kind, setKind] = useState<KindFilter>('ALL');
  const kinds = (Object.keys(KIND_LABEL) as MyRequestKind[]).filter((value) => rows.some((row) => row.kind === value));
  const shown = kind === 'ALL' ? rows : rows.filter((row) => row.kind === kind);

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) setKind('ALL');
        onOpenChange(next);
      }}
      size="wide"
      title="Pengajuan saya"
      description="Semua pengajuan Anda yang masih berjalan dan yang selesai dalam 30 hari terakhir."
      footer={
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          Tutup
        </Button>
      }
    >
      <Segmented<KindFilter>
        value={kind}
        onChange={setKind}
        options={[
          { value: 'ALL', label: `Semua (${rows.length})` },
          ...kinds.map((value) => ({
            value,
            label: `${KIND_LABEL[value]} (${rows.filter((row) => row.kind === value).length})`,
          })),
        ]}
      />
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {shown.map((row) => (
          <MyRequestRow key={row.id} row={row} onOpen={onOpen} />
        ))}
      </ul>
    </Modal>
  );
}

/**
 * Pengajuan saya — pasangan tombol "More Request": ajukan dari hero, pantau di sini. Berlaku untuk
 * semua peran (setiap peran juga karyawan). Berbeda dari "Perlu tindak lanjut" (yang harus SAYA
 * putuskan): panel ini menunjukkan KEADAAN pengajuan sendiri saat ini. Panel memuat maks.
 * `MY_REQUESTS_PANEL_LIMIT` baris; sisanya lewat "Lihat semua (N)".
 */
export function MyRequestsPanel({ className }: { className?: string }) {
  const navigate = useNavigate();
  const [allOpen, setAllOpen] = useState(false);
  const { data, isLoading } = useMyRequests();
  const rows = data?.rows ?? [];
  const openCount = rows.filter((row) => row.open).length;
  const openRow = (row: MyRequest) => {
    setAllOpen(false);
    navigate(row.to);
  };

  return (
    <Panel
      title="Pengajuan saya"
      meta={isLoading ? 'Memuat…' : openCount ? `${openCount} masih berjalan` : 'Tidak ada yang masih berjalan'}
      icon={ClipboardList}
      className={className}
      action={
        rows.length > MY_REQUESTS_PANEL_LIMIT && (
          <PanelLink onClick={() => setAllOpen(true)}>Lihat semua ({rows.length})</PanelLink>
        )
      }
    >
      {isLoading ? (
        <p className="m-0 py-4 font-body text-[13px] font-medium text-fg-3">Memuat pengajuan…</p>
      ) : rows.length === 0 ? (
        <p className="m-0 py-4 font-body text-[13px] font-medium text-fg-3">
          {data?.partial ? 'Data pengajuan belum tersedia.' : 'Belum ada pengajuan. Ajukan lewat tombol More Request.'}
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {rows.slice(0, MY_REQUESTS_PANEL_LIMIT).map((row) => (
            <MyRequestRow key={row.id} row={row} onOpen={openRow} />
          ))}
        </ul>
      )}
      {data?.partial && rows.length > 0 && (
        <p className="m-0 pt-2 font-body text-xs font-medium text-fg-4">Sebagian data pengajuan belum tersedia.</p>
      )}

      <MyRequestsModal open={allOpen} onOpenChange={setAllOpen} rows={rows} onOpen={openRow} />
    </Panel>
  );
}
