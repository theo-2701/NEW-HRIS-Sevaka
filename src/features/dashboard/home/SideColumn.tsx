import { Megaphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { StatusBadge, toneForStatus } from '@/components/StatusBadge';
import { Panel, PanelLink } from '@/features/dashboard/home/Panel';
import { daysUntil } from '@/features/dashboard/home/homeRules';
import { useMyAnnouncements } from '@/features/announcement/hooks/useAnnouncement';
import { MY_ANNOUNCEMENTS_PATH } from '@/features/announcement/types';
import type { ContractRow } from '@/features/dashboard/types';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** Tiga pengumuman terbit terbaru — blok tanggal bertint biru supaya mudah dipindai. */
export function AnnouncementsPanel({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { data: rows = [], isLoading } = useMyAnnouncements('ROLE_EMPLOYEE');

  return (
    <Panel
      title="Pengumuman"
      meta="Terbaru untuk Anda"
      icon={Megaphone}
      className={className}
      action={<PanelLink onClick={() => navigate(MY_ANNOUNCEMENTS_PATH)}>Lihat semua</PanelLink>}
    >
      {isLoading ? (
        <p className="m-0 py-4 font-body text-[13px] font-medium text-fg-3">Memuat pengumuman…</p>
      ) : rows.length === 0 ? (
        <p className="m-0 py-4 font-body text-[13px] font-medium text-fg-3">Belum ada pengumuman untuk Anda.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {rows.slice(0, 3).map((row) => {
            const date = new Date(row.publishedAt);
            return (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => navigate(`${MY_ANNOUNCEMENTS_PATH}?id=${row.id}`)}
                  className="group flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-secondary-50"
                >
                  <span className="flex size-11 shrink-0 flex-col items-center justify-center rounded-lg bg-secondary-50 ring-1 ring-inset ring-secondary-100">
                    <span className="font-display text-base font-bold leading-none text-secondary-700 tabular-nums">
                      {date.getDate()}
                    </span>
                    <span className="font-body text-[10px] font-bold uppercase tracking-[0.06em] text-secondary-600">
                      {MONTHS[date.getMonth()]}
                    </span>
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate font-body text-sm font-semibold text-fg-1 group-hover:text-fg-link">
                      {row.title}
                    </span>
                    <span className="font-body text-xs font-medium text-fg-3">
                      {String(date.getHours()).padStart(2, '0')}:{String(date.getMinutes()).padStart(2, '0')} ·{' '}
                      {date.getFullYear()}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

const CONTRACT_LABEL: Record<ContractRow['status'], string> = {
  PROBATION: 'Probation',
  CONTRACT: 'Kontrak',
  PERMANENT: 'Tetap',
};

/**
 * Kontrak & probation terdekat — dibuka dari baris antrean "Kontrak & probation ≤ 30 hari", bukan
 * panel tetap (panelnya di-cut: tanpa kontrak data FSD-AUTH §2.9 dan isinya sudah diwakili antrean).
 */
export function ContractsModal({
  open,
  onOpenChange,
  contracts,
  now,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contracts: ContractRow[];
  now: Date;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Kontrak & probation berakhir"
      description="Kontrak dan masa probation terdekat, urut tanggal berakhir."
      footer={
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          Tutup
        </Button>
      }
    >
      <ContractsList contracts={contracts} now={now} />
    </Modal>
  );
}

/** Daftar kontrak non-permanen — urut tanggal, sisa hari sebagai pil berwarna. */
function ContractsList({ contracts, now }: { contracts: ContractRow[]; now: Date }) {
  const rows = [...contracts]
    .filter((row) => row.status !== 'PERMANENT')
    .sort((a, b) => a.endDate.localeCompare(b.endDate))
    .slice(0, 10);

  return (
    <>
      {rows.length === 0 ? (
        <p className="m-0 py-4 font-body text-[13px] font-medium text-fg-3">Tidak ada kontrak yang akan berakhir.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {rows.map((row) => {
            const left = daysUntil(row.endDate, now);
            return (
              <li
                key={row.id}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg p-2 transition-colors hover:bg-vapor/70"
              >
                <Avatar name={row.employee} size="md" />
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="truncate font-body text-sm font-semibold text-fg-1">{row.employee}</span>
                  <span className="flex items-center gap-2">
                    <StatusBadge tone={toneForStatus(row.status)}>{CONTRACT_LABEL[row.status]}</StatusBadge>
                    <span className="whitespace-nowrap font-body text-xs font-medium text-fg-3">
                      {formatDate(row.endDate)}
                    </span>
                  </span>
                </span>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-1 text-right font-body text-xs font-bold tabular-nums',
                    left <= 7
                      ? 'bg-error-50 text-error-700'
                      : left <= 30
                        ? 'bg-warning-50 text-warning-800'
                        : 'bg-vapor text-fg-3',
                  )}
                >
                  {left < 0 ? 'Lewat' : left === 0 ? 'Hari ini' : `${left} hari`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
