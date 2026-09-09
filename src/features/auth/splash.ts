/**
 * Konstanta & status splash layar masuk — dipisah dari komponennya supaya
 * `AuthSplash.tsx` hanya mengekspor komponen (syarat fast refresh).
 */

/** Kalimat yang menggambarkan aplikasi — tagline resmi SEVAKA. */
export const SPLASH_TAGLINE = 'Your Intelligent HR Companion';

/** Lama splash ditahan sebelum keluar sendiri (ms) — sama seperti prototype. */
export const SPLASH_HOLD_MS = 2100;

/** Durasi animasi keluar (ms) sebelum elemen dilepas dari DOM. */
export const SPLASH_LEAVE_MS = 480;

const SEEN_KEY = 'sevaka_intro_seen';

/** Splash hanya diputar sekali per sesi browser. */
export function hasSeenSplash(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return true; // sessionStorage diblokir → jangan tahan pengguna di splash
  }
}

export function markSplashSeen(): void {
  try {
    sessionStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* diabaikan */
  }
}
