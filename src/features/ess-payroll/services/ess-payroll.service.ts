import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import { EMPLOYEES, employeeName } from '@/features/salary-processing/mock-data';
import { periodLabel, periodName } from '@/features/salary-processing/rules';
import { salaryProcessingService } from '@/features/salary-processing/services/salary-processing.service';
import { SLIP_SEED } from '@/features/ess-payroll/mock-data';
import type { SlipSeed } from '@/features/ess-payroll/mock-data';
import {
  PAYMENT_CONFIRMATION_LABEL,
  PREPARATION_STATEMENT,
} from '@/features/ess-payroll/types';
import type {
  AccessChannel,
  Actor,
  Payslip,
  PayslipAccessLog,
  PayslipPeriodRow,
  PayrollResultRow,
} from '@/features/ess-payroll/types';

/**
 * API service ESS Payroll (UIC-001-PAYROLL §5).
 *
 * Endpoint kontrak: `#39` daftar periode · `#40`/`#41` slip sendiri layar dan unduhan ·
 * `#42` grid hasil hitung HR · `#43`/`#44` slip orang lain layar dan unduhan.
 * Jejak akses hanya ditulis pada jalur slip orang lain, dan hanya bila penyajiannya berhasil.
 */
const delay = (ms = 220) => new Promise((resolve) => setTimeout(resolve, ms));
const now = () => new Date().toISOString();

let accessLogs: PayslipAccessLog[] = [];
let assemblyFails = false;
let sequence = 0;

export function resetEssPayrollMocks() {
  accessLogs = [];
  assemblyFails = false;
  sequence = 0;
}

/** Hanya untuk pengujian jalur unduhan yang ketat: memaksa perakitan slip gagal. */
export function setPayslipAssemblyFailure(failing: boolean) {
  assemblyFails = failing;
}

const seedOf = (periodId: string, employeeId: string): SlipSeed | undefined =>
  SLIP_SEED.find((row) => row.periodId === periodId && row.employeeId === employeeId);

const netOf = (seed: SlipSeed) =>
  seed.earnings.reduce((total, row) => total + row.amount, 0) -
  seed.deductions.reduce((total, row) => total + row.amount, 0);

async function periodOrThrow(periodId: string) {
  const periods = await salaryProcessingService.searchPeriods();
  const period = periods.find((row) => row.id === periodId);
  if (!period) throw new Error('404 NOT_FOUND — periode tidak ditemukan.');
  return period;
}

function buildPayslip(seed: SlipSeed, label: string): Payslip {
  const employee = EMPLOYEES[seed.employeeId];
  return {
    periodId: seed.periodId,
    periodLabel: label,
    employeeName: employee?.name ?? seed.employeeId,
    employeeNik: employee?.nik ?? '—',
    branchName: employee?.branch ?? '—',
    costCenterName: seed.costCenterName,
    sbuName: seed.sbuName,
    groupPenghasilan: seed.earnings.map((row) => ({ ...row })),
    groupPotongan: seed.deductions.map((row) => ({ ...row })),
    groupUrusanLain: [],
    groupKoreksiBulanLain: [],
    netAmount: netOf(seed),
    preparationStatement: PREPARATION_STATEMENT,
    performanceValueStatement: null,
    performancePageLink: null,
    paymentConfirmationLabel: PAYMENT_CONFIRMATION_LABEL,
  };
}

function writeAccessLog(actor: Actor, periodId: string, targetEmployeeId: string, channel: AccessChannel) {
  const row: PayslipAccessLog = {
    id: `acc-${String((sequence += 1)).padStart(4, '0')}`,
    periodId,
    targetEmployeeId,
    accessChannel: channel,
    createdBy: actor.employeeId,
    createdAt: now(),
  };
  accessLogs.push(row);
  return row;
}

