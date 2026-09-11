import type { RouteObject } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { RequireAuth } from '@/app/RequireAuth';
import { PlaceholderPage } from '@/components/PlaceholderPage';
import { NAV_PATHS } from '@/config/nav';

// ---- Modul yang SUDAH dikonversi -------------------------------------------
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { TimeOffSettingsPage } from '@/features/time-off/pages/TimeOffSettingsPage';
import { AttendancePage } from '@/features/attendance/pages/AttendancePage';
import { AttendanceSettingsPage } from '@/features/attendance/pages/AttendanceSettingsPage';
import { OvertimePage } from '@/features/overtime/pages/OvertimePage';
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
  { index: true, element: <DashboardPage /> },
  { path: 'employees/directory', element: <EmployeeDirectoryPage /> },
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
  '/employees/directory',
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
