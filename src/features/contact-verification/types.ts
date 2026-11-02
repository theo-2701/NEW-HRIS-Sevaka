/**
 * Verifikasi email kantor + nomor HP (TSD-001-EMPLOYEE 0.212 §7.20) dan
 * pembatalan akses karyawan yang belum bekerja (§7.21).
 * Akses: HR Staff dan HR Manager saja.
 */
export type ChannelStatus = 'NOT_REQUIRED' | 'NOT_SENT' | 'LINK_SENT' | 'LINK_EXPIRED' | 'VERIFIED';
export type ContactKind = 'EMAIL' | 'PHONE';
export type QueueFilter = 'ALL' | 'EMAIL_PENDING' | 'PHONE_PENDING';
export type SkipReason = 'NOT_FOUND_OR_CLOSED' | 'NO_COMPANY_EMAIL' | 'NO_PHONE' | 'ALREADY_VERIFIED';
export type CancelReason = 'ACCIDENT_PASSED_AWAY' | 'CANDIDATE_WITHDREW' | 'ENTERED_IN_ERROR' | 'OTHER';
export type CloseReason = 'VERIFIED' | 'ACCESS_CANCELLED';

export interface ContactVerification {
  id: string;
  employeeId: string;
  employeeName: string;
  companyEmail: string | null;
  /** Selalu ter-mask dari server. */
  phoneMasked: string | null;
  emailStatus: ChannelStatus;
  phoneStatus: ChannelStatus;
  joinDate: string;
}

export interface SendResult {
  results: { id: string; status: 'SENT' | 'SKIPPED'; reason: SkipReason | null }[];
  sent: number;
  skipped: number;
}

export const CHANNEL_STATUS_LABEL: Record<ChannelStatus, string> = {
  NOT_REQUIRED: 'Not required',
  NOT_SENT: 'Not sent',
  LINK_SENT: 'Link sent',
  LINK_EXPIRED: 'Link expired',
  VERIFIED: 'Verified',
};

export const SKIP_REASON_LABEL: Record<SkipReason, string> = {
  NOT_FOUND_OR_CLOSED: 'No longer in the queue',
  NO_COMPANY_EMAIL: 'No company email',
  NO_PHONE: 'No phone number',
  ALREADY_VERIFIED: 'Already verified',
};

export const CANCEL_REASON_LABEL: Record<CancelReason, string> = {
  ACCIDENT_PASSED_AWAY: 'Accident or passed away',
  CANDIDATE_WITHDREW: 'Candidate withdrew',
  ENTERED_IN_ERROR: 'Entered in error',
  OTHER: 'Other',
};

export const KIND_LABEL: Record<ContactKind, string> = { EMAIL: 'company email link', PHONE: 'WhatsApp link' };

/** Batas pilih massal per kiriman (§7.20 CV2/CV3). */
export const MAX_SELECTION = 50;

export const isPending = (status: ChannelStatus) => status !== 'VERIFIED' && status !== 'NOT_REQUIRED';
