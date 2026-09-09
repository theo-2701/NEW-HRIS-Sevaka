import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LoginChannel } from '@/features/auth/types';

/**
 * Status tantangan 2FA yang sedang berjalan (magic link / OTP).
 * Dipersist agar layar MLS / OTP tetap punya konteks setelah refresh.
 */
interface AuthFlowState {
  channel: LoginChannel | null;
  maskedTarget: string | null;
  expiresInSeconds: number;
  otpRequestCount: number;
  startChallenge: (payload: { channel: LoginChannel; maskedTarget: string; expiresInSeconds: number }) => void;
  countResend: () => void;
  reset: () => void;
}

export const useAuthFlowStore = create<AuthFlowState>()(
  persist(
    (set, get) => ({
      channel: null,
      maskedTarget: null,
      expiresInSeconds: 0,
      otpRequestCount: 0,
      startChallenge: ({ channel, maskedTarget, expiresInSeconds }) =>
        set({ channel, maskedTarget, expiresInSeconds, otpRequestCount: 1 }),
      countResend: () => set({ otpRequestCount: get().otpRequestCount + 1 }),
      reset: () => set({ channel: null, maskedTarget: null, expiresInSeconds: 0, otpRequestCount: 0 }),
    }),
    { name: 'sevaka-auth-flow' },
  ),
);

/** Kontrak layar OTP: maksimal 3 permintaan per 15 menit. */
export const MAX_OTP_REQUESTS = 3;
