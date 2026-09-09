import { api } from '@/services/api';
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
 * CATATAN HAND-OFF: backend belum tersedia saat konversi, jadi setiap fungsi
 * memakai jalur mock ketika `VITE_API_BASE_URL` belum diisi. Endpoint asli
 * sudah ditulis di sini — hapus blok `if (MOCK)` begitu backend siap.
 */
const MOCK = !import.meta.env.VITE_API_BASE_URL;

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
    const { data } = await api.post<LoginChallengeResponse>('/auth/login/email', payload);
    return data;
  },

  async loginWithUsername(payload: LoginUsernamePayload): Promise<LoginChallengeResponse> {
    if (MOCK) {
      await delay();
      return { challenge: 'magic_link', maskedTarget: 's***@ptdika.co.id', expiresInSeconds: 900 };
    }
    const { data } = await api.post<LoginChallengeResponse>('/auth/login/username', payload);
    return data;
  },

  async loginWithWhatsapp(payload: LoginWhatsappPayload): Promise<LoginChallengeResponse> {
    if (MOCK) {
      await delay();
      return { challenge: 'otp', maskedTarget: maskPhone(`0${payload.phone}`), expiresInSeconds: 300 };
    }
    const { data } = await api.post<LoginChallengeResponse>('/auth/login/whatsapp', payload);
    return data;
  },

  /** Dipanggil saat pengguna membuka tautan magic-link (layar AV). */
  async verifyMagicLink(token: string): Promise<SessionResponse> {
    if (MOCK) {
      await delay(1200);
      return MOCK_SESSION;
    }
    const { data } = await api.post<SessionResponse>('/auth/magic-link/verify', { token });
    return data;
  },

  async verifyOtp(payload: VerifyOtpPayload): Promise<SessionResponse> {
    if (MOCK) {
      await delay();
      return MOCK_SESSION;
    }
    const { data } = await api.post<SessionResponse>('/auth/otp/verify', payload);
    return data;
  },

  /** Maksimal 3 permintaan per 15 menit (kontrak layar OTP). */
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
    await api.post('/auth/password/forgot', payload);
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<void> {
    if (MOCK) {
      await delay();
      return;
    }
    await api.post('/auth/password/reset', payload);
  },
};
