/**
 * Bulk Account Activation (TSD-001-AUTH 0.167 §14.2.1; CATATAN-PERUBAHAN 12 Okt 2026).
 * Akun hasil Bulk Import lahir PENDING tanpa undangan; layar ini mengirim tautan
 * aktivasi. Akun hilang dari daftar begitu diaktifkan pemiliknya.
 */
export type InvitationStatus = 'NOT_SENT' | 'SENDING' | 'SENT' | 'FAILED' | 'EXPIRED';

export interface PendingAccount {
  employeeId: string;
  name: string;
  username: string;
  email: string;
  phoneNumber: string;
  createdAt: string;
  invitationStatus: InvitationStatus;
  invitationSentAt: string | null;
  invitationExpiredAt: string | null;
  failureReason: string | null;
}

export interface SendSummary {
  total: number;
  sent: number;
  skipped: number;
  results: { employeeId: string; status: 'SENT' | 'SKIPPED'; reason: string | null }[];
}

export const INVITATION_LABEL: Record<InvitationStatus, string> = {
  NOT_SENT: 'Not sent',
  SENDING: 'Sending',
  SENT: 'Sent',
  FAILED: 'Failed to send',
  EXPIRED: 'Expired',
};

/** Kirim Ulang hanya untuk undangan yang sudah pernah keluar (CATATAN 12 Okt). */
export const canResend = (status: InvitationStatus) => status === 'SENT' || status === 'FAILED' || status === 'EXPIRED';

export const MAX_SEND = 500;
export const PHONE_PATTERN = /^(\+62|0)8[0-9]{7,12}$/;
