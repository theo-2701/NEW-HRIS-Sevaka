import { api, ApiError } from '@/services/api';
import { MOCK } from '@/services/mock';
import { maskEmail, maskPhone } from '@/lib/format';
import type {
  ActivatePayload,
  ForgotPasswordPayload,
  LoginChallengeResponse,
  LoginEmailPayload,
  LoginUsernamePayload,
  LoginWhatsappPayload,
  PendingInvitation,
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
 *   POST /auth/activate                     — publik, dari tautan undangan (UIC-AUTH 0.19 §5.1)
 *   POST /auth/resend-invitation            — HR/Admin, 422 bila tautan aktif masih ada (§5.2)
 * Seluruh kegagalan identitas = 401 dengan satu pesan seragam (§1.5) — layar tidak
 * boleh membedakan sandi salah / akun terkunci / tautan kedaluwarsa.
 * Mode dummy: lihat `services/mock.ts`.
 */

const delay = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms));

/** Data contoh akun belum aktivasi (TTL tautan undangan 24 jam, UIC §5.1). */
const hoursFromNow = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
const pendingInvites: PendingInvitation[] = [
  { employeeId: 'emp-siti-aminah', name: 'Siti Aminah', email: 'siti.aminah@ptdika.co.id', sentAt: hoursFromNow(-6), expiresAt: hoursFromNow(18) },
  { employeeId: 'emp-arif-nugraha', name: 'Arif Nugraha', email: 'arif.nugraha@ptdika.co.id', sentAt: hoursFromNow(-52), expiresAt: hoursFromNow(-28) },
  { employeeId: 'emp-lina-marlina', name: 'Lina Marlina', email: 'lina.marlina@ptdika.co.id', sentAt: hoursFromNow(-30), expiresAt: hoursFromNow(-6) },
];

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

  /**
   * Aktivasi akun dari tautan undangan (FSD-AUTH 0.14 §5, UIC §5.1). Tiga kelas galat WAJIB dibedakan
   * layar: `401` tautan tak dapat dipakai (minta undangan baru), `422` masukan salah, `502` gangguan
   * penyedia identitas — tautan MASIH HIDUP, jadi jangan menyuruh minta undangan baru.
   * Mode dummy: token `expired` → 401, token `idp-down` → 502.
   */
  async activate(payload: ActivatePayload): Promise<void> {
    if (MOCK) {
      await delay();
      if (!payload.aid || !payload.token || payload.token === 'expired') {
        throw new ApiError('Tautan ini tidak dapat dipakai — silakan minta undangan baru.', 401);
      }
      if (payload.token === 'idp-down') throw new ApiError('Ada gangguan sistem — silakan coba lagi.', 502);
      if (payload.password !== payload.passwordConfirmation) {
        throw new ApiError('Masukan Anda belum benar.', 422, undefined, { confirm_password: ['Password tidak cocok.'] });
      }
      return;
    }
    await api.post('/auth/activate', {
      otp_attempt_id: payload.aid,
      token: payload.token,
      new_password: payload.password,
      confirm_password: payload.passwordConfirmation,
    });
  },

  /**
   * Akun yang menunggu aktivasi + tautan undangan terakhir (FSD-AUTH §6.1). Alamat daftarnya belum
   * berkontrak di UIC — di mode dummy dibaca dari data contoh.
   */
  async pendingInvitations(): Promise<PendingInvitation[]> {
    if (MOCK) {
      await delay(300);
      return pendingInvites.map((row) => ({ ...row }));
    }
    const { data } = await api.get<PendingInvitation[]>('/auth/pending-invitations');
    return data;
  },

  /**
   * `POST /auth/resend-invitation` — hanya satu tautan aktif dalam satu waktu. Tautan lama masih berlaku
   * + `force_invalidate=false` → 422 (alamat ber-auth ini BOLEH menyebut sebabnya).
   */
  async resendInvitation(employeeId: string, forceInvalidate = false): Promise<PendingInvitation> {
    if (MOCK) {
      await delay(400);
      const row = pendingInvites.find((item) => item.employeeId === employeeId);
      if (!row) throw new ApiError('Karyawan tidak ditemukan atau sudah aktif.', 404);
      if (!forceInvalidate && new Date(row.expiresAt).getTime() > Date.now()) {
        throw new ApiError('Undangan aktif masih ada.', 422);
      }
      const now = new Date();
      row.sentAt = now.toISOString();
      row.expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      return { ...row };
    }
    const { data } = await api.post<PendingInvitation>('/auth/resend-invitation', {
      employee_id: employeeId,
      force_invalidate: forceInvalidate,
    });
    return data;
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
