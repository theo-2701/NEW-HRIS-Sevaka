import type { Actor, PayslipLine, PreparationMode } from '@/features/ess-payroll/types';

/**
 * Dataset skenario positif UIC-001-PAYROLL §5. Dewi membuka slipnya sendiri; Bambang berstatus
 * SUSPENDED sehingga slipnya disiapkan separuh; Maya membuka slip orang lain dan meninggalkan jejak.
 */

export const VIEWERS: (Actor & { label: string })[] = [
  { employeeId: 'pay-dewi', role: 'ROLE_EMPLOYEE', label: 'Dewi Lestari · Employee' },
  { employeeId: 'pay-bambang', role: 'ROLE_EMPLOYEE', label: 'Bambang Suryono · Employee' },
  { employeeId: 'emp-maya', role: 'ROLE_HR_MANAGER', label: 'Maya Anggraini · HR Manager' },
];

export interface SlipSeed {
  periodId: string;
  employeeId: string;
  mode: PreparationMode;
  /** Persentase penyiapan bila `PREPARED_PARTIAL`. */
  proratePercent: number | null;
  costCenterName: string | null;
  sbuName: string | null;
  hasOpenFinding: boolean;
  earnings: PayslipLine[];
  deductions: PayslipLine[];
}

const plus = (componentName: string, amount: number, cause: string | null = null): PayslipLine => ({
  componentName,
  amount,
  direction: 'MENAMBAH',
  cause,
  originPeriodLabel: null,
  isWageBaseExcludedNote: null,
});

const minus = (componentName: string, amount: number, cause: string | null = null): PayslipLine => ({
  componentName,
  amount,
  direction: 'MENGURANGI',
  cause,
  originPeriodLabel: null,
  isWageBaseExcludedNote: null,
});

export const SLIP_SEED: SlipSeed[] = [
  {
    periodId: 'per-2026-07',
    employeeId: 'pay-dewi',
    mode: 'PREPARED_FULL',
    proratePercent: null,
    costCenterName: 'Marketing',
    sbuName: null,
    hasOpenFinding: false,
    earnings: [
      plus('Gaji Pokok', 4000000),
      plus('Tunjangan Jabatan', 500000),
      plus('Tunjangan Transport', 200000),
    ],
    deductions: [
      minus('BPJS Kesehatan (1%)', 47000, 'Dihitung dari dasar upah yang dibekukan untuk periode ini.'),
      minus('JHT (2%)', 80000),
      minus('Jaminan Pensiun (1%)', 40000),
      minus('PPh21 (TER kategori A)', 44500, 'Status pajak TK/0, dari baris PTKP yang menutupi periode ini.'),
    ],
  },
  {
    periodId: 'per-2026-07',
    employeeId: 'pay-bambang',
    mode: 'PREPARED_PARTIAL',
    proratePercent: 50,
    costCenterName: 'Produksi',
    sbuName: null,
    hasOpenFinding: true,
    earnings: [
      plus('Gaji Pokok', 2900000, 'Disiapkan 50% — status kerja SUSPENDED sejak 16 Juli 2026.'),
      plus('Tunjangan Makan', 100000, 'Mengikuti hari kehadiran yang tercatat.'),
      plus('Uang Lembur', 100000, 'Fakta lembur on-call darurat — tercatat pada temuan NOT_ELIGIBLE_BUT_PAID.'),
    ],
    deductions: [
      minus('BPJS Kesehatan (1%)', 31000),
      minus('JHT (2%)', 62000),
      minus('Jaminan Pensiun (1%)', 31000),
      minus('PPh21 (TER kategori A)', 15500, 'Status pajak diasumsikan TK/0 — baris PTKP belum lengkap (TAX_STATUS_ASSUMED).'),
    ],
  },
  {
    // Periode Agustus masih LOCKED: barisnya ada, tapi slipnya belum boleh dibuka.
    periodId: 'per-2026-08',
    employeeId: 'pay-bambang',
    mode: 'PREPARED_FULL',
    proratePercent: null,
    costCenterName: 'Produksi',
    sbuName: null,
    hasOpenFinding: false,
    earnings: [plus('Gaji Pokok', 5800000)],
    deductions: [minus('BPJS Kesehatan (1%)', 58000), minus('PPh21 (TER kategori A)', 87000)],
  },
];
