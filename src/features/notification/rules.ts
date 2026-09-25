import { MY_ANNOUNCEMENTS_PATH } from '@/features/announcement/types';
import type { InboxRow } from '@/features/notification/types';

/**
 * Tabel pemetaan `reference_type → route dasar` milik FE (UIC-NOTIFICATION §2.1). Tautan dirakit
 * dari alamat dasar sendiri atas penunjuk buram `reference_type` + `reference_id` — DILARANG memakai
 * alamat dari isi pesan (`NT-7`). Hanya nilai yang target layarnya berkontrak yang masuk sini;
 * `PRODUCTIVITY_RECAP`/`FINANCE_REQUEST` dikenal tetapi targetnya belum berkontrak tangan-pertama.
 */
const REFERENCE_ROUTES: Record<string, { label: string; to: (id: string) => string }> = {
  ANNOUNCEMENT: { label: 'Open announcement', to: (id) => `${MY_ANNOUNCEMENTS_PATH}?id=${encodeURIComponent(id)}` },
};

/**
 * Tautan "Lihat Perkara" satu baris. `null` bila `reference_type` NULL **atau tak dikenal** — baris
 * dirender tanpa tautan, bukan tombol mati (FSD §1.1, UIC §2.1).
 */
export function referenceLink(row: Pick<InboxRow, 'referenceType' | 'referenceId'>) {
  if (!row.referenceType || !row.referenceId) return null;
  const route = REFERENCE_ROUTES[row.referenceType];
  return route ? { label: route.label, to: route.to(row.referenceId) } : null;
}

/** Label tampilan kode jenis — `LOGIN_OTP` → `Login otp`; katalog terbuka, jadi tanpa whitelist. */
export function typeLabel(type: string): string {
  const words = type.toLowerCase().split('_').filter(Boolean);
  if (!words.length) return type;
  return [words[0].charAt(0).toUpperCase() + words[0].slice(1), ...words.slice(1)].join(' ');
}
