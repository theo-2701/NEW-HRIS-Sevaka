import type { BadgeTone } from '@/components/StatusBadge';

/**
 * Email and Phone Verification — FSD-001-EMPLOYEE 0.83 §14 · TSD 0.192 §7.20–7.21. Antrean karyawan baru
 * yang email kantor dan/atau nomor HP-nya belum terbukti lewat tautan 24 jam.
 */
export type ChannelStatus = 'NOT_APPLICABLE' | 'NOT_SENT' | 'SENT' | 'EXPIRED' | 'VERIFIED';
export type Channel = 'EMAIL' | 'PHONE';
export type VerificationShow = 'ALL' | 'EMAIL_PENDING' | 'PHONE_PENDING';

export interface ContactVerification {
  id: string;
  employeeId: string;
  name: string;
  nik: string;
  username: string;
  companyEmail: string;
  /** Selalu ter-mask dari server. */
  phoneMasked: string;
  emailStatus: ChannelStatus;
  emailExpiresAt: string | null;
  phoneStatus: ChannelStatus;
  phoneExpiresAt: string | null;
  createdAt: string;
}

export interface SendResult {
  sent: number;
  skipped: { id: string; name: string; reason: string }[];
}

export type CancelReason = 'ACCIDENT_PASSED_AWAY' | 'CANDIDATE_WITHDREW' | 'ENTERED_IN_ERROR' | 'OTHER';

export const CANCEL_REASON_LABEL: Record<CancelReason, string> = {
  ACCIDENT_PASSED_AWAY: 'Accident and passed away',
  CANDIDATE_WITHDREW: 'Candidate withdrew',
  ENTERED_IN_ERROR: 'Entered in error',
  OTHER: 'Other',
};

export const CHANNEL_LABEL: Record<ChannelStatus, string> = {
  NOT_APPLICABLE: 'Not applicable',
  NOT_SENT: 'Link not sent',
  SENT: 'Link sent',
  EXPIRED: 'Link expired',
  VERIFIED: 'Verified',
};

export const CHANNEL_TONE: Record<ChannelStatus, BadgeTone> = {
  NOT_APPLICABLE: 'mute',
  NOT_SENT: 'mute',
  SENT: 'info',
  EXPIRED: 'warn',
  VERIFIED: 'ok',
};

export const CHANNEL_MEANING: Record<ChannelStatus, string> = {
  NOT_APPLICABLE: 'There is no company email or phone number to verify on this channel.',
  NOT_SENT: 'No link was sent yet. The employee still signs in with their personal email.',
  SENT: 'A link was sent and works for 24 hours.',
  EXPIRED: 'The link ran out before it was used. Send a new one.',
  VERIFIED: 'Proven by the owner. It can now be used to sign in.',
};

export const MAX_PER_SEND = 50;

/** Aktor menu: HR Staff dan HR Manager saja (RNJ-D13 butir 1). */
export const canVerifyContacts = (role?: string) => role === 'ROLE_HR_STAFF' || role === 'ROLE_HR_MANAGER';

/** Saluran yang masih dapat dikirimi tautan (belum terbukti dan ada alamatnya). */
export const canSend = (status: ChannelStatus) => status === 'NOT_SENT' || status === 'SENT' || status === 'EXPIRED';
