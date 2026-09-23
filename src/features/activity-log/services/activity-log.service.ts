import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import type {
  ActivityFamily,
  ActivityLogPage,
  ActivityLogQuery,
  ActivityLogRowMap,
  ForceLogoutLog,
  LoginAttemptLog,
  OtpAttemptLog,
  SwitchCompanyLog,
} from '@/features/activity-log/types';

const delay = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

const MOCK_LOGIN: LoginAttemptLog[] = [
  { id: 'la-01', attemptedAt: '2026-09-23T08:02:11+07:00', attemptedIdentifier: 'budi.santoso@ptdika.co.id', identifierType: 'EMAIL', companyCode: 'DIKA', isSuccess: true, failureReason: null, ipAddress: '103.28.14.21' },
  { id: 'la-02', attemptedAt: '2026-09-23T07:58:40+07:00', attemptedIdentifier: 'rina.hartono', identifierType: 'USERNAME', companyCode: 'DIKA', isSuccess: false, failureReason: 'Password salah', ipAddress: '103.28.14.35' },
  { id: 'la-03', attemptedAt: '2026-09-23T07:59:02+07:00', attemptedIdentifier: 'rina.hartono', identifierType: 'USERNAME', companyCode: 'DIKA', isSuccess: true, failureReason: null, ipAddress: '103.28.14.35' },
  { id: 'la-04', attemptedAt: '2026-09-22T17:45:19+07:00', attemptedIdentifier: '+6281234567890', identifierType: 'PHONE_NUMBER', companyCode: 'BAHARI', isSuccess: true, failureReason: null, ipAddress: '36.72.215.9' },
  { id: 'la-05', attemptedAt: '2026-09-22T09:12:03+07:00', attemptedIdentifier: 'sari.melati@ptdika.co.id', identifierType: 'EMAIL', companyCode: 'DIKA', isSuccess: false, failureReason: 'Akun terkunci', ipAddress: '103.28.14.48' },
  { id: 'la-06', attemptedAt: '2026-09-22T09:10:44+07:00', attemptedIdentifier: 'sari.melati@ptdika.co.id', identifierType: 'EMAIL', companyCode: 'DIKA', isSuccess: false, failureReason: 'Password salah', ipAddress: '103.28.14.48' },
  { id: 'la-07', attemptedAt: '2026-09-22T09:09:58+07:00', attemptedIdentifier: 'sari.melati@ptdika.co.id', identifierType: 'EMAIL', companyCode: 'DIKA', isSuccess: false, failureReason: 'Password salah', ipAddress: '103.28.14.48' },
  { id: 'la-08', attemptedAt: '2026-09-21T13:30:27+07:00', attemptedIdentifier: 'hendra.gunawan', identifierType: 'USERNAME', companyCode: 'SINAR', isSuccess: true, failureReason: null, ipAddress: null },
  { id: 'la-09', attemptedAt: '2026-09-20T08:15:36+07:00', attemptedIdentifier: 'dewi.anggraini@ptdika.co.id', identifierType: 'EMAIL', companyCode: 'DIKA', isSuccess: true, failureReason: null, ipAddress: '182.253.9.117' },
  { id: 'la-10', attemptedAt: '2026-09-19T21:04:52+07:00', attemptedIdentifier: 'unknown.user@gmail.com', identifierType: 'EMAIL', companyCode: 'DIKA', isSuccess: false, failureReason: 'Identifier tidak terdaftar', ipAddress: '114.124.6.201' },
  { id: 'la-11', attemptedAt: '2026-09-18T08:01:15+07:00', attemptedIdentifier: 'agus.pratama', identifierType: 'USERNAME', companyCode: 'BAHARI', isSuccess: true, failureReason: null, ipAddress: '36.72.215.14' },
  { id: 'la-12', attemptedAt: '2026-09-17T16:48:09+07:00', attemptedIdentifier: '+6285711223344', identifierType: 'PHONE_NUMBER', companyCode: 'DIKA', isSuccess: false, failureReason: 'OTP kedaluwarsa', ipAddress: '103.28.14.22' },
  { id: 'la-13', attemptedAt: '2026-09-15T07:55:30+07:00', attemptedIdentifier: 'budi.santoso@ptdika.co.id', identifierType: 'EMAIL', companyCode: 'DIKA', isSuccess: true, failureReason: null, ipAddress: '103.28.14.21' },
  { id: 'la-14', attemptedAt: '2026-09-12T10:20:41+07:00', attemptedIdentifier: 'rina.wulandari', identifierType: 'USERNAME', companyCode: 'DIKA', isSuccess: true, failureReason: null, ipAddress: '103.28.14.40' },
];