export const essPayrollService = {
  /** `#39` — daftar periode milik pemanggil; hanya periode yang sudah diserahkan yang muncul. */
  async myPeriods(actor: Actor): Promise<PayslipPeriodRow[]> {
    if (MOCK) {
      await delay();
      const periods = await salaryProcessingService.searchPeriods({ statuses: ['HANDED_OVER'] });
      return periods
        .map((period) => {
          const seed = seedOf(period.id, actor.employeeId);
          return seed
            ? { periodId: period.id, periodLabel: periodName(period), netAmount: netOf(seed) }
            : null;
        })
        .filter((row): row is PayslipPeriodRow => row !== null);
    }
    const { data } = await api.get<{ data: PayslipPeriodRow[] }>('/payroll/ess/payslip/periods');
    return data.data;
  },

  /**
   * `#40` — slip sendiri di layar. Periode yang belum diserahkan dianggap belum punya relasi
   * bagi pemiliknya sendiri, jadi dijawab 404, bukan 422.
   */
  async myPayslip(actor: Actor, periodId: string): Promise<Payslip> {
    if (MOCK) {
      await delay(260);
      const period = await periodOrThrow(periodId);
      const seed = seedOf(periodId, actor.employeeId);
      if (!seed || period.status !== 'HANDED_OVER') {
        throw new Error('404 NOT_FOUND — slip periode ini belum tersedia untuk Anda.');
      }
      return buildPayslip(seed, periodName(period));
    }
    const { data } = await api.get<Payslip>(`/payroll/ess/payslip/${periodId}`);
    return data;
  },

  /**
   * `#41` — slip sendiri untuk diunduh. Jalur unduhan bersifat ketat: medan yang gagal dirakit
   * menolak permintaan, berbeda dari layar yang tetap menampilkan apa adanya. Nol jejak akses.
   */
  async myPayslipDownload(actor: Actor, periodId: string): Promise<Payslip> {
    if (MOCK) {
      await delay(300);
      const slip = await this.myPayslip(actor, periodId);
      if (assemblyFails) {
        throw new Error('422 PAY_PAYSLIP_ASSEMBLY_INCOMPLETE — ada medan slip yang gagal dirakit.');
      }
      return slip;
    }
    const { data } = await api.get<Payslip>(`/payroll/ess/payslip/${periodId}/download`);
    return data;
  },

  /** `#42` — grid ringkas hasil hitung; satu-satunya tempat `employee_id` boleh tampil. */
  async searchResults(actor: Actor, periodId: string): Promise<PayrollResultRow[]> {
    if (MOCK) {
      await delay();
      if (actor.role !== 'ROLE_HR_MANAGER') {
        throw new Error('403 — hasil hitung seluruh karyawan hanya untuk HR Manager.');
      }
      await periodOrThrow(periodId);
      return SLIP_SEED.filter((row) => row.periodId === periodId).map((seed) => ({
        periodId: seed.periodId,
        employeeId: seed.employeeId,
        employeeNameSnapshot: employeeName(seed.employeeId),
        netAmount: netOf(seed),
        hasOpenFinding: seed.hasOpenFinding,
      }));
    }
    const { data } = await api.post<{ data: PayrollResultRow[] }>(`/payroll/period/${periodId}/result/search`, {});
    return data.data;
  },

  /**
   * `#43` — slip orang lain di layar. Karyawan tidak boleh mencapai jalur ini. Baris yang ada tapi
   * periodenya belum diserahkan dijawab 422; penyajian yang berhasil menulis jejak akses LAYAR.
   */
  async employeePayslip(actor: Actor, periodId: string, employeeId: string): Promise<Payslip> {
    if (MOCK) {
      await delay(280);
      if (actor.role !== 'ROLE_HR_MANAGER') {
        throw new Error('403 — membuka slip karyawan lain hanya untuk HR Manager.');
      }
      const period = await periodOrThrow(periodId);
      const seed = seedOf(periodId, employeeId);
      if (!seed) throw new Error('404 NOT_FOUND — tidak ada hasil hitung untuk karyawan pada periode ini.');
      if (period.status !== 'HANDED_OVER') {
        throw new Error('422 PAY_PAYSLIP_NOT_YET_AVAILABLE — periode ini belum diserahkan.');
      }
      const slip = buildPayslip(seed, periodName(period));
      writeAccessLog(actor, periodId, employeeId, 'LAYAR');
      return slip;
    }
    const { data } = await api.get<Payslip>(`/payroll/period/${periodId}/employee/${employeeId}/payslip`);
    return data;
  },

  /**
   * `#44` — slip orang lain untuk diunduh. Sama seperti `#43` ditambah jalur ketat: bila perakitan
   * gagal, permintaan ditolak dan nol jejak ditulis.
   */
  async employeePayslipDownload(actor: Actor, periodId: string, employeeId: string): Promise<Payslip> {
    if (MOCK) {
      await delay(320);
      if (actor.role !== 'ROLE_HR_MANAGER') {
        throw new Error('403 — mengunduh slip karyawan lain hanya untuk HR Manager.');
      }
      const period = await periodOrThrow(periodId);
      const seed = seedOf(periodId, employeeId);
      if (!seed) throw new Error('404 NOT_FOUND — tidak ada hasil hitung untuk karyawan pada periode ini.');
      if (period.status !== 'HANDED_OVER') {
        throw new Error('422 PAY_PAYSLIP_NOT_YET_AVAILABLE — periode ini belum diserahkan.');
      }
      if (assemblyFails) {
        throw new Error('422 PAY_PAYSLIP_ASSEMBLY_INCOMPLETE — ada medan slip yang gagal dirakit.');
      }
      const slip = buildPayslip(seed, periodName(period));
      writeAccessLog(actor, periodId, employeeId, 'UNDUHAN');
      return slip;
    }
    const { data } = await api.get<Payslip>(`/payroll/period/${periodId}/employee/${employeeId}/payslip/download`);
    return data;
  },

  /**
   * Jejak akses yang tertulis di sesi ini. Peninjauan jejak seutuhnya (`#45`) adalah kewenangan
   * Super Admin dan belum punya layar sendiri di kontrak.
   */
  async sessionAccessLogs(): Promise<PayslipAccessLog[]> {
    if (MOCK) {
      await delay(120);
      return accessLogs.map((row) => ({ ...row })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return [];
  },

  /** Periode yang tersedia untuk pencarian HR — dipakai pemilih periode di layar Payslip. */
  async selectablePeriods(): Promise<{ id: string; label: string }[]> {
    const periods = await salaryProcessingService.searchPeriods();
    return periods
      .filter((period) => SLIP_SEED.some((seed) => seed.periodId === period.id))
      .map((period) => ({ id: period.id, label: `${periodLabel(period)} · ${periodName(period)}` }));
  },
};
