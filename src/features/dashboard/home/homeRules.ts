const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Dashboard memakai bahasa Inggris; `lib/format` (bahasa Indonesia) tetap untuk modul lain. */
const EN_DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
export const formatDateEn = (iso: string) => EN_DATE.format(new Date(iso.length === 10 ? `${iso}T00:00:00` : iso));
export const formatDateRangeEn = (from: string, to: string) =>
  from === to ? formatDateEn(from) : `${formatDateEn(from)} – ${formatDateEn(to)}`;

/**
 * Lapis Perusahaan hanya untuk SUPER_ADMIN · HR_MANAGER · HR_STAFF · Dept Manager (dua ejaan) — FSD-AUTH 0.18
 * §2.9. Peran lain: kartu tidak dirender sama sekali (tanpa ruang kosong).
 */
const COMPANY_LAYER_ROLES = ['ROLE_SUPER_ADMIN', 'ROLE_HR_MANAGER', 'ROLE_HR_STAFF', 'ROLE_DEPT_MANAGER', 'ROLE_DEPARTMENT_MANAGER'];
export const canSeeCompanyLayer = (role: string | undefined) => COMPANY_LAYER_ROLES.includes(role ?? '');

export function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour < 11) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export const dayLine = (date: Date) =>
  `${DAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;

/** `yyyy-MM` → "September 2026". */
export const monthLabel = (month: string) => `${MONTHS[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;

export const shortMonth = (label: string) => label.slice(0, 3);

export function daysUntil(iso: string, from: Date): number {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const end = new Date(`${iso}T00:00:00`).getTime();
  return Math.round((end - start) / 86_400_000);
}