const MOCK_OTP: OtpAttemptLog[] = [
  { id: 'ot-01', createdAt: '2026-09-23T08:01:50+07:00', identifier: 'budi.santoso@ptdika.co.id', channel: 'EMAIL', otpType: 'MAGIC_LINK', notificationStatus: 'SENT', failureReason: null },
  { id: 'ot-02', createdAt: '2026-09-22T17:44:58+07:00', identifier: '+6281234567890', channel: 'WHATSAPP', otpType: 'LOGIN_OTP', notificationStatus: 'SENT', failureReason: null },
  { id: 'ot-03', createdAt: '2026-09-22T09:30:12+07:00', identifier: 'sari.melati@ptdika.co.id', channel: 'EMAIL', otpType: 'RESET_PASSWORD', notificationStatus: 'SENT', failureReason: null },
  { id: 'ot-04', createdAt: '2026-09-21T13:29:40+07:00', identifier: '+6287788990011', channel: 'WHATSAPP', otpType: 'LOGIN_OTP', notificationStatus: 'FAILED', failureReason: 'Nomor tidak terdaftar di WhatsApp' },
  { id: 'ot-05', createdAt: '2026-09-20T08:15:02+07:00', identifier: 'dewi.anggraini@ptdika.co.id', channel: 'EMAIL', otpType: 'MAGIC_LINK', notificationStatus: 'SENT', failureReason: null },
  { id: 'ot-06', createdAt: '2026-09-17T16:40:33+07:00', identifier: '+6285711223344', channel: 'WHATSAPP', otpType: 'LOGIN_OTP', notificationStatus: 'SENT', failureReason: null },
  { id: 'ot-07', createdAt: '2026-09-16T11:05:18+07:00', identifier: 'agus.pratama@baharilogistik.co.id', channel: 'EMAIL', otpType: 'RESET_PASSWORD', notificationStatus: 'FAILED', failureReason: 'Server surel menolak pengiriman' },
  { id: 'ot-08', createdAt: '2026-09-15T07:55:01+07:00', identifier: 'budi.santoso@ptdika.co.id', channel: 'EMAIL', otpType: 'MAGIC_LINK', notificationStatus: 'SENT', failureReason: null },
];

const MOCK_SWITCH: SwitchCompanyLog[] = [
  { id: 'sc-01', switchedAt: '2026-09-23T09:14:22+07:00', fromCompanyCode: 'DIKA', toCompanyCode: 'BAHARI', isSuccess: true, failureReason: null },
  { id: 'sc-02', switchedAt: '2026-09-23T09:40:05+07:00', fromCompanyCode: 'BAHARI', toCompanyCode: 'DIKA', isSuccess: true, failureReason: null },
  { id: 'sc-03', switchedAt: '2026-09-22T14:02:47+07:00', fromCompanyCode: 'DIKA', toCompanyCode: 'SINAR', isSuccess: false, failureReason: 'Tidak memiliki akses ke perusahaan tujuan' },
  { id: 'sc-04', switchedAt: '2026-09-19T10:31:10+07:00', fromCompanyCode: 'SINAR', toCompanyCode: 'DIKA', isSuccess: true, failureReason: null },
  { id: 'sc-05', switchedAt: '2026-09-16T15:22:36+07:00', fromCompanyCode: 'DIKA', toCompanyCode: 'BAHARI', isSuccess: true, failureReason: null },
];

const MOCK_FORCE_LOGOUT: ForceLogoutLog[] = [
  { id: 'fl-01', triggeredAt: '2026-09-22T09:35:00+07:00', triggeredByName: 'Budi Santoso', targetEmployeeId: 'EMP-0031', logoutScope: 'ALL_SESSIONS', reason: 'Perangkat karyawan dilaporkan hilang' },
  { id: 'fl-02', triggeredAt: '2026-09-20T18:12:44+07:00', triggeredByName: null, targetEmployeeId: 'EMP-0107', logoutScope: 'ALL_SESSIONS', reason: 'Status kepegawaian berakhir' },
  { id: 'fl-03', triggeredAt: '2026-09-18T11:47:29+07:00', triggeredByName: 'Rina Hartono', targetEmployeeId: 'EMP-0058', logoutScope: 'SINGLE_SESSION', reason: 'Sesi aktif di perangkat bersama' },
  { id: 'fl-04', triggeredAt: '2026-09-14T08:05:13+07:00', triggeredByName: 'Budi Santoso', targetEmployeeId: 'EMP-0012', logoutScope: 'ALL_SESSIONS', reason: 'Reset kata sandi atas permintaan karyawan' },
];

