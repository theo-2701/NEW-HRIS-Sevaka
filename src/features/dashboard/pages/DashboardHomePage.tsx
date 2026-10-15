import { useMemo, useState } from 'react';
import { Banknote, CalendarClock, FileClock, LockKeyhole, MailPlus, Megaphone, Receipt, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UnlockAccountModal } from '@/features/dashboard/components/UnlockAccountModal';
import { ResendInvitationModal } from '@/features/dashboard/components/ResendInvitationModal';
import { usePendingInvitations } from '@/features/auth/hooks/useAuth';
import { useDashboardSummary, useHomeStats, useMe, useMyRequests } from '@/features/dashboard/hooks/useDashboard';
import { MY_REQUEST_ROUTES } from '@/features/dashboard/home/myRequestRules';
import type { MyRequestTodo } from '@/features/dashboard/types';
import { ActionQueue, type QueueItem } from '@/features/dashboard/home/ActionQueue';
import { HomeHeader } from '@/features/dashboard/home/HomeHeader';
import { AnnouncementsPanel, ContractsModal } from '@/features/dashboard/home/SideColumn';
import { MyRequestsPanel } from '@/features/dashboard/home/MyRequestsPanel';
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
  const [inviteOpen, setInviteOpen] = useState(false);
  const [contractsOpen, setContractsOpen] = useState(false);

  const { data: me } = useMe();
  const summary = useDashboardSummary();
  const stats = useHomeStats();
  const leave = useLeaveRequests(APPROVER);
  const drafts = useAnnouncements(DRAFT_FILTER);
  const invitations = usePendingInvitations(companyLayer);

  const contracts = summary.data?.contracts ?? [];
  const endingSoon = contracts.filter((row) => {
    const left = daysUntil(row.endDate, now);
    return row.status !== 'PERMANENT' && left >= 0 && left <= 30;
  }).length;

  /** Tugas pribadi diturunkan dari pengajuan sendiri yang menuntut tindakan (berlaku semua peran). */
  const myRequests = useMyRequests();
  const todoCount = (todo: MyRequestTodo) =>
    myRequests.data ? myRequests.data.rows.filter((row) => row.todo === todo).length : null;
  const personal: QueueItem[] = [
    {
      key: 'ack-loan',
      group: 'mine',
      count: todoCount('ACK_LOAN'),
      title: 'Jadwal pinjaman perlu Anda setujui',
      icon: Banknote,
      detail: 'Periksa cicilan dan bunga, lalu setujui atau tolak jadwalnya.',
      action: { label: 'Buka', onClick: () => navigate(MY_REQUEST_ROUTES.LOAN) },
    },
    {
      key: 'settle-advance',
      group: 'mine',
      count: todoCount('SETTLE_ADVANCE'),
      title: 'Cash advance perlu dipertanggungjawabkan',
      icon: Wallet,
      detail: 'Unggah nota pemakaian uang muka yang sudah cair.',
      action: { label: 'Buka', onClick: () => navigate(MY_REQUEST_ROUTES.CASH_ADVANCE) },
    },
    {
      key: 'resubmit-claim',
      group: 'mine',
      count: todoCount('RESUBMIT_CLAIM'),
      title: 'Klaim dikembalikan untuk dilengkapi',
      icon: Receipt,
      detail: 'Lengkapi kekurangannya lalu ajukan kembali.',
      action: { label: 'Buka', onClick: () => navigate(MY_REQUEST_ROUTES.CLAIM) },
    },
  ];

  const companyQueue: QueueItem[] = [
    {
      key: 'leave',
      group: 'decide',
      count: leave.data
        ? leave.data.filter((row) => row.status === 'PENDING_APPROVAL' && row.employeeId !== APPROVER.employeeId).length
        : null,
      title: 'Pengajuan cuti menunggu keputusan',
      icon: CalendarClock,
      detail: 'Putuskan sebelum tanggal cutinya tiba.',
      action: { label: 'Tinjau', onClick: () => navigate('/time/time-off/requests') },
    },
    {
      key: 'locked',
      group: 'decide',
      count: summary.data ? summary.data.lockedAccounts.length : null,
      title: 'Akun karyawan terkunci',
      icon: LockKeyhole,
      detail: 'Terkunci otomatis setelah 5× gagal login; terbuka sendiri dalam 15 menit.',
      action: { label: 'Buka kunci', onClick: () => setUnlockOpen(true) },
    },
    {
      key: 'invitations',
      group: 'decide',
      count: invitations.data ? invitations.data.length : null,
      title: 'Akun menunggu aktivasi',
      detail: 'Undangan belum dipakai pemiliknya; kirim ulang bila tautannya hilang atau kedaluwarsa.',
      icon: MailPlus,
      action: { label: 'Kirim ulang', onClick: () => setInviteOpen(true) },
    },
    {
      key: 'contracts',
      group: 'decide',
      count: summary.data ? endingSoon : null,
      title: 'Kontrak & probation berakhir ≤ 30 hari',
      icon: FileClock,
      detail: 'Perpanjang, angkat, atau akhiri sebelum tanggalnya lewat.',
      action: { label: 'Lihat', onClick: () => setContractsOpen(true) },
    },
    {
      key: 'drafts',
      group: 'decide',
      count: drafts.data ? drafts.data.totalData : null,
      title: 'Rancangan pengumuman belum terbit',
      icon: Megaphone,
      detail: 'Lengkapi peran penerima lalu terbitkan.',
      action: { label: 'Buka', onClick: () => navigate(ANNOUNCEMENT_LIST_PATH) },
    },
  ];

  // Baris approval/checker hanya untuk HR/manajemen; tugas pribadi untuk semua peran.
  const queue = companyLayer ? [...companyQueue, ...personal] : personal;
  const pendingCount = queue.some((item) => item.count === null)
    ? null
    : queue.reduce((sum, item) => sum + (item.count ?? 0), 0);

  return (
    <>
      <HomeHeader
        name={me?.nickname || me?.fullName || null}
        companyName={COMPANY_NAME[companyId ?? ''] ?? companyId ?? ''}
        pendingCount={pendingCount}
        lockedCount={summary.data ? summary.data.lockedAccounts.length : null}
        onUnlock={companyLayer ? () => setUnlockOpen(true) : undefined}
        now={now}
      >
        <TodayLedger stats={stats.data} loading={stats.isLoading} companyLayer={companyLayer} />
      </HomeHeader>

      {/*
        Tiga kartu, dua baris. Perlu tindak lanjut selebar halaman: isinya bisa puluhan jenis dari
        seluruh modul, jadi barisnya mengalir dua kolom dan menyusut jadi satu kalimat bila kosong.
        Di bawahnya Pengajuan saya (daftar lebar, 7/12) bersanding Pengumuman (ringkas, 5/12).
      */}
      <ActionQueue items={queue} />
      <div className="grid gap-4 lg:grid-cols-12">
        <MyRequestsPanel className="lg:col-span-7" />
        <AnnouncementsPanel className="lg:col-span-5" />
      </div>

      {/* Data tenaga kerja = data perusahaan → hanya HR/manajemen (koreksi DB-10 paket 05). */}
      {companyLayer && <WorkforcePanel summary={summary.data} />}

      <ContractsModal open={contractsOpen} onOpenChange={setContractsOpen} contracts={contracts} now={now} />
      <UnlockAccountModal open={unlockOpen} onOpenChange={setUnlockOpen} />
      <ResendInvitationModal open={inviteOpen} onOpenChange={setInviteOpen} />
    </>
  );
}
