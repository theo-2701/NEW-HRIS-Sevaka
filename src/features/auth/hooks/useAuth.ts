import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/features/auth/services/auth.service';
import { useAuthFlowStore } from '@/features/auth/store/authFlow.store';
import { useAuthStore } from '@/store/auth.store';
import { toast } from '@/store/ui.store';
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

/** Menyimpan sesi lalu masuk ke dashboard. */
function useCompleteSession() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const reset = useAuthFlowStore((s) => s.reset);

  return (session: SessionResponse) => {
    setSession(session);
    reset();
    navigate('/', { replace: true });
  };
}

/** Verifikasi tautan magic link (layar AV). */
export function useVerifyMagicLink() {
  const complete = useCompleteSession();
  return useMutation({
    mutationFn: (token: string) => authService.verifyMagicLink(token),
    onSuccess: complete,
    onError: (error: Error) => toast(error.message, 'danger'),
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

export function useResendOtp() {
  const countResend = useAuthFlowStore((s) => s.countResend);
  return useMutation({
    mutationFn: () => authService.resendOtp(),
    onSuccess: () => {
      countResend();
      toast('Kode OTP baru telah dikirim.', 'ok');
    },
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

export function useResetPassword() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (payload: { password: string; passwordConfirmation: string }) =>
      authService.resetPassword({ token: 'reset-token', ...payload }),
    onSuccess: () => navigate('/auth/reset-password/done'),
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

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
