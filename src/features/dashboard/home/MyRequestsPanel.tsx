import type { LucideIcon } from 'lucide-react';
import { Banknote, CalendarDays, ClipboardList, Clock3, Receipt, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '@/components/StatusBadge';
import { Panel } from '@/features/dashboard/home/Panel';
import { useMyRequests } from '@/features/dashboard/hooks/useDashboard';
import type { MyRequestKind } from '@/features/dashboard/types';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

const KIND_ICON: Record<MyRequestKind, LucideIcon> = {
  LEAVE: CalendarDays,
  OVERTIME: Clock3,
  CLAIM: Receipt,
  CASH_ADVANCE: Wallet,
  LOAN: Banknote,
};

/**
 * Pengajuan saya — pasangan tombol "More Request": ajukan dari hero, pantau di sini. Berlaku untuk
 * semua peran (setiap peran juga karyawan). Berbeda dari "Perlu tindak lanjut" (yang harus SAYA
 * putuskan) dan Notifikasi (kejadian): panel ini menunjukkan KEADAAN pengajuan sendiri saat ini.
 */
export function MyRequestsPanel({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { data, isLoading } = useMyRequests();
  const rows = data?.rows ?? [];
  const openCount = rows.filter((row) => row.open).length;

  return (
    <Panel
      title="Pengajuan saya"
      meta={isLoading ? 'Memuat…' : openCount ? `${openCount} masih berjalan` : 'Tidak ada yang masih berjalan'}
      icon={ClipboardList}
      className={className}
    >
      {isLoading ? (
        <p className="m-0 py-4 font-body text-[13px] font-medium text-fg-3">Memuat pengajuan…</p>
      ) : rows.length === 0 ? (
        <p className="m-0 py-4 font-body text-[13px] font-medium text-fg-3">
          {data?.partial ? 'Data pengajuan belum tersedia.' : 'Belum ada pengajuan. Ajukan lewat tombol More Request.'}
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {rows.map((row) => {
            const Icon = KIND_ICON[row.kind];
            return (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => navigate(row.to)}
                  className="group grid w-full grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-secondary-50"
                >
                  <span
                    className={cn(
                      'inline-flex size-9 items-center justify-center rounded-lg ring-1 ring-inset',
                      row.open
                        ? 'bg-secondary-50 text-secondary-700 ring-secondary-100'
                        : 'bg-vapor text-fg-3 ring-border-1',
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
          })}
        </ul>
      )}
      {data?.partial && rows.length > 0 && (
        <p className="m-0 pt-2 font-body text-xs font-medium text-fg-4">Sebagian data pengajuan belum tersedia.</p>
      )}
    </Panel>
  );
}
