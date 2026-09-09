import type { AuthUser } from '@/store/auth.store';

/** Kanal login yang tersedia (L-EMAIL / L-USER / L-WA di kontrak). */
export type LoginChannel = 'email' | 'username' | 'whatsapp';

export interface LoginEmailPayload {
  email: string;
  password: string;
  turnstileToken: string;
}

export interface LoginUsernamePayload {
  username: string;
  password: string;
  turnstileToken: string;
}

export interface LoginWhatsappPayload {
  phone: string;
  password: string;
  turnstileToken: string;
}

/**
 * Semua kanal login memakai 2FA:
 *  • email / username → magic link dikirim ke email (TTL 15 menit)
 *  • whatsapp        → OTP 6 digit (TTL 5 menit, maks. 3 permintaan / 15 menit)
 */
export interface LoginChallengeResponse {
  challenge: 'magic_link' | 'otp';
  /** Tujuan yang sudah dimasking untuk ditampilkan di layar. */
  maskedTarget: string;
  expiresInSeconds: number;
}

export interface VerifyOtpPayload {
  code: string;
}

export interface SessionResponse {
  token: string;
  user: AuthUser;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
  passwordConfirmation: string;
}
