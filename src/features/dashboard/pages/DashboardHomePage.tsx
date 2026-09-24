import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UnlockAccountModal } from '@/features/dashboard/components/UnlockAccountModal';
import { useDashboardSummary, useHomeStats, useMe } from '@/features/dashboard/hooks/useDashboard';
import { ActionQueue, type QueueItem } from '@/features/dashboard/home/ActionQueue';
import { HomeHeader } from '@/features/dashboard/home/HomeHeader';
import { AnnouncementsPanel, ContractsPanel, QuickAccessPanel } from '@/features/dashboard/home/SideColumn';
import { TodayLedger } from '@/features/dashboard/home/TodayLedger';
import { WorkforcePanel } from '@/features/dashboard/home/WorkforcePanel';
import { canSeeCompanyLayer, daysUntil } from '@/features/dashboard/home/homeRules';
import { useAnnouncements } from '@/features/announcement/hooks/useAnnouncement';
import { ANNOUNCEMENT_LIST_PATH } from '@/features/announcement/types';
import { useLeaveRequests } from '@/features/time-off/hooks/useTimeOff';
import { VIEWERS } from '@/features/time-off/mock-data';
import { useAuthStore } from '@/store/auth.store';

const COMPANY_NAME: Record<string, string> = {
  DIKA: 'PT DIKA',
  BAHARI: 'PT Bahari Logistik',
  SINAR: 'PT Sinar Agro Lestari',
};

/** Sesi approver cuti untuk menghitung antrean keputusan (mode dummy). */
const APPROVER = VIEWERS[0];
const DRAFT_FILTER = { status: 'DRAFT' as const, page: 1, size: 1 };

/**
 * Home / Dashboard — versi renovasi (FSD-001-AUTH §2.9 · §6).
 *
 * Isi kontrak tetap utuh: sapaan dari `GET /auth/me`, lima angka HOME dua lapis dengan
 * gagal-sebagian "—", dan pintu Buka Kunci Akun. Susunannya diubah dari hero bergambar +
 * kartu grafik seragam menjadi pita angka, antrean tindak lanjut, dan satu panel tenaga
 * kerja. Versi lama (`DashboardPage`) tetap ada di `/dashboard/classic`.
 */
export function DashboardHomePage() {
  const navigate = useNavigate();
  const now = useMemo(() => new Date(), []);
  const user = useAuthStore((s) => s.user);
  const companyId = useAuthStore((s) => s.companyId);
  const companyLayer = canSeeCompanyLayer(user?.role);
  const [unlockOpen, setUnlockOpen] = useState(false);

  const { data: me } = useMe();
  const summary = useDashboardSummary();
  const stats = useHomeStats();
  const leave = useLeaveRequests(APPROVER);
  const drafts = useAnnouncements(DRAFT_FILTER);

  const contracts = summary.data?.contracts ?? [];
  const endingSoon = contracts.filter((row) => {
    const left = daysUntil(row.endDate, now);
    return row.status !== 'PERMANENT' && left >= 0 && left <= 30;
  }).length;

  const queue: QueueItem[] = [
    {
      key: 'leave',
      count: leave.data
        ? leave.data.filter((row) => row.status === 'PENDING_APPROVAL' && row.employeeId !== APPROVER.employeeId).length
        : null,
      title: 'Pengajuan cuti menunggu keputusan',
      detail: 'Putuskan sebelum tanggal cutinya tiba.',
      action: { label: 'Tinjau', onClick: () => navigate('/time/time-off/requests') },
    },
    {
      key: 'locked',
      count: summary.data ? summary.data.lockedAccounts.length : null,
      title: 'Akun karyawan terkunci',
      detail: 'Terkunci otomatis setelah 5× gagal login; terbuka sendiri dalam 15 menit.',
      action: { label: 'Buka kunci', onClick: () => setUnlockOpen(true) },
    },
    {
      key: 'contracts',
      count: summary.data ? endingSoon : null,
      title: 'Kontrak & probation berakhir ≤ 30 hari',
      detail: 'Rinciannya ada di panel Kontrak berakhir.',
    },
    {
      key: 'drafts',
      count: drafts.data ? drafts.data.totalData : null,
      title: 'Rancangan pengumuman belum terbit',
      detail: 'Lengkapi peran penerima lalu terbitkan.',
      action: { label: 'Buka', onClick: () => navigate(ANNOUNCEMENT_LIST_PATH) },
    },
  ];

  const pendingCount = companyLayer
    ? queue.some((item) => item.count === null)
      ? null
      : queue.reduce((sum, item) => sum + (item.count ?? 0), 0)
    : 0;

  return (
    <>
      <HomeHeader
        name={me?.nickname || me?.fullName || null}
        companyName={COMPANY_NAME[companyId ?? ''] ?? companyId ?? ''}
        pendingCount={pendingCount}
        lockedCount={summary.data ? summary.data.lockedAccounts.length : null}
        onUnlock={companyLayer ? () => setUnlockOpen(true) : undefined}
        now={now}
      />

      <TodayLedger stats={stats.data} loading={stats.isLoading} companyLayer={companyLayer} />

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-4">
          {companyLayer && <ActionQueue items={queue} />}
          <WorkforcePanel summary={summary.data} />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <AnnouncementsPanel />
          {companyLayer && <ContractsPanel contracts={contracts} now={now} />}
          <QuickAccessPanel />
        </div>
      </div>

      <UnlockAccountModal open={unlockOpen} onOpenChange={setUnlockOpen} />
    </>
  );
}
