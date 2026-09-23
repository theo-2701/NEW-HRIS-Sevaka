/** Empat famili log yang dijangkau layar Activity Log (FSD-001-AUTH §5, UIC-001-AUTH §8). */
export type ActivityFamily = 'login-attempts' | 'otp-attempts' | 'switch-company-logs' | 'force-logout-logs';

export const ACTIVITY_FAMILY_OPTIONS: { value: ActivityFamily; label: string }[] = [
  { value: 'login-attempts', label: 'Login Attempts' },
  { value: 'otp-attempts', label: 'OTP Attempts' },
  { value: 'switch-company-logs', label: 'Switch Company' },
  { value: 'force-logout-logs', label: 'Force Logout' },
];

export interface LoginAttemptLog {
  id: string;
  attemptedAt: string;
  attemptedIdentifier: string;
  identifierType: 'EMAIL' | 'USERNAME' | 'PHONE_NUMBER';
  companyCode: string;
  isSuccess: boolean;
  failureReason: string | null;
  ipAddress: string | null;
}

export interface OtpAttemptLog {
  id: string;
  createdAt: string;
  identifier: string;
  channel: 'EMAIL' | 'WHATSAPP';
  otpType: 'MAGIC_LINK' | 'LOGIN_OTP' | 'RESET_PASSWORD';
  notificationStatus: 'SENT' | 'FAILED';
  failureReason: string | null;
}

export interface SwitchCompanyLog {
  id: string;
  switchedAt: string;
  fromCompanyCode: string;
  toCompanyCode: string;
  isSuccess: boolean;
  failureReason: string | null;
}

export interface ForceLogoutLog {
  id: string;
  triggeredAt: string;
  triggeredByName: string | null;
  targetEmployeeId: string;
  logoutScope: 'ALL_SESSIONS' | 'SINGLE_SESSION';
  reason: string;
}

export interface ActivityLogRowMap {
  'login-attempts': LoginAttemptLog;
  'otp-attempts': OtpAttemptLog;
  'switch-company-logs': SwitchCompanyLog;
  'force-logout-logs': ForceLogoutLog;
}

export type ActivityLogRow = ActivityLogRowMap[ActivityFamily];

/** Isi body `POST /audit/{family}/search` yang diexpose layar ini. */
export interface ActivityLogQuery {
  startDate?: string;
  endDate?: string;
  page: number;
  size: number;
}

export interface ActivityLogPage<T> {
  rows: T[];
  totalData: number;
}

export const IDENTIFIER_TYPE_LABEL: Record<LoginAttemptLog['identifierType'], string> = {
  EMAIL: 'Email',
  USERNAME: 'Username',
  PHONE_NUMBER: 'Phone number',
};

export const LOGOUT_SCOPE_LABEL: Record<ForceLogoutLog['logoutScope'], string> = {
  ALL_SESSIONS: 'All sessions',
  SINGLE_SESSION: 'Single session',
};
