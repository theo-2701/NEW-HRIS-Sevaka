import { beforeEach, describe, expect, it } from 'vitest';
import {
  essPayrollService as service,
  resetEssPayrollMocks,
  setPayslipAssemblyFailure,
} from '@/features/ess-payroll/services/ess-payroll.service';
import { resetSalaryProcessingMocks } from '@/features/salary-processing/services/salary-processing.service';
import { VIEWERS } from '@/features/ess-payroll/mock-data';

const DEWI = VIEWERS[0];
const BAMBANG = VIEWERS[1];
const MAYA = VIEWERS[2];

beforeEach(() => {
  resetSalaryProcessingMocks();
  resetEssPayrollMocks();
});

describe('ESS Payroll — Payroll Info (UIC §5.1)', () => {
  it('hanya periode yang sudah diserahkan dan punya hasil hitung milik pemanggil', async () => {
    const rows = await service.myPeriods(DEWI);
    expect(rows).toEqual([{ periodId: 'per-2026-07', periodLabel: 'July 2026', netAmount: 4488500 }]);
  });

  it('periode yang belum diserahkan tidak muncul walau barisnya ada', async () => {
    const rows = await service.myPeriods(BAMBANG);
    expect(rows.map((row) => row.periodId)).toEqual(['per-2026-07']);
  });
});

describe('ESS Payroll — slip sendiri (UIC §5.2–§5.3)', () => {
  it('slip sendiri tidak pernah memuat id karyawan dan memakai urutan kelompok tetap', async () => {
    const slip = await service.myPayslip(DEWI, 'per-2026-07');
    expect(Object.keys(slip)).not.toContain('employeeId');
    expect(slip).toMatchObject({ employeeName: 'Dewi Lestari', netAmount: 4488500 });
    expect(slip.groupPenghasilan).toHaveLength(3);
    expect(slip.groupPotongan).toHaveLength(4);
    expect(slip.groupUrusanLain).toEqual([]);
  });

  it('periode yang belum diserahkan dijawab 404 bagi pemiliknya sendiri', async () => {
    await expect(service.myPayslip(BAMBANG, 'per-2026-08')).rejects.toThrow(/404/);
  });

  it('unduhan slip sendiri bersifat ketat dan tidak menulis jejak akses', async () => {
    const slip = await service.myPayslipDownload(DEWI, 'per-2026-07');
    expect(slip.netAmount).toBe(4488500);
    expect(await service.sessionAccessLogs()).toHaveLength(0);

    setPayslipAssemblyFailure(true);
    await expect(service.myPayslipDownload(DEWI, 'per-2026-07')).rejects.toThrow(
      /PAY_PAYSLIP_ASSEMBLY_INCOMPLETE/,
    );
    // Layar tetap toleran walau perakitan bermasalah.
    await expect(service.myPayslip(DEWI, 'per-2026-07')).resolves.toMatchObject({ netAmount: 4488500 });
  });
});

describe('ESS Payroll — slip orang lain (UIC §5.4–§5.6)', () => {
  it('grid hasil hitung hanya untuk HR Manager dan memang menampilkan id karyawan', async () => {
    await expect(service.searchResults(DEWI, 'per-2026-07')).rejects.toThrow(/403/);
    const rows = await service.searchResults(MAYA, 'per-2026-07');
    expect(rows.map((row) => row.employeeNameSnapshot)).toEqual(['Dewi Lestari', 'Bambang Suryono']);
    expect(rows[1]).toMatchObject({ employeeId: 'pay-bambang', netAmount: 2960500, hasOpenFinding: true });
    expect(await service.sessionAccessLogs()).toHaveLength(0);
  });

  it('karyawan tidak bisa membuka slip orang lain', async () => {
    await expect(service.employeePayslip(DEWI, 'per-2026-07', 'pay-bambang')).rejects.toThrow(/403/);
  });

  it('membuka slip orang lain menulis jejak LAYAR, mengunduhnya menulis jejak UNDUHAN', async () => {
    const slip = await service.employeePayslip(MAYA, 'per-2026-07', 'pay-bambang');
    expect(slip).toMatchObject({ employeeName: 'Bambang Suryono', netAmount: 2960500 });
    expect(slip.groupPenghasilan[0].cause).toMatch(/50%/);

    await service.employeePayslipDownload(MAYA, 'per-2026-07', 'pay-bambang');
    const logs = await service.sessionAccessLogs();
    expect(logs.map((row) => row.accessChannel).sort()).toEqual(['LAYAR', 'UNDUHAN']);
    expect(logs.every((row) => row.createdBy === 'emp-maya' && row.targetEmployeeId === 'pay-bambang')).toBe(true);
  });

  it('baris yang ada tapi periodenya belum diserahkan ditolak 422', async () => {
    await expect(service.employeePayslip(MAYA, 'per-2026-08', 'pay-bambang')).rejects.toThrow(
      /PAY_PAYSLIP_NOT_YET_AVAILABLE/,
    );
    expect(await service.sessionAccessLogs()).toHaveLength(0);
  });

  it('unduhan yang gagal dirakit tidak meninggalkan jejak sama sekali', async () => {
    setPayslipAssemblyFailure(true);
    await expect(service.employeePayslipDownload(MAYA, 'per-2026-07', 'pay-bambang')).rejects.toThrow(
      /PAY_PAYSLIP_ASSEMBLY_INCOMPLETE/,
    );
    expect(await service.sessionAccessLogs()).toHaveLength(0);
  });

  it('karyawan tanpa hasil hitung pada periode itu dijawab 404', async () => {
    await expect(service.employeePayslip(MAYA, 'per-2026-06', 'pay-dewi')).rejects.toThrow(/404/);
  });
});
