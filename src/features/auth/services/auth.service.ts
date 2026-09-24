import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import { maskEmail, maskPhone } from '@/lib/format';
import type {
  ForgotPasswordPayload,
  LoginChallengeResponse,
  LoginEmailPayload,
  LoginUsernamePayload,
  LoginWhatsappPayload,
  ResetPasswordPayload,
  SessionResponse,
  VerifyOtpPayload,
} from '@/features/auth/types';

/**
 * API service layer modul auth.
 *
 * Kontrak UIC-001-AUTH-0.8 §3–§5:
 *   POST /auth/login                        — SATU endpoint, dibedakan identifier_type
 *                                             (EMAIL | USERNAME | PHONE_NUMBER); password +
 *                                             turnstile_token wajib ketiganya; tanpa company_code
 *   POST /auth/verify-otp                   — satu endpoint kedua cabang 2FA (otp_attempt_id + token)
 *   POST /auth/reset-password/request       — jawaban generik anti-enumerasi
 *   POST /auth/reset-password/confirm       — 422 sandi tak cocok/lemah, 401 token seragam
 *   POST /auth/force-logout                 — dari layar pengguna hanya SELF_LOGOUT
 * Seluruh kegagalan identitas = 401 dengan satu pesan seragam (§1.5) — layar tidak
 * boleh membedakan sandi salah / akun terkunci / tautan kedaluwarsa.
 * Mode dummy: lihat `services/mock.ts`.
 */

const delay = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms));

const MOCK_SESSION: SessionResponse = {
  token: 'mock-token',
  user: {
    id: '0198e2a0-0000-7c40-9b00-000000000001',
    name: 'Budi Santoso',
    email: 'budi.santoso@ptdika.co.id',
    role: 'Administrator',
    position: 'HR Operations',
  },
};

export const authService = {
  async loginWithEmail(payload: LoginEmailPayload): Promise<LoginChallengeResponse> {
    if (MOCK) {
      await delay();
      return { challenge: 'magic_link', maskedTarget: maskEmail(payload.email), expiresInSeconds: 900 };
    }
    const { data } = await api.post<LoginChallengeResponse>('/auth/login', {
      identifier: payload.email,
      identifier_type: 'EMAIL',
      password: payload.password,
      turnstile_token: payload.turnstileToken,
    });
    return data;
  },

  async loginWithUsername(payload: LoginUsernamePayload): Promise<LoginChallengeResponse> {
    if (MOCK) {
      await delay();
      return { challenge: 'magic_link', maskedTarget: 's***@ptdika.co.id', expiresInSeconds: 900 };
    }
    const { data } = await api.post<LoginChallengeResponse>('/auth/login', {
      identifier: payload.username,
      identifier_type: 'USERNAME',
      password: payload.password,
      turnstile_token: payload.turnstileToken,
    });
    return data;
  },

  async loginWithWhatsapp(payload: LoginWhatsappPayload): Promise<LoginChallengeResponse> {
    if (MOCK) {
      await delay();
      return { challenge: 'otp', maskedTarget: maskPhone(payload.phone.trim().replace(/^\+?62/, '0')), expiresInSeconds: 300 };
    }
    // Server menormalkan 08…/62…/+62… — klien tidak menolak bentuk yang berbeda.
    const { data } = await api.post<LoginChallengeResponse>('/auth/login', {
      identifier: payload.phone,
      identifier_type: 'PHONE_NUMBER',
      password: payload.password,
      turnstile_token: payload.turnstileToken,
    });
    return data;
  },

  /** Dipanggil saat pengguna membuka tautan magic-link (layar AV). */
  async verifyMagicLink(token: string): Promise<SessionResponse> {
    if (MOCK) {
      await delay(1200);
      return MOCK_SESSION;
    }
    // Magic link membawa ?aid=<otp_attempt_id>&token=<token>.
    const aid = new URLSearchParams(window.location.search).get('aid');
    const { data } = await api.post<SessionResponse>('/auth/verify-otp', { otp_attempt_id: aid, token });
    return data;
  },

  async verifyOtp(payload: VerifyOtpPayload): Promise<SessionResponse> {
    if (MOCK) {
      await delay();
      return MOCK_SESSION;
    }
    const { data } = await api.post<SessionResponse>('/auth/verify-otp', {
      otp_attempt_id: sessionStorage.getItem('sevaka-otp-attempt-id'),
      token: payload.code,
    });
    return data;
  },

  /**
   * Maksimal 3 permintaan per 15 menit (FSD §2.5). GAP: UIC-AUTH §3 tidak memuat
   * endpoint kirim-ulang tersendiri — alamat di bawah menunggu kontraknya.
   */
  async resendOtp(): Promise<{ expiresInSeconds: number }> {
    if (MOCK) {
      await delay(400);
      return { expiresInSeconds: 300 };
    }
    const { data } = await api.post<{ expiresInSeconds: number }>('/auth/otp/resend');
    return data;
  },

  async forgotPassword(payload: ForgotPasswordPayload): Promise<void> {
    if (MOCK) {
      await delay();
      return;
    }
    await api.post('/auth/reset-password/request', { email: payload.email });
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<void> {
    if (MOCK) {
      await delay();
      return;
    }
    const aid = new URLSearchParams(window.location.search).get('aid');
    await api.post('/auth/reset-password/confirm', {
      otp_attempt_id: aid,
      token: payload.token,
      new_password: payload.password,
      confirm_password: payload.passwordConfirmation,
    });
  },

  /** Tombol keluar pengguna — satu-satunya reason yang boleh dari layar biasa (UIC §3.5). */
  async logout(employeeId: string): Promise<void> {
    if (MOCK) {
      await delay(150);
      return;
    }
    await api.post('/auth/force-logout', {
      logout_scope: 'SINGLE_EMPLOYEE',
      target_employee_id: employeeId,
      reason: 'SELF_LOGOUT',
    });
  },
};
