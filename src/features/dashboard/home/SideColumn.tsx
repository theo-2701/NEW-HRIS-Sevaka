import { useNavigate } from 'react-router-dom';
import { StatusBadge, toneForStatus } from '@/components/StatusBadge';
import { Panel, PanelLink } from '@/features/dashboard/home/Panel';
import { daysUntil } from '@/features/dashboard/home/homeRules';
import { useMyAnnouncements } from '@/features/announcement/hooks/useAnnouncement';
import { MY_ANNOUNCEMENTS_PATH } from '@/features/announcement/types';
import type { ContractRow } from '@/features/dashboard/types';
import { formatDate, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Tiga pengumuman terbit terbaru untuk peran karyawan. */
export function AnnouncementsPanel() {
  const navigate = useNavigate();
  const { data: rows = [], isLoading } = useMyAnnouncements('ROLE_EMPLOYEE');

  return (
    <Panel title="Pengumuman" action={<PanelLink onClick={() => navigate(MY_ANNOUNCEMENTS_PATH)}>Lihat semua</PanelLink>}>
      {isLoading ? (
        <p className="m-0 py-4 font-body text-[13px] font-medium text-fg-3">Memuat pengumuman…</p>
      ) : rows.length === 0 ? (
        <p className="m-0 py-4 font-body text-[13px] font-medium text-fg-3">Belum ada pengumuman untuk Anda.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col divide-y divide-border-1 p-0">
          {rows.slice(0, 3).map((row) => (
            <li key={row.id} className="py-2.5 first:pt-0 last:pb-0">
              <button
                type="button"
                onClick={() => navigate(`${MY_ANNOUNCEMENTS_PATH}?id=${row.id}`)}
                className="flex w-full flex-col gap-0.5 text-left"
              >
                <span className="font-body text-sm font-semibold text-fg-1 hover:text-fg-link">{row.title}</span>
                <span className="font-body text-xs font-medium text-fg-3">{formatDateTime(row.publishedAt)}</span>
              </button>
            </li>
          ))}
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

/** Kontrak & probation yang paling dekat berakhir — urut tanggal, sisa hari eksplisit. */
export function ContractsPanel({ contracts, now }: { contracts: ContractRow[]; now: Date }) {
  const rows = [...contracts]
    .filter((row) => row.status !== 'PERMANENT')
    .sort((a, b) => a.endDate.localeCompare(b.endDate))
    .slice(0, 5);

  return (
    <Panel title="Kontrak berakhir" meta="Kontrak & probation">
      {rows.length === 0 ? (
        <p className="m-0 py-4 font-body text-[13px] font-medium text-fg-3">Tidak ada kontrak yang akan berakhir.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col divide-y divide-border-1 p-0">
          {rows.map((row) => {
            const left = daysUntil(row.endDate, now);
            return (
              <li key={row.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="truncate font-body text-sm font-semibold text-fg-1">{row.employee}</span>
                  <span className="flex items-center gap-2">
                    <StatusBadge tone={toneForStatus(row.status)}>{CONTRACT_LABEL[row.status]}</StatusBadge>
                    <span className="font-body text-xs font-medium text-fg-3">{formatDate(row.endDate)}</span>
                  </span>
                </span>
                <span
                  className={cn(
                    'text-right font-body text-xs font-semibold tabular-nums',
                    left <= 14 ? 'text-warning-800' : 'text-fg-3',
                  )}
                >
                  {left < 0 ? 'Lewat' : left === 0 ? 'Hari ini' : `${left} hari lagi`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

const QUICK_LINKS = [
  { label: 'Profil saya', to: '/me/profile' },
  { label: 'Employee Directory', to: '/employees/directory' },
  { label: 'Employee Transfer', to: '/employees/transfer' },
  { label: 'Company settings', to: '/company/branch' },
  { label: 'Announcement', to: '/company-management/announcements' },
  { label: 'Activity Log', to: '/company-management/activity-log' },
];

export function QuickAccessPanel() {
  const navigate = useNavigate();
  return (
    <Panel title="Akses cepat">
      <ul className="m-0 grid list-none grid-cols-2 gap-x-4 gap-y-2 p-0">
        {QUICK_LINKS.map((link) => (
          <li key={link.to}>
            <button
              type="button"
              onClick={() => navigate(link.to)}
              className="font-body text-[13px] font-semibold text-fg-link hover:text-fg-link-hover hover:underline"
            >
              {link.label}
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
