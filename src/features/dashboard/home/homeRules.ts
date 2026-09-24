const MONTHS = [
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

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/** Lapis Perusahaan hanya untuk peran HR/manajemen (FSD-001-AUTH §2.9). */
export const canSeeCompanyLayer = (role: string | undefined) => /admin|hr|manager|manajer/i.test(role ?? '');

export function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour < 11) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 18) return 'Selamat sore';
  return 'Selamat malam';
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
