/**
 * Bulk Account Activation — FSD-001-EMPLOYEE 0.46 §9 (kontrak auth: TSD-001-AUTH bagian Bulk Account
 * Activation). Akun hasil Bulk Import lahir `PENDING` tanpa undangan; menu ini mengirim tautan aktivasi.
 */

export type InvitationStatus = 'NOT_SENT' | 'SENDING' | 'SENT' | 'FAILED' | 'EXPIRED';

export const INVITATION_STATUS_LABEL: Record<InvitationStatus, string> = {
  NOT_SENT: 'Not Sent',
  SENDING: 'Sending',
  SENT: 'Sent',
  FAILED: 'Failed to Send',
  EXPIRED: 'Expired',
};

export const INVITATION_STATUS_MEANING: Record<InvitationStatus, string> = {
  NOT_SENT: 'No invitation has been sent yet.',
  SENDING: 'The invitation was issued and is waiting for the email delivery report.',
  SENT: 'The email was delivered and the link has not expired.',
  FAILED: 'The email could not be delivered. Hover the badge to see why.',
  EXPIRED: 'The link expired before it was used. Resend it.',
};

export interface ActivationAccount {
  id: string;
  name: string;
  username: string;
  email: string;
  phoneNumber: string;
  invitationStatus: InvitationStatus;
  /** Hanya untuk `FAILED`. */
  failureReason: string | null;
  lastSentAt: string | null;
}

export interface ActivationFilter {
  search?: string;
  status?: InvitationStatus;
}

export interface SendResult {
  sent: number;
  skipped: number;
  results: { id: string; name: string; reason: string }[];
}

/** Batas satu kali kirim (§9.1). */
export const MAX_PER_SEND = 500;

/** Resend hanya untuk undangan yang pernah keluar (§9.1 BAA-ROW-MENU). */
export const canResend = (status: InvitationStatus) => status === 'SENT' || status === 'FAILED' || status === 'EXPIRED';

/** Nomor HP undangan: `+62` + 8–13 digit, tanpa spasi atau tanda hubung. */
export const PHONE_PATTERN = /^\+62\d{8,13}$/;
