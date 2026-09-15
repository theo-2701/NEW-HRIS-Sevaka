import type { Role } from '@/features/finance-settings/types';

/** Pola `FIN1` — nama tampilan (TSD §14.1.0). */
export const FIN1_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 .,'()/&-]*$/;

/** Batas `name`: `mst_advance_purpose_type` varchar(150), `mst_rejection_reason` varchar(100). */
export const PURPOSE_NAME_MAX = 150;
export const REASON_NAME_MAX = 100;
/** Pola `FIN2` — keterangan bebas. */
export const FREE_TEXT_MAX = 2000;

const WRITE_ROLES: Role[] = ['ROLE_FINANCE_OFFICER', 'ROLE_SUPER_ADMIN'];
const HISTORY_ROLES: Role[] = ['ROLE_FINANCE_OFFICER', 'ROLE_SUPER_ADMIN', 'ROLE_HR_MANAGER'];

/** Tulis seluruh resource FT1 — Finance Officer & Super Admin (TSD §6.1.5). */
export const canWriteSettings = (role: Role) => WRITE_ROLES.includes(role);
export const canReadHistory = (role: Role) => HISTORY_ROLES.includes(role);
/** Katalog bersama — Dept Manager tidak relevan (nol akses). */
export const canReadCatalogue = (role: Role) => role !== 'ROLE_DEPT_MANAGER';

/** Normalisasi `FIN1`: potong ujung, rapatkan spasi ganda. */
export const normalizeName = (name: string) => name.trim().replace(/\s+/g, ' ');

export function nameError(name: string, max: number): string | null {
  const value = normalizeName(name);
  if (value.length < 2 || value.length > max) return `panjang nama 2–${max} karakter`;
  if (!FIN1_PATTERN.test(value)) return "nama hanya boleh huruf, angka, spasi, dan . , ' ( ) / & -";
  return null;
}

export function reasonError(reason: string | undefined): string | null {
  const value = (reason ?? '').trim();
  if (!value) return 'wajib diisi';
  if (value.length > FREE_TEXT_MAX) return `maksimal ${FREE_TEXT_MAX} karakter`;
  if (/[<>]/.test(value)) return 'tidak boleh memuat < atau >';
  return null;
}

export function formatDelta(before: number, after: number): string | null {
  const delta = after - before;
  if (!delta) return null;
  return `${delta > 0 ? '+' : '−'} Rp ${Math.abs(delta).toLocaleString('id-ID')}`;
}
