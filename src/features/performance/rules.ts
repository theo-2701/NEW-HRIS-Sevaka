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

// Menu 2 — Daftar Induk & Bobot
/** `#12` grid Kelola & Browsing (+ `#11` detail) — HRS & DM baca saja. */
export const canReadKpi = allow('ROLE_HR_MANAGER', 'ROLE_HR_STAFF', 'ROLE_DEPT_MANAGER');
/** `#8`/`#9`/`#10` buat · ubah · nonaktifkan. */
export const canWriteKpi = allow('ROLE_HR_MANAGER');

// Menu 3 — Lembar Penilaian
/** `#14` antrean lembar — DM ber-cakupan `ASSESSOR`, HR ber-cakupan `ALL`. EMP tanpa daftar. */
export const canListSheets = allow('ROLE_HR_MANAGER', 'ROLE_HR_STAFF', 'ROLE_DEPT_MANAGER');
/** Cakupan `ALL` pada `#14`; DM dipaksa server ke `ASSESSOR`. */
export const canScopeAllSheets = allow('ROLE_HR_MANAGER', 'ROLE_HR_STAFF');
/** Permukaan `SELF` `D1` (`#15` SELF, `#20`–`#23`) — terikat identitas token. */
export const hasOwnSheetSurface = allow('ROLE_EMPLOYEE');
/** `#16` riwayat penilai — HR; DM hanya bila pemegang kursi (dicek service). */
export const canReadHistoryAsHr = allow('ROLE_HR_MANAGER', 'ROLE_HR_STAFF');

// Menu 4 — Persetujuan Nilai
/** `#30` antrean milik-diri + `#28` putuskan — HRS & EMP bukan entri sidebar (hanya `#29`). */
export const canSeeApprovalQueue = allow('ROLE_HR_MANAGER', 'ROLE_DEPT_MANAGER');
/** `#29` riwayat putaran seluruh company. */
export const canReadRoundsAsHr = allow('ROLE_HR_MANAGER', 'ROLE_HR_STAFF');

/**
 * Jatah Kembalikan = jumlah putaran `RETURNED` pada siklus berjalan (FSD §4.3 F3). Bunyi UIC
 * "`round_no` ≥ kuota" bertentangan dengan dataset `RS-0004` (putaran 1 boleh dikembalikan).
 */
export const returnsUsed = (rounds: { cycleNo: number; outcome: string | null }[], cycleNo: number) =>
  rounds.filter((row) => row.cycleNo === cycleNo && row.outcome === 'RETURNED').length;

/** Gerbang `PF-37`: isian diri terbuka otomatis begitu SELURUH baris berlaku punya nilai awal. */
export const selfAssessmentOpen = (items: { initialValueRecordedAt: string | null }[]) =>
  items.length > 0 && items.every((row) => row.initialValueRecordedAt);
