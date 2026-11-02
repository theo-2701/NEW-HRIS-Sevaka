/**
 * Kembali ke alamat asal sesudah login (FSD-001-AUTH §2 «Pendaratan sesudah login»;
 * CATATAN-PERUBAHAN 25 Okt 2026 FRT-2610251334 T1). Disimpan 15 menit, sekali pakai,
 * dihapus saat Logout; hanya path internal yang diterima — diperiksa lagi saat dipakai.
 */
const KEY = 'sevaka_return_path';
const TTL_MS = 15 * 60 * 1000;

export function isSafeReturnPath(path: string | null | undefined): path is string {
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return false;
  if ([...path].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127) || /^\/[a-z][a-z0-9+.-]*:/i.test(path)) return false;
  const bare = path.split(/[?#]/)[0];
  if (bare === '/' || bare === '/dashboard' || bare.startsWith('/auth')) return false;
  return true;
}

export function saveReturnPath(path: string) {
  if (!isSafeReturnPath(path)) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ path, at: Date.now() }));
  } catch {
    /* penyimpanan diblokir — cukup mendarat di Dashboard */
  }
}

/** Ambil sekali pakai; kedaluwarsa atau tak aman ⇒ null. */
export function takeReturnPath(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    localStorage.removeItem(KEY);
    if (!raw) return null;
    const { path, at } = JSON.parse(raw) as { path: string; at: number };
    return Date.now() - at <= TTL_MS && isSafeReturnPath(path) ? path : null;
  } catch {
    return null;
  }
}

export function clearReturnPath() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* abaikan */
  }
}
