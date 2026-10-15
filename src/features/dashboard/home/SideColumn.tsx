import { Megaphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { StatusBadge, toneForStatus } from '@/components/StatusBadge';
import { Panel, PanelLink } from '@/features/dashboard/home/Panel';
import { daysUntil, formatDateEn } from '@/features/dashboard/home/homeRules';
import { useMyAnnouncements } from '@/features/announcement/hooks/useAnnouncement';
import { MY_ANNOUNCEMENTS_PATH } from '@/features/announcement/types';
import type { ContractRow } from '@/features/dashboard/types';
import { cn } from '@/lib/utils';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Sama dengan batas "My requests" supaya dua panel bersanding setinggi. */
const ANNOUNCEMENTS_PANEL_LIMIT = 5;

/** Lima pengumuman terbit terbaru — blok tanggal bertint biru supaya mudah dipindai. */
export function AnnouncementsPanel({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { data: rows = [], isLoading } = useMyAnnouncements('ROLE_EMPLOYEE');

  return (
    <Panel
      title="Announcements"
      meta="Latest for you"
      icon={Megaphone}
      className={className}
      action={<PanelLink onClick={() => navigate(MY_ANNOUNCEMENTS_PATH)}>View all</PanelLink>}
    >
      {isLoading ? (
        <p className="m-0 py-4 font-body text-[13px] font-medium text-fg-3">Loading announcements…</p>
      ) : rows.length === 0 ? (
        <p className="m-0 py-4 font-body text-[13px] font-medium text-fg-3">No announcements for you yet.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {rows.slice(0, ANNOUNCEMENTS_PANEL_LIMIT).map((row) => {
            const date = new Date(row.publishedAt);
            return (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => navigate(`${MY_ANNOUNCEMENTS_PATH}?id=${row.id}`)}
                  className="group grid w-full grid-cols-[36px_minmax(0,1fr)] items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-secondary-50"
                >
                  <span className="flex size-9 flex-col items-center justify-center rounded-lg bg-secondary-50 ring-1 ring-inset ring-secondary-100">
                    <span className="font-display text-sm font-bold leading-none text-secondary-700 tabular-nums">
                      {date.getDate()}
                    </span>
                    <span className="font-body text-[9px] font-bold uppercase leading-tight tracking-[0.06em] text-secondary-600">
                      {MONTHS[date.getMonth()]}
                    </span>
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate font-body text-sm font-semibold text-fg-1 group-hover:text-fg-link">
                      {row.title}
                    </span>
                    <span className="truncate font-body text-xs font-medium text-fg-3">
                      Published {formatDateEn(row.publishedAt)} · {String(date.getHours()).padStart(2, '0')}:
                      {String(date.getMinutes()).padStart(2, '0')}
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
  CONTRACT: 'Contract',
  PERMANENT: 'Permanent',
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
      title="Contracts & probation ending"
      description="Nearest contract and probation end dates, sorted by end date."
      footer={
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          Close
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
        <p className="m-0 py-4 font-body text-[13px] font-medium text-fg-3">No contracts ending soon.</p>
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
                      {formatDateEn(row.endDate)}
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
                  {left < 0 ? 'Overdue' : left === 0 ? 'Today' : `${left} ${left === 1 ? 'day' : 'days'}`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