const MOCK_ROWS: { [F in ActivityFamily]: ActivityLogRowMap[F][] } = {
  'login-attempts': MOCK_LOGIN,
  'otp-attempts': MOCK_OTP,
  'switch-company-logs': MOCK_SWITCH,
  'force-logout-logs': MOCK_FORCE_LOGOUT,
};

function timestampOf(family: ActivityFamily, row: ActivityLogRowMap[ActivityFamily]): string {
  switch (family) {
    case 'login-attempts':
      return (row as LoginAttemptLog).attemptedAt;
    case 'otp-attempts':
      return (row as OtpAttemptLog).createdAt;
    case 'switch-company-logs':
      return (row as SwitchCompanyLog).switchedAt;
    case 'force-logout-logs':
      return (row as ForceLogoutLog).triggeredAt;
  }
}

type RawRow = Record<string, unknown>;

/** Respons kontrak ber-snake_case → bentuk baris layar. */
const FROM_API: { [F in ActivityFamily]: (raw: RawRow) => ActivityLogRowMap[F] } = {
  'login-attempts': (raw) => ({
    id: String(raw.id),
    attemptedAt: String(raw.attempted_at),
    attemptedIdentifier: String(raw.attempted_identifier),
    identifierType: raw.identifier_type as LoginAttemptLog['identifierType'],
    companyCode: String(raw.company_code),
    isSuccess: Boolean(raw.is_success),
    failureReason: (raw.failure_reason as string | null) ?? null,
    ipAddress: (raw.ip_address as string | null) ?? null,
  }),
  'otp-attempts': (raw) => ({
    id: String(raw.id),
    createdAt: String(raw.created_at),
    identifier: String(raw.identifier),
    channel: raw.channel as OtpAttemptLog['channel'],
    otpType: raw.otp_type as OtpAttemptLog['otpType'],
    notificationStatus: raw.notification_status as OtpAttemptLog['notificationStatus'],
    failureReason: (raw.failure_reason as string | null) ?? null,
  }),
  'switch-company-logs': (raw) => ({
    id: String(raw.id),
    switchedAt: String(raw.switched_at),
    fromCompanyCode: String(raw.from_company_code),
    toCompanyCode: String(raw.to_company_code),
    isSuccess: Boolean(raw.is_success),
    failureReason: (raw.failure_reason as string | null) ?? null,
  }),
  'force-logout-logs': (raw) => ({
    id: String(raw.id),
    triggeredAt: String(raw.triggered_at),
    triggeredByName: (raw.triggered_by_name as string | null) ?? null,
    targetEmployeeId: String(raw.target_employee_id),
    logoutScope: raw.logout_scope as ForceLogoutLog['logoutScope'],
    reason: String(raw.reason),
  }),
};

export const activityLogService = {
  /** `POST /api/v1/audit/{family}/search` — satu alamat per famili, dipilih dropdown "Jenis". */
  async search<F extends ActivityFamily>(
    family: F,
    query: ActivityLogQuery,
  ): Promise<ActivityLogPage<ActivityLogRowMap[F]>> {
    if (MOCK) {
      await delay();
      const rows = (MOCK_ROWS[family] as ActivityLogRowMap[F][])
        .filter((row) => {
          const day = timestampOf(family, row).slice(0, 10);
          if (query.startDate && day < query.startDate) return false;
          if (query.endDate && day > query.endDate) return false;
          return true;
        })
        .sort((a, b) => (timestampOf(family, a) < timestampOf(family, b) ? 1 : -1));
      const start = (query.page - 1) * query.size;
      return { rows: rows.slice(start, start + query.size), totalData: rows.length };
    }

    const { data } = await api.post<{ data: RawRow[]; total_data: number }>(`/audit/${family}/search`, {
      start_date: query.startDate,
      end_date: query.endDate,
      page: query.page,
      size: query.size,
    });
    return { rows: data.data.map(FROM_API[family]), totalData: data.total_data };
  },
};
