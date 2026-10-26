/**
 * Alamat asal sesudah login — FSD-AUTH 0.21 §2 «Pendaratan sesudah login».
 *
 * Disimpan saat halaman ber-login dibuka tanpa sesi atau sesi berakhir di tengah kerja; dipakai sekali saat
 * verifikasi sukses; dihapus saat Logout. `localStorage` (bukan `sessionStorage`) karena magic link dibuka dari
 * surel di tab baru. Hanya path yang disimpan, dan isinya diperiksa ulang saat dipakai (nol dipercaya).
 */
const KEY = 'sevaka_return_path';
const TTL_MS = 15 * 60_000;
const MAX_LENGTH = 2048;

/** Penjaga anti open-redirect: path internal ber-`/` tunggal, bukan pohon auth, bukan beranda. */
export function isSafeReturnPath(path: unknown): path is string {
  if (typeof path !== 'string' || path.length === 0 || path.length > MAX_LENGTH) return false;
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return false;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(path)) return false;
  const pathname = path.split(/[?#]/)[0];
  if (pathname === '/' || pathname === '/dashboard') return false;
  return pathname !== '/auth' && !pathname.startsWith('/auth/');
}

export function saveReturnPath(path: string, now = Date.now()) {
  if (!isSafeReturnPath(path)) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ path, savedAt: now }));
  } catch {
    // Penyimpanan diblokir (mode privat) — login tetap mendarat di beranda.
  }
}

/** Mengambil alamat tersimpan sekali lalu menghapusnya; kedaluwarsa atau tak lolos penjaga ⇒ `null`. */
export function takeReturnPath(now = Date.now()): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    localStorage.removeItem(KEY);
    if (!raw) return null;
    const saved: unknown = JSON.parse(raw);
    if (!saved || typeof saved !== 'object') return null;
    const { path, savedAt } = saved as { path?: unknown; savedAt?: unknown };
    if (typeof savedAt !== 'number' || now - savedAt > TTL_MS) return null;
    return isSafeReturnPath(path) ? path : null;
  } catch {
    return null;
  }
}

export function clearReturnPath() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Tidak ada yang perlu dibersihkan.
  }
}
