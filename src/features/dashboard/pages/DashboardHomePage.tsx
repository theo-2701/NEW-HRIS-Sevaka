import { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Banknote,
  Briefcase,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  Clock3,
  FileClock,
  FileUp,
  LockKeyhole,
  MailPlus,
  Megaphone,
  PhoneCall,
  Receipt,
  ShieldAlert,
  UserMinus,
  UserPlus,
  Wallet,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCorrections } from '@/features/attendance/hooks/useAttendance';
import { VIEWERS as ATTENDANCE_VIEWERS } from '@/features/attendance/mock-data';
import { useClaims } from '@/features/benefit/hooks/useBenefit';
import { useHolidays } from '@/features/calendar/hooks/useCalendar';
import { useAdvances } from '@/features/cash-advance/hooks/useCashAdvance';
import { VIEWERS as ADVANCE_VIEWERS } from '@/features/cash-advance/mock-data';
import { useLoans } from '@/features/loan/hooks/useLoan';
import { useRequisitions } from '@/features/manpower/hooks/useManpower';
import { useBatches } from '@/features/mass-resignation/hooks/useMassResignation';
import { useCandidates } from '@/features/new-joiner/hooks/useNewJoiner';
import { useOncallAssignments } from '@/features/oncall/hooks/useOncall';
import { useOvertimeRequests } from '@/features/overtime/hooks/useOvertime';
import { VIEWERS as OVERTIME_VIEWERS } from '@/features/overtime/mock-data';
import { useReprimands } from '@/features/reprimand/hooks/useReprimand';
import { useSwaps } from '@/features/scheduler/hooks/useScheduler';
import { useImportBatches } from '@/features/bulk-import/hooks/useBulkImport';
import { UnlockAccountModal } from '@/features/dashboard/components/UnlockAccountModal';
import { ResendInvitationModal } from '@/features/dashboard/components/ResendInvitationModal';
import { usePendingInvitations } from '@/features/auth/hooks/useAuth';
import { useDashboardSummary, useHomeStats, useMe, useMyRequests } from '@/features/dashboard/hooks/useDashboard';
import { MY_REQUEST_ROUTES } from '@/features/dashboard/home/myRequestRules';
import type { MyRequestTodo } from '@/features/dashboard/types';
import { ActionQueue } from '@/features/dashboard/home/ActionQueue';
import type { QueueItem } from '@/features/dashboard/home/queueRules';
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
const NO_IMPORT_FILTER = {};

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
  const go = (label: string, to: string) => ({ label, onClick: () => navigate(to) });
  const personal: QueueItem[] = [
    {
      key: 'ack-loan',
      icon: Banknote,
      count: todoCount('ACK_LOAN'),
      title: 'Loan schedule needs your approval',
      detail: 'Check the instalments and interest, then accept or decline the schedule.',
      action: go('Open', MY_REQUEST_ROUTES.LOAN),
    },
    {
      key: 'settle-advance',
      icon: Wallet,
      count: todoCount('SETTLE_ADVANCE'),
      title: 'Cash advance needs settlement',
      detail: 'Upload receipts for the disbursed advance.',
      action: go('Open', MY_REQUEST_ROUTES.CASH_ADVANCE),
    },
    {
      key: 'resubmit-claim',
      icon: Receipt,
      count: todoCount('RESUBMIT_CLAIM'),
      title: 'Claim returned for completion',
      detail: 'Complete the missing items, then resubmit.',
      action: go('Open', MY_REQUEST_ROUTES.CLAIM),
    },
  ];

  // Antrean keputusan per modul (sesi approver dummy masing-masing modul).
  // ponytail: hook tetap dipanggil untuk semua peran; beri `enabled: companyLayer` saat cabang api tersambung.
  const overtime = useOvertimeRequests(OVERTIME_VIEWERS[0], {});
  const corrections = useCorrections(ATTENDANCE_VIEWERS[0], {});
  const swaps = useSwaps();
  const oncall = useOncallAssignments({});
  const holidays = useHolidays({});
  const claims = useClaims({});
  const loans = useLoans();
  const advances = useAdvances(ADVANCE_VIEWERS[0], {});
  const requisitions = useRequisitions();
  const candidates = useCandidates();
  const resignations = useBatches();
  const reprimands = useReprimands();
  const imports = useImportBatches(NO_IMPORT_FILTER);
  const pending = <T,>(rows: T[] | undefined, isPending: (row: T) => boolean) =>
    rows ? rows.filter(isPending).length : null;

  const companyQueue: QueueItem[] = [
    {
      key: 'leave',
      icon: CalendarClock,
      count: pending(leave.data, (row) => row.status === 'PENDING_APPROVAL' && row.employeeId !== APPROVER.employeeId),
      title: 'Leave requests awaiting decision',
      detail: 'Decide before the leave date arrives.',
      action: go('Review', '/time/time-off/requests'),
    },
    {
      key: 'overtime',
      icon: Clock3,
      count: pending(overtime.data, (row) => row.overtimeStatus === 'PENDING_APPROVAL'),
      title: 'Overtime requests awaiting decision',
      detail: 'Overtime requests waiting for your decision.',
      action: go('Review', '/time/overtime'),
    },
    {
      key: 'corrections',
      icon: CalendarCheck,
      count: pending(corrections.data, (row) => row.correctionStatus === 'PENDING_APPROVAL'),
      title: 'Attendance corrections awaiting decision',
      detail: 'Attendance corrections waiting for your decision.',
      action: go('Review', '/time/attendance'),
    },
    {
      key: 'swaps',
      icon: ArrowLeftRight,
      count: pending(swaps.data, (row) => row.swapStatus === 'PENDING_APPROVAL'),
      title: 'Shift swaps awaiting decision',
      detail: 'Shift swap requests waiting for your decision.',
      action: go('Review', '/time/scheduler/schedule'),
    },
    {
      key: 'oncall',
      icon: PhoneCall,
      count: pending(oncall.data, (row) => row.oncallStatus === 'PENDING_APPROVAL'),
      title: 'On-call rosters awaiting decision',
      detail: 'On-call schedules waiting for your decision.',
      action: go('Review', '/time/on-call'),
    },
    {
      key: 'holidays',
      icon: CalendarDays,
      count: pending(holidays.data, (row) => row.approvalStatus === 'PENDING_APPROVAL'),
      title: 'Holiday proposals awaiting decision',
      detail: 'Holiday proposals waiting for your decision.',
      action: go('Review', '/time/calendar'),
    },
    {
      key: 'claims',
      icon: Receipt,
      count: pending(claims.data, (row) => row.status === 'SUBMITTED'),
      title: 'Reimbursement claims awaiting decision',
      detail: 'Benefit claims waiting for your decision.',
      action: go('Review', '/finance/benefit-reimbursement'),
    },
    {
      key: 'loans',
      icon: Banknote,
      count: pending(loans.data, (row) => row.status === 'SUBMITTED'),
      title: 'Loan requests awaiting decision',
      detail: 'Loan requests waiting for your decision.',
      action: go('Review', '/finance/loan'),
    },
    {
      key: 'advances',
      icon: Wallet,
      count: pending(advances.data, (row) => row.status === 'SUBMITTED'),
      title: 'Cash advance requests awaiting decision',
      detail: 'Advance requests waiting for your decision.',
      action: go('Review', '/finance/cash-advance'),
    },
    {
      key: 'requisitions',
      icon: Briefcase,
      count: pending(requisitions.data, (row) => row.status === 'IN_APPROVAL'),
      title: 'Requisitions awaiting approval',
      detail: 'Manpower requests waiting for a checker.',
      action: go('Review', '/employees/manpower/requisition'),
    },
    {
      key: 'candidates',
      icon: UserPlus,
      count: pending(candidates.data, (row) => row.status === 'SUBMITTED' || row.status === 'IN_APPROVAL'),
      title: 'New joiners awaiting approval',
      detail: 'Candidates waiting for a checker.',
      action: go('Review', '/employees/new-joiner'),
    },
    {
      key: 'resignations',
      icon: UserMinus,
      count: pending(resignations.data, (row) => row.status === 'IN_APPROVAL'),
      title: 'Mass resignations awaiting approval',
      detail: 'Resignation batches waiting for a checker.',
      action: go('Review', '/employees/mass-resignation'),
    },
    {
      key: 'imports',
      icon: FileUp,
      count: pending(imports.data, (row) => row.importStatus === 'VALIDATED'),
      title: 'Employee imports awaiting approval',
      detail: 'Files are checked; approve or cancel the batch.',
      action: go('Review', '/employees/bulk-import'),
    },
    {
      key: 'reprimands',
      icon: ShieldAlert,
      count: pending(reprimands.data, (row) => row.status === 'IN_APPROVAL'),
      title: 'Reprimands awaiting approval',
      detail: 'Reprimands waiting for approval.',
      action: go('Review', '/employees/reprimand'),
    },
    {
      key: 'contracts',
      icon: FileClock,
      count: summary.data ? endingSoon : null,
      title: 'Contracts & probation ending ≤ 30 days',
      detail: 'Extend, confirm, or end them before the date passes.',
      action: { label: 'View', onClick: () => setContractsOpen(true) },
    },
    {
      key: 'locked',
      icon: LockKeyhole,
      count: summary.data ? summary.data.lockedAccounts.length : null,
      title: 'Locked employee accounts',
      detail: 'Locked automatically after 5 failed logins; unlocks on its own in 15 minutes.',
      action: { label: 'Unlock', onClick: () => setUnlockOpen(true) },
    },
    {
      key: 'invitations',
      icon: MailPlus,
      count: invitations.data ? invitations.data.length : null,
      title: 'Accounts awaiting activation',
      detail: 'Invitation not used yet; resend it if the link is lost or expired.',
      action: { label: 'Resend', onClick: () => setInviteOpen(true) },
    },
    {
      key: 'drafts',
      icon: Megaphone,
      count: drafts.data ? drafts.data.totalData : null,
      title: 'Unpublished announcement drafts',
      detail: 'Complete the recipient roles, then publish.',
      action: go('Open', ANNOUNCEMENT_LIST_PATH),
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
        Tiga kartu, dua baris. Perlu tindak lanjut selebar halaman: barisnya mengalir dua kolom,
        jenis bernilai 0 disembunyikan, dan menyusut jadi satu kalimat bila kosong.
        Di bawahnya Pengajuan saya dan Pengumuman sama lebar (1/2 : 1/2), sejajar dengan dua kolom
        antrean di atasnya; keduanya memuat maks. 5 baris dengan tinggi baris yang sama.
      */}
      <ActionQueue items={queue} />
      <div className="grid gap-4 lg:grid-cols-2">
        <MyRequestsPanel />
        <AnnouncementsPanel />
      </div>

      {/* Data tenaga kerja = data perusahaan → hanya HR/manajemen (koreksi DB-10 paket 05). */}
      {companyLayer && <WorkforcePanel summary={summary.data} />}

      <ContractsModal open={contractsOpen} onOpenChange={setContractsOpen} contracts={contracts} now={now} />
      <UnlockAccountModal open={unlockOpen} onOpenChange={setUnlockOpen} />
      <ResendInvitationModal open={inviteOpen} onOpenChange={setInviteOpen} />
    </>
  );
}
