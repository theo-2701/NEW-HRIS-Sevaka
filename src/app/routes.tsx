import type { RouteObject } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { RequireAuth } from '@/app/RequireAuth';
import { PlaceholderPage } from '@/components/PlaceholderPage';
import { NAV_PATHS } from '@/config/nav';

// ---- Modul yang SUDAH dikonversi -------------------------------------------
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { DashboardHomePage } from '@/features/dashboard/pages/DashboardHomePage';
import { TimeOffSettingsPage } from '@/features/time-off/pages/TimeOffSettingsPage';
import { AttendancePage } from '@/features/attendance/pages/AttendancePage';
import { AttendanceSettingsPage } from '@/features/attendance/pages/AttendanceSettingsPage';
import { OvertimePage } from '@/features/overtime/pages/OvertimePage';
import { CalendarPage } from '@/features/calendar/pages/CalendarPage';
import { SchedulerIndexPage } from '@/features/scheduler/pages/SchedulerIndexPage';
import { SchedulerSchedulePage } from '@/features/scheduler/pages/SchedulerSchedulePage';
import { OncallSchedulePage } from '@/features/oncall/pages/OncallSchedulePage';
import { OncallActivityPage } from '@/features/oncall/pages/OncallActivityPage';
import { BenefitReimbursementPage } from '@/features/benefit/pages/BenefitReimbursementPage';
import { LoanPage } from '@/features/loan/pages/LoanPage';
import { LoanDetailPage } from '@/features/loan/pages/LoanDetailPage';
import { CashAdvancePage } from '@/features/cash-advance/pages/CashAdvancePage';
import { DisbursementPage } from '@/features/disbursement/pages/DisbursementPage';
import { FinanceSettingsPage } from '@/features/finance-settings/pages/FinanceSettingsPage';
import { FinanceSecurityPage } from '@/features/finance-security/pages/FinanceSecurityPage';
import { EssFinancePage } from '@/features/ess-finance/pages/EssFinancePage';
import { SalaryProcessingPage } from '@/features/salary-processing/pages/SalaryProcessingPage';
import { PayrollAuthorizationPage } from '@/features/payroll-authorization/pages/PayrollAuthorizationPage';
import { SalarySettingsPage } from '@/features/salary-settings/pages/SalarySettingsPage';
import { BranchPage } from '@/features/company/pages/BranchPage';
import { GroupStructurePage } from '@/features/company/pages/GroupStructurePage';
import { GradeClassPage } from '@/features/company/pages/GradeClassPage';
import { CostCenterPage } from '@/features/company/pages/CostCenterPage';
import { SbuPage } from '@/features/company/pages/SbuPage';
import { VendorPage } from '@/features/company/pages/VendorPage';
import { ActivityLogPage } from '@/features/activity-log/pages/ActivityLogPage';
import { NotificationInboxPage } from '@/features/notification/pages/NotificationInboxPage';
import {
  CompanyFilesPage,
  EmployeeFilesPage,
  EssFilesPage,
  OtherFilesPage,
} from '@/features/documents/pages/FilesPages';
import { DocumentTemplatesPage } from '@/features/documents/pages/DocumentTemplatesPage';
import { AssetListPage, AssignedAssetsPage } from '@/features/assets/pages/AssetListPage';
import { AssetCategoryPage } from '@/features/assets/pages/AssetCategoryPage';
import { AssetDetailPage } from '@/features/assets/pages/AssetDetailPage';
import { DisposalPage } from '@/features/assets/pages/DisposalPage';
import { AnnouncementListPage } from '@/features/announcement/pages/AnnouncementListPage';
import { AnnouncementDetailPage } from '@/features/announcement/pages/AnnouncementDetailPage';
import { MyAnnouncementsPage } from '@/features/announcement/pages/MyAnnouncementsPage';
import { PeriodDetailPage } from '@/features/salary-processing/pages/PeriodDetailPage';
import { PayrollInfoPage } from '@/features/ess-payroll/pages/PayrollInfoPage';
import { PayslipPage } from '@/features/ess-payroll/pages/PayslipPage';
import { TimeOffBalancePage } from '@/features/time-off/pages/TimeOffBalancePage';
import { TimeOffRequestPage } from '@/features/time-off/pages/TimeOffRequestPage';
import { ReprimandPage } from '@/features/reprimand/pages/ReprimandPage';
import { ReprimandTypeSettingPage } from '@/features/reprimand/pages/ReprimandTypeSettingPage';
import { ManpowerRequisitionPage } from '@/features/manpower/pages/ManpowerRequisitionPage';
import { PtkpAdjustmentPage } from '@/features/ptkp/pages/PtkpAdjustmentPage';
import { MassResignationPage } from '@/features/mass-resignation/pages/MassResignationPage';
import { TransitionsPage } from '@/features/transitions/pages/TransitionsPage';
import { TransitionDetailPage } from '@/features/transitions/pages/TransitionDetailPage';
import { NewJoinerPage } from '@/features/new-joiner/pages/NewJoinerPage';
import { AddEmployeePage } from '@/features/new-joiner/pages/AddEmployeePage';
import { EmployeeDirectoryPage } from '@/features/employees/pages/EmployeeDirectoryPage';
import { EmployeeDetailPage } from '@/features/employees/pages/EmployeeDetailPage';
import { EssAttendancePage } from '@/features/ess-time/pages/EssAttendancePage';
import { EssTimeOffPage } from '@/features/ess-time/pages/EssTimeOffPage';
import { EssDelegationPage } from '@/features/ess-time/pages/EssDelegationPage';
import { EssTimeOffTakenPage } from '@/features/ess-time/pages/EssTimeOffTakenPage';
import { EssOvertimePage } from '@/features/ess-time/pages/EssOvertimePage';
import { EmployeeProfilePage } from '@/features/profile/pages/EmployeeProfilePage';
import { LoginEmailPage } from '@/features/auth/pages/LoginEmailPage';
import { LoginUsernamePage } from '@/features/auth/pages/LoginUsernamePage';
import { LoginWhatsappPage } from '@/features/auth/pages/LoginWhatsappPage';
import { MagicLinkSentPage } from '@/features/auth/pages/MagicLinkSentPage';
import { VerifyMagicLinkPage } from '@/features/auth/pages/VerifyMagicLinkPage';
import { OtpPage } from '@/features/auth/pages/OtpPage';
import { ForgotPasswordPage, ForgotPasswordSentPage } from '@/features/auth/pages/ForgotPasswordPage';
import { ResetPasswordDonePage, ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage';

/**
 * Route modul yang sudah punya komponen nyata.
 * Tambahkan entri di sini saat sebuah layar selesai dikonversi, lalu ubah
 * `status` leaf-nya di `src/config/nav.ts` menjadi `'done'`.
 */
const IMPLEMENTED: RouteObject[] = [
  { index: true, element: <DashboardHomePage /> },
  /* Dashboard lama dipertahankan sebagai pembanding — tanpa baris menu. */
  { path: 'dashboard/classic', element: <DashboardPage /> },
  { path: 'employees/directory', element: <EmployeeDirectoryPage /> },
  /* Detail karyawan tidak punya baris menu — dibuka dari baris Directory. */
  { path: 'employees/directory/detail', element: <EmployeeDetailPage /> },
  { path: 'employees/organization', element: <EmployeeDirectoryPage /> },
  { path: 'employees/new-joiner', element: <NewJoinerPage /> },
  { path: 'employees/new-joiner/add', element: <AddEmployeePage /> },
  { path: 'employees/transfer', element: <TransitionsPage /> },
  { path: 'employees/transfer/dashboard', element: <TransitionDetailPage /> },
  { path: 'employees/mass-resignation', element: <MassResignationPage /> },
  { path: 'employees/ptkp-adjustment', element: <PtkpAdjustmentPage /> },
  { path: 'employees/manpower/requisition', element: <ManpowerRequisitionPage /> },
  { path: 'employees/reprimand', element: <ReprimandPage /> },
  { path: 'employees/reprimand/type-setting', element: <ReprimandTypeSettingPage /> },
  { path: 'time/time-off/requests', element: <TimeOffRequestPage /> },
  { path: 'time/time-off/balance', element: <TimeOffBalancePage /> },
  { path: 'time/time-off/settings', element: <TimeOffSettingsPage /> },
  { path: 'time/attendance', element: <AttendancePage /> },
  { path: 'time/attendance/settings', element: <AttendanceSettingsPage /> },
  { path: 'time/overtime', element: <OvertimePage /> },
  { path: 'time/calendar', element: <CalendarPage /> },
  { path: 'time/scheduler', element: <SchedulerIndexPage /> },
  { path: 'time/scheduler/schedule', element: <SchedulerSchedulePage /> },
  { path: 'time/on-call', element: <OncallSchedulePage /> },
  { path: 'time/on-call/activity', element: <OncallActivityPage /> },
  { path: 'finance/benefit-reimbursement', element: <BenefitReimbursementPage /> },
  { path: 'finance/loan', element: <LoanPage /> },
  /* Detail pinjaman tidak punya baris menu — dibuka dari baris tabel Loan. */
  { path: 'finance/loan/detail', element: <LoanDetailPage /> },
  { path: 'finance/cash-advance', element: <CashAdvancePage /> },
  { path: 'finance/disbursement', element: <DisbursementPage /> },
  { path: 'finance/settings', element: <FinanceSettingsPage /> },
  { path: 'finance/security', element: <FinanceSecurityPage /> },
  { path: 'me/finance', element: <EssFinancePage /> },
  { path: 'payroll/salary-processing', element: <SalaryProcessingPage /> },
  { path: 'payroll/authorization', element: <PayrollAuthorizationPage /> },
  { path: 'payroll/salary-settings', element: <SalarySettingsPage /> },
  /* Detail periode tidak punya baris menu — dibuka dari baris tabel periode. */
  { path: 'payroll/salary-processing/period', element: <PeriodDetailPage /> },
  { path: 'me/time/attendance', element: <EssAttendancePage /> },
  { path: 'me/time/time-off', element: <EssTimeOffPage /> },
  { path: 'me/time/time-off/delegation', element: <EssDelegationPage /> },
  { path: 'me/time/time-off/taken', element: <EssTimeOffTakenPage /> },
  { path: 'me/time/overtime', element: <EssOvertimePage /> },
  { path: 'me/payroll', element: <PayrollInfoPage /> },
  { path: 'me/payslip', element: <PayslipPage /> },
  { path: 'company/branch', element: <BranchPage /> },
  { path: 'company/group-structure', element: <GroupStructurePage /> },
  { path: 'company/grade-class', element: <GradeClassPage /> },
  { path: 'company/cost-center', element: <CostCenterPage /> },
  { path: 'company/sbu', element: <SbuPage /> },
  { path: 'company/vendor', element: <VendorPage /> },
  { path: 'company-management/assets', element: <AssetListPage /> },
  { path: 'company-management/assets/assigned', element: <AssignedAssetsPage /> },
  { path: 'company-management/assets/category', element: <AssetCategoryPage /> },
  { path: 'company-management/assets/disposal', element: <DisposalPage /> },
  /* Asset Detail tidak punya baris menu — dibuka dari baris Asset List / Assigned Assets. */
  { path: 'company-management/assets/detail', element: <AssetDetailPage /> },
  { path: 'company-management/activity-log', element: <ActivityLogPage /> },
  { path: 'company-management/notifications', element: <NotificationInboxPage /> },
  { path: 'company-management/files/company', element: <CompanyFilesPage /> },
  { path: 'company-management/files/employee', element: <EmployeeFilesPage /> },
  { path: 'company-management/files/other', element: <OtherFilesPage /> },
  { path: 'company-management/files/templates', element: <DocumentTemplatesPage /> },
  { path: 'me/files', element: <EssFilesPage /> },
  { path: 'company-management/announcements', element: <AnnouncementListPage /> },
  /* Detail pengumuman tidak punya baris menu — dibuka dari baris daftar Announcement. */
  { path: 'company-management/announcements/detail', element: <AnnouncementDetailPage /> },
  /* Layar baca ESS: FSD-COMPANY §11.8 memutuskan baris menu ESS sendiri — belum dipasang di sidebar. */
  { path: 'me/announcements', element: <MyAnnouncementsPage /> },
  { path: 'me/profile', element: <EmployeeProfilePage /> },
  { path: 'me/profile/family', element: <EmployeeProfilePage /> },
  { path: 'me/profile/emergency-contact', element: <EmployeeProfilePage /> },
  { path: 'me/profile/formal-education', element: <EmployeeProfilePage /> },
  { path: 'me/profile/informal-education', element: <EmployeeProfilePage /> },
  { path: 'me/profile/working-experience', element: <EmployeeProfilePage /> },
  { path: 'me/profile/additional-info', element: <EmployeeProfilePage /> },
];

/** Path yang sudah punya komponen (dipakai untuk melewati placeholder). */
const IMPLEMENTED_PATHS = new Set<string>([
  '/',
  '/dashboard/classic',
  '/employees/directory',
  '/employees/directory/detail',
  '/employees/organization',
  '/employees/new-joiner',
  '/employees/new-joiner/add',
  '/employees/transfer',
  '/employees/transfer/dashboard',
  '/employees/mass-resignation',
  '/employees/ptkp-adjustment',
  '/employees/manpower/requisition',
  '/employees/reprimand',
  '/employees/reprimand/type-setting',
  '/time/time-off/requests',
  '/time/time-off/balance',
  '/time/time-off/settings',
  '/time/attendance',
  '/time/attendance/settings',
  '/time/overtime',
  '/time/calendar',
  '/time/scheduler',
  '/time/scheduler/schedule',
  '/time/on-call',
  '/time/on-call/activity',
  '/finance/benefit-reimbursement',
  '/finance/loan',
  '/finance/loan/detail',
  '/finance/cash-advance',
  '/finance/disbursement',
  '/finance/settings',
  '/finance/security',
  '/me/finance',
  '/payroll/salary-processing',
  '/payroll/authorization',
  '/payroll/salary-settings',
  '/payroll/salary-processing/period',
  '/me/time/attendance',
  '/me/time/time-off',
  '/me/time/time-off/delegation',
  '/me/time/time-off/taken',
  '/me/time/overtime',
  '/me/payroll',
  '/me/payslip',
  '/company/branch',
  '/company/group-structure',
  '/company/grade-class',
  '/company/cost-center',
  '/company/sbu',
  '/company/vendor',
  '/company-management/assets',
  '/company-management/assets/assigned',
  '/company-management/assets/category',
  '/company-management/assets/disposal',
  '/company-management/assets/detail',
  '/company-management/activity-log',
  '/company-management/notifications',
  '/company-management/files/company',
  '/company-management/files/employee',
  '/company-management/files/other',
  '/company-management/files/templates',
  '/me/files',
  '/company-management/announcements',
  '/company-management/announcements/detail',
  '/me/announcements',
  '/me/profile',
  '/me/profile/family',
  '/me/profile/emergency-contact',
  '/me/profile/formal-education',
  '/me/profile/informal-education',
  '/me/profile/working-experience',
  '/me/profile/additional-info',
]);

/**
 * Placeholder otomatis untuk setiap leaf nav yang belum dikonversi.
 * Menjaga seluruh menu tetap bisa diklik selama konversi bertahap.
 */
const PLACEHOLDERS: RouteObject[] = NAV_PATHS.filter(
  (entry) => !IMPLEMENTED_PATHS.has(entry.path) && entry.path !== '/verify',
).map((entry) => ({
  path: entry.path.replace(/^\//, ''),
  element: <PlaceholderPage />,
}));

export const routes: RouteObject[] = [
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      { index: true, element: <Navigate to="/auth/login" replace /> },
      { path: 'login', element: <LoginEmailPage /> },
      { path: 'login/username', element: <LoginUsernamePage /> },
      { path: 'login/whatsapp', element: <LoginWhatsappPage /> },
      { path: 'magic-link-sent', element: <MagicLinkSentPage /> },
      { path: 'verify', element: <VerifyMagicLinkPage /> },
      { path: 'otp', element: <OtpPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'forgot-password/sent', element: <ForgotPasswordSentPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      { path: 'reset-password/done', element: <ResetPasswordDonePage /> },
    ],
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [...IMPLEMENTED, ...PLACEHOLDERS],
  },
  /* Verifikasi surat publik — tanpa login dan memang tanpa baris menu (DOC-80). */
  {
    path: '/verify',
    element: (
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <PlaceholderPage />
      </div>
    ),
  },
  { path: '*', element: <Navigate to="/" replace /> },
];
