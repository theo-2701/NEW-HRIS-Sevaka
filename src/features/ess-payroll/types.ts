/**
 * Employee Self-Service › Payroll — kontrak FSD-001-PAYROLL §4 · UIC-001-PAYROLL §5 ·
 * TSD-001-PAYROLL-0.25 §15.5 · ERD §6.17 / §6.24.
 *
 * Dua menu dalam satu kontrak: Payroll Info (daftar periode yang slipnya sudah tersedia) dan
 * Payslip (rincian slip). Karyawan membuka slipnya sendiri; HR Manager mencari dan membuka slip
 * orang lain, dan setiap pembukaan itu menulis jejak akses.
 */

export type Role = 'ROLE_EMPLOYEE' | 'ROLE_HR_MANAGER';

export interface Actor {
  employeeId: string;
  role: Role;
}

/** `payroll_line_direction` (ERD §6.11A). */
export type LineDirection = 'MENAMBAH' | 'MENGURANGI';

/** Empat kelompok baris slip dengan urutan tetap (ERD §6.17A). */
export type LineGroup = 'group_penghasilan' | 'group_potongan' | 'group_urusan_lain' | 'group_koreksi_bulan_lain';

export interface PayslipLine {
  componentName: string;
  amount: number;
  direction: LineDirection;
  /** Kalimat sebab — turunan saat slip dirakit, bukan kolom tabel. */
  cause: string | null;
  originPeriodLabel: string | null;
  isWageBaseExcludedNote: string | null;
}

/**
 * Bentuk slip untuk layar maupun unduhan, milik sendiri maupun orang lain.
 *
 * `employee_id` **tidak pernah** ada di sini (larangan kontrak) — satu-satunya penunjuk identitas
 * adalah nama dan NIK. Jabatan juga tidak dideklarasikan kontrak.
 */
export interface Payslip {
  periodId: string;
  periodLabel: string;
  employeeName: string;
  employeeNik: string;
  branchName: string;
  costCenterName: string | null;
  sbuName: string | null;
  groupPenghasilan: PayslipLine[];
  groupPotongan: PayslipLine[];
  groupUrusanLain: PayslipLine[];
  groupKoreksiBulanLain: PayslipLine[];
  netAmount: number;
  preparationStatement: string;
  performanceValueStatement: string | null;
  performancePageLink: string | null;
  paymentConfirmationLabel: string;
}

/** Baris Payroll Info — daftar sederhana, bukan grid berkriteria. */
export interface PayslipPeriodRow {
  periodId: string;
  periodLabel: string;
  netAmount: number;
}

/** Grid ringkas hasil hitung untuk HR — satu-satunya tempat `employee_id` boleh tampil. */
export interface PayrollResultRow {
  periodId: string;
  employeeId: string;
  employeeNameSnapshot: string;
  netAmount: number;
  hasOpenFinding: boolean;
}

/** `access_channel` (ERD §6.24) — layar dan unduhan berbobot sama. */
export type AccessChannel = 'LAYAR' | 'UNDUHAN';

/** `log_payslip_access` — hanya lahir saat slip orang lain berhasil disajikan. */
export interface PayslipAccessLog {
  id: string;
  periodId: string;
  targetEmployeeId: string;
  accessChannel: AccessChannel;
  createdBy: string;
  createdAt: string;
}

/** `PREPARED_FULL` / `PREPARED_PARTIAL` — dinyatakan lewat isi slip, bukan penanda status baris. */
export type PreparationMode = 'PREPARED_FULL' | 'PREPARED_PARTIAL';

export const GROUP_LABEL: Record<LineGroup, string> = {
  group_penghasilan: 'Penghasilan',
  group_potongan: 'Potongan',
  group_urusan_lain: 'Urusan lain',
  group_koreksi_bulan_lain: 'Koreksi bulan lain',
};

export const ACCESS_CHANNEL_LABEL: Record<AccessChannel, string> = {
  LAYAR: 'LAYAR',
  UNDUHAN: 'UNDUHAN',
};

export const ROLE_LABEL: Record<Role, string> = {
  ROLE_EMPLOYEE: 'Employee',
  ROLE_HR_MANAGER: 'HR Manager',
};

/** Kalimat kaki slip — payroll menyiapkan angka, bukan menyatakan uang sudah diterima. */
export const PREPARATION_STATEMENT =
  'Angka pada slip ini disiapkan dan tersedia untuk diambil sistem penggajian perusahaan — bukan pernyataan bahwa uang telah diterima.';

export const PAYMENT_CONFIRMATION_LABEL = 'Belum dilaporkan';
