import type { PerfRole } from '@/features/performance/types';

/**
 * Hak akses per layar — diturunkan dari FSD-001-PERFORMANCE §Matriks Menu/Tab → Peran (tabel C),
 * yang bersumber dari Gate Mapping TSD §13.1. `ROLE_SUPER_ADMIN` = superset seluruh baris.
 */
const allow = (...roles: PerfRole[]) => (role: PerfRole) => role === 'ROLE_SUPER_ADMIN' || roles.includes(role);

// Menu 1 — Siklus & Setelan
/** `#3` grid periode — DM hanya kontekstual lewat lembar, EMP nol akses. */
export const canListPeriods = allow('ROLE_HR_MANAGER', 'ROLE_HR_STAFF');
/** `#1`/`#6`/`#7` buka · mulai pengesahan · tutup. */
export const canManagePeriods = allow('ROLE_HR_MANAGER');
/** `#2` detail — DM dibatasi lapis kueri ke periode lembarnya. */
export const canViewPeriod = allow('ROLE_HR_MANAGER', 'ROLE_HR_STAFF', 'ROLE_DEPT_MANAGER');
/** `#4`/`#5` daftar ketidaklayakan. */
export const canViewEligibility = allow('ROLE_HR_MANAGER', 'ROLE_HR_STAFF');
