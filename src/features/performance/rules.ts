import type { PerfRole } from '@/features/performance/types';

/**
 * Hak akses per layar — diturunkan dari FSD-001-PERFORMANCE §Matriks Menu/Tab → Peran (tabel C),
 * yang bersumber dari Gate Mapping TSD §13.1. `ROLE_SUPER_ADMIN` = superset seluruh baris.
 *
 * FSD 0.25 (PRF-2610242027 T12): `ROLE_EMPLOYEE` yang menjadi penilai/penyetuju/pemikul hasil alih `KV-4`
 * berhak atas antrean lembar `ASSESSOR`, persetujuan, sanggahan masuk, papan/riwayat orang lain, dan
 * laporan I1/I8 dirinya. Gerbang peran dibuka; server menyaring per hubungan — karyawan biasa melihat
 * daftar kosong, bukan 403.
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
/** `#12` grid Kelola & Browsing (+ `#11` detail) — HRS & DM baca saja. Menu Daftar Induk. */
export const canReadKpi = allow('ROLE_HR_MANAGER', 'ROLE_HR_STAFF', 'ROLE_DEPT_MANAGER');
/** Pemilih baris Daftar Induk di lembar (`E4a`) — EMP juga selama ia penilai lembar (FSD 0.25); menu tetap tersembunyi. */
export const canPickKpi = allow('ROLE_HR_MANAGER', 'ROLE_HR_STAFF', 'ROLE_DEPT_MANAGER', 'ROLE_EMPLOYEE');
/** `#8`/`#9`/`#10` buat · ubah · nonaktifkan. */
export const canWriteKpi = allow('ROLE_HR_MANAGER');

// Menu 3 — Lembar Penilaian
/** `#14` antrean lembar — DM & EMP penilai ber-cakupan `ASSESSOR` (FSD 0.25), HR ber-cakupan `ALL`. */
export const canListSheets = allow('ROLE_HR_MANAGER', 'ROLE_HR_STAFF', 'ROLE_DEPT_MANAGER', 'ROLE_EMPLOYEE');
/** Cakupan `ALL` pada `#14`; DM dipaksa server ke `ASSESSOR`. */
export const canScopeAllSheets = allow('ROLE_HR_MANAGER', 'ROLE_HR_STAFF');
/** Permukaan `SELF` `D1` (`#15` SELF, `#20`–`#23`) — terikat identitas token. */
/** FSD 0.13 (PRF-78): EMP saja, bukan superset SA — SA/DM/HR yang dinilai masuk lewat tautan notifikasi. */
export const hasOwnSheetSurface = (role: PerfRole) => role === 'ROLE_EMPLOYEE';
/** `#16` riwayat penilai — HR; DM hanya bila pemegang kursi (dicek service). */
export const canReadHistoryAsHr = allow('ROLE_HR_MANAGER', 'ROLE_HR_STAFF');

// Menu 4 — Persetujuan Nilai
/** `#30` antrean milik-diri + `#28` putuskan — EMP penyetuju sejak FSD 0.25; HRS hanya `#29`. */
export const canSeeApprovalQueue = allow('ROLE_HR_MANAGER', 'ROLE_DEPT_MANAGER', 'ROLE_EMPLOYEE');
/** `#29` riwayat putaran seluruh company. */
export const canReadRoundsAsHr = allow('ROLE_HR_MANAGER', 'ROLE_HR_STAFF');

/**
 * Jatah Kembalikan = jumlah putaran `RETURNED` pada siklus berjalan (FSD §4.3 F3). Bunyi UIC
 * "`round_no` ≥ kuota" bertentangan dengan dataset `RS-0004` (putaran 1 boleh dikembalikan).
 */
export const returnsUsed = (rounds: { cycleNo: number; outcome: string | null }[], cycleNo: number) =>
  rounds.filter((row) => row.cycleNo === cycleNo && row.outcome === 'RETURNED').length;

// Menu 5 — Sanggahan
/**
 * Tab "Sanggahan saya" (`#31`/`#34`, SELF). Matriks menulis EMP · SA, tetapi persona FSD G0/G1 adalah
 * Budi (DM) — atasan juga karyawan yang punya lembar, jadi DM ikut. Gerbang sesungguhnya: pemilik lembar.
 */
export const hasOwnObjectionSurface = allow('ROLE_EMPLOYEE', 'ROLE_DEPT_MANAGER');
/** `#33` grid "Sanggahan masuk" — DM & EMP pemikul dipaksa holder = dirinya; HR boleh company-wide. */
export const canSearchObjections = allow('ROLE_HR_MANAGER', 'ROLE_HR_STAFF', 'ROLE_DEPT_MANAGER', 'ROLE_EMPLOYEE');
/** Tab HR "Belum dijawab" + riwayat jendela (`#33` tanpa filter holder, `#37`/`#38`). */
export const canSeeHrObjections = allow('ROLE_HR_MANAGER', 'ROLE_HR_STAFF');
/** `#36` buka kembali jendela sanggah. */
export const canReopenWindow = allow('ROLE_HR_MANAGER');

// Menu 6 — Papan Pantau & Laporan
/** `#39`/`#49` permukaan SELF — hanya karyawan (DM/HR tidak punya route `/me/...` di menu ini). */
export const hasOwnBoard = allow('ROLE_EMPLOYEE');
/** `#40`/`#50` papan & riwayat orang lain — DM ber-rantai, EMP sebagai penilai pemegang, HR seluruh company. */
export const canReadOthersBoard = allow('ROLE_HR_MANAGER', 'ROLE_HR_STAFF', 'ROLE_DEPT_MANAGER', 'ROLE_EMPLOYEE');
/** `I1`/`I8` ter-scope ke dirinya (`#41`/`#48`) — atasan dan karyawan penilai/pemikul. */
export const readsOwnReports = allow('ROLE_DEPT_MANAGER', 'ROLE_EMPLOYEE');
/** Enam laporan HRM + HRS (`#42`/`#44`/`#46`/`#47`, plus `#41`/`#48` yang juga terbuka untuk DM). */
export const canReadHrReports = allow('ROLE_HR_MANAGER', 'ROLE_HR_STAFF');
/** Dua laporan HRM saja (`#43` induk tidak-berlaku, `#45` belum bisa dinilai). */
export const canReadManagerReports = allow('ROLE_HR_MANAGER');
/** `#52` Jejak Akses — HR saja, bukan permukaan SELF. */
export const canReadAccessLog = allow('ROLE_HR_MANAGER', 'ROLE_HR_STAFF');

/** Gerbang `PF-37`: isian diri terbuka otomatis begitu SELURUH baris berlaku punya nilai awal. */
export const selfAssessmentOpen = (items: { initialValueRecordedAt: string | null }[]) =>
  items.length > 0 && items.every((row) => row.initialValueRecordedAt);
