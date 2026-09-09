/**
 * Formatter bersama. Prototype memakai gaya Indonesia (Rp 1.234.567,
 * tanggal `dd Mmm yyyy`), jadi semua tampilan angka/tanggal lewat sini —
 * jangan format manual di komponen.
 */

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

const MONTHS_LONG = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export function toDate(value: string | number | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

/**
 * `YYYY-MM-DD` dari waktu **lokal** — bukan `toISOString()`, yang memakai UTC
 * dan menggeser tanggal sehari di zona waktu Indonesia.
 */
export function toIsoDate(value: string | number | Date): string {
  const d = toDate(value);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/** `12 Agu 2026` — format tanggal default tabel & detail. */
export function formatDate(value?: string | number | Date | null): string {
  if (!value) return '—';
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** `12 Agustus 2026` — untuk header/hero. */
export function formatDateLong(value?: string | number | Date | null): string {
  if (!value) return '—';
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

/** `12 Agu 2026, 08:30` */
export function formatDateTime(value?: string | number | Date | null): string {
  if (!value) return '—';
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return '—';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${formatDate(d)}, ${hh}:${mm}`;
}

/** `1.234.567` (tanpa simbol). */
export function formatNumber(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('id-ID').format(value);
}

/** `Rp 1.234.567` */
export function formatCurrency(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `Rp ${formatNumber(value)}`;
}

/** Inisial untuk avatar: "Budi Santoso" -> "BS". */
export function initials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

/** Masking email untuk layar magic-link: `s***@ptdika.co.id`. */
export function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return email;
  return `${user.slice(0, 1)}***@${domain}`;
}

/** Masking nomor HP untuk layar OTP: `0812****7890`. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return phone;
  return `${digits.slice(0, 4)}****${digits.slice(-4)}`;
}

/** `05:00` dari detik — countdown OTP. */
export function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(Math.max(totalSeconds, 0) / 60);
  const s = Math.max(totalSeconds, 0) % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
