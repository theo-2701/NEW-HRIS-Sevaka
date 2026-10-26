import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/features/auth/services/auth.service';
import { ApiError } from '@/services/api';
import { useAuthFlowStore } from '@/features/auth/store/authFlow.store';
import { useAuthStore } from '@/store/auth.store';
import { toast } from '@/store/ui.store';
import { clearReturnPath, takeReturnPath } from '@/lib/returnPath';
import type {
  LoginEmailPayload,
  LoginUsernamePayload,
  LoginWhatsappPayload,
  SessionResponse,
} from '@/features/auth/types';

/** Login via email → magic link (layar L-EMAIL → MLS). */
export function useLoginEmail() {
  const navigate = useNavigate();
  const startChallenge = useAuthFlowStore((s) => s.startChallenge);

  return useMutation({
    mutationFn: (payload: LoginEmailPayload) => authService.loginWithEmail(payload),
    onSuccess: (res) => {
      startChallenge({ channel: 'email', maskedTarget: res.maskedTarget, expiresInSeconds: res.expiresInSeconds });
      navigate('/auth/magic-link-sent');
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

/** Login via username → magic link ke email terdaftar (layar L-USER → MLS). */
export function useLoginUsername() {
  const navigate = useNavigate();
  const startChallenge = useAuthFlowStore((s) => s.startChallenge);

  return useMutation({
    mutationFn: (payload: LoginUsernamePayload) => authService.loginWithUsername(payload),
    onSuccess: (res) => {
      startChallenge({ channel: 'username', maskedTarget: res.maskedTarget, expiresInSeconds: res.expiresInSeconds });
      navigate('/auth/magic-link-sent');
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

/** Login via WhatsApp → OTP 6 digit (layar L-WA → OTP). */
export function useLoginWhatsapp() {
  const navigate = useNavigate();
  const startChallenge = useAuthFlowStore((s) => s.startChallenge);

  return useMutation({
    mutationFn: (payload: LoginWhatsappPayload) => authService.loginWithWhatsapp(payload),
    onSuccess: (res) => {
      startChallenge({ channel: 'whatsapp', maskedTarget: res.maskedTarget, expiresInSeconds: res.expiresInSeconds });
      navigate('/auth/otp');
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

/** Menyimpan sesi lalu masuk ke alamat asal (bila ada, FSD-AUTH 0.21 §2) atau dashboard. */
function useCompleteSession() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const reset = useAuthFlowStore((s) => s.reset);

  return (session: SessionResponse) => {
    setSession(session);
    reset();
    navigate(takeReturnPath() ?? '/', { replace: true });
  };
}

/** Verifikasi tautan magic link (layar AV). Galat ditampilkan sebagai kartu, bukan toast (FSD 0.18 §2.4). */
export function useVerifyMagicLink() {
  const complete = useCompleteSession();
  return useMutation({
    mutationFn: (token: string) => authService.verifyMagicLink(token),
    onSuccess: complete,
  });
}

/** Verifikasi OTP (layar OTP). */
export function useVerifyOtp() {
  const complete = useCompleteSession();
  return useMutation({
    mutationFn: (code: string) => authService.verifyOtp({ code }),
    onSuccess: complete,
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export function useForgotPassword() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (email: string) => authService.forgotPassword({ email }),
    onSuccess: () => navigate('/auth/forgot-password/sent'),
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

/** 401 ⇒ kartu Link Tidak Valid (dirender halaman); galat lain toast, isi field dipertahankan. */
export function useResetPassword(token: string) {
  const navigate = useNavigate();
  const clearSession = useAuthStore((s) => s.clear);
  return useMutation({
    mutationFn: (payload: { password: string; passwordConfirmation: string }) =>
      authService.resetPassword({ token, ...payload }),
    onSuccess: () => {
      // Sesi lokal dibersihkan LEBIH DULU — server sudah mencabut semua sesi (FSD 0.18 §3.3).
      clearSession();
      navigate('/auth/reset-password/done');
    },
    onError: (error: Error) => {
      if (error instanceof ApiError && error.status === 401) return;
      toast(error instanceof ApiError && error.status >= 502 ? 'Ada gangguan sistem — silakan coba lagi.' : error.message, 'danger');
    },
  });
}

/**
 * Keluar (SELF_LOGOUT · SINGLE_EMPLOYEE · diri sendiri). FSD-AUTH 0.18 §2.9: gagal ⇒ sesi lokal TIDAK
 * dibersihkan, pengguna tetap masuk di layar yang sama, toast jujur.
 */
export function useLogout() {
  const navigate = useNavigate();
  const clear = useAuthStore((s) => s.clear);
  return useMutation({
    mutationFn: () => authService.logout(useAuthStore.getState().user?.id ?? ''),
    onSuccess: () => {
      // Pindah dulu, baru hapus sesi: penjaga rute tidak sempat menyimpan halaman ini sebagai alamat asal, dan
      // alamat lama dibuang — login berikutnya (mungkin orang lain) mendarat di beranda (FSD-AUTH 0.21 §2).
      navigate('/auth/login');
      clear();
      clearReturnPath();
    },
    onError: () =>
      toast(
        "Your session wasn't closed on the server, so you're still signed in. Press Log out again; if it still fails, don't leave this device signed in.",
        'danger',
      ),
  });
}

export const pendingInvitationKeys = ['auth', 'pending-invitations'] as const;

/** Akun menunggu aktivasi (FSD-AUTH §6) — untuk antrean Dashboard dan modal Kirim Ulang Undangan. */
export const usePendingInvitations = (enabled = true) =>
  useQuery({ queryKey: pendingInvitationKeys, queryFn: () => authService.pendingInvitations(), enabled });

/** Hitung mundur detik — dipakai countdown OTP (TTL 5 menit). */
export function useCountdown(seconds: number) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) return;
    const id = window.setInterval(() => setRemaining((v) => Math.max(0, v - 1)), 1000);
    return () => window.clearInterval(id);
  }, [remaining]);

  return { remaining, restart: (value: number) => setRemaining(value) };
}
