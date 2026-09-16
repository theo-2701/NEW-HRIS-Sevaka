import { beforeEach, describe, expect, it } from 'vitest';
import { companyService, resetCompanyMocks } from '@/features/company/services/company.service';
import { deriveZip, isDescendantNode, isDescendantPosition, salaryRangeError } from '@/features/company/rules';
import type { BranchDraft } from '@/features/company/types';

const BRANCH: BranchDraft = {
  branchName: 'Cabang Denpasar',
  branchCode: 'BR-DPS-01',
  branchGroupId: 'bg-cabang',
  parentId: 'br-jkt',
  address: 'Jl. Sunset Road No. 9',
  phone: '+62361123456',
  zip: '80228',
  regionalWage: '2996561',
  workDaysPerWeek: '5',
  workHoursPerDay: '8',
  lateToleranceMinutes: '10',
  latitude: '',
  longitude: '',
};

beforeEach(() => resetCompanyMocks());

describe('rules', () => {
  it('menurunkan provinsi, kota, dan zona waktu dari kode pos', () => {
    expect(deriveZip('80228')).toEqual({
      province: 'Bali',
      city: 'Denpasar',
      timezone: 'Asia/Makassar',
      known: true,
    });
    expect(deriveZip('99999').known).toBe(false);
  });

  it('mewajibkan rentang gaji hanya untuk Class', () => {
    expect(salaryRangeError('', null, null)).toBeNull();
    expect(salaryRangeError('jg-staff', null, null)).toMatch(/wajib diisi/);
    expect(salaryRangeError('jg-staff', 9000000, 4000000)).toMatch(/lebih kecil/);
    expect(salaryRangeError('jg-staff', 4000000, 9000000)).toBeNull();
  });

  it('mengenali keturunan pada rantai posisi dan pada hierarki bernomor induk', () => {
    const positions = [
      { id: 'a', parentId: null },
      { id: 'b', parentId: 'a' },
      { id: 'c', parentId: 'b' },
    ];
    expect(isDescendantNode(positions, 'c', 'a')).toBe(true);
    expect(isDescendantNode(positions, 'a', 'c')).toBe(false);
  });
});

describe('branch', () => {
  it('menyimpan cabang baru dengan zona waktu hasil kode pos', async () => {
    const row = await companyService.saveBranch(BRANCH);
    expect(row.zip.timezone).toBe('Asia/Makassar');
    expect(row.parentInfo?.branchName).toBe('Kantor Pusat Jakarta');
    expect(await companyService.branches()).toHaveLength(4);
  });

  it('menolak kode cabang yang sudah dipakai cabang aktif', async () => {
    await expect(companyService.saveBranch({ ...BRANCH, branchCode: 'BR-JKT-01' })).rejects.toThrow(/409/);
  });

  it('menolak kode pos di luar data wilayah', async () => {
    await expect(companyService.saveBranch({ ...BRANCH, zip: '99999' })).rejects.toThrow(/kode pos/i);
  });

  it('menolak perubahan kode cabang', async () => {
    await expect(companyService.saveBranch({ ...BRANCH, branchCode: 'BR-BARU' }, 'br-bdg')).rejects.toThrow(
      /tidak bisa diubah/,
    );
  });

  it('menolak penghapusan cabang yang masih menjadi induk', async () => {
    await expect(companyService.deleteBranch('br-jkt')).rejects.toThrow(/induk/);
  });

  it('menutup menu kategori cabang saat hierarki dimatikan', async () => {
    await companyService.saveSetup({
      branchHierarchyMode: 'DISABLED',
      costCenterAssignmentMode: 'ENABLED',
      sbuAssignmentMode: 'ENABLED',
    });
    await expect(companyService.branchGroups()).rejects.toThrow(/403/);
  });
});

describe('group structure', () => {
  it('menulis riwayat setiap posisi dibuat dan diubah', async () => {
    const row = await companyService.savePosition({
      positionName: 'Recruiter',
      groupStructLevelId: 'lvl-unit',
      employeeId: 'emp-dimas',
      parentId: 'pos-hr',
    });
    expect(row.supervisorInfo?.nama).toBe('Maya Anggraini');

    await companyService.savePosition(
      { positionName: 'Recruiter', groupStructLevelId: 'lvl-unit', employeeId: '', parentId: 'pos-hr' },
      row.id,
    );
    const history = await companyService.positionHistory(row.id);
    expect(history.map((log) => log.activity)).toEqual(['U', 'I']);
  });

  it('menolak atasan yang berada pada level lebih dalam', async () => {
    await expect(
      companyService.savePosition({
        positionName: 'Wakil Direktur',
        groupStructLevelId: 'lvl-direksi',
        employeeId: '',
        parentId: 'pos-payroll',
      }),
    ).rejects.toThrow(/level yang lebih dalam/);
  });

  it('menolak posisi yang menjadikan turunannya sebagai atasan', async () => {
    expect(
      isDescendantPosition(
        [
          { id: 'pos-hr', parentId: 'pos-dirut' },
          { id: 'pos-payroll', parentId: 'pos-hr' },
        ].map((row) => ({ ...row, positionName: '', groupStructLevelId: '', employeeId: null, employeeInfo: null, supervisorInfo: null, createdAt: '' })),
        'pos-payroll',
        'pos-hr',
      ),
    ).toBe(true);
  });

  it('melepas snapshot atasan pada anak saat pengisi posisi dikosongkan', async () => {
    await companyService.savePosition(
      { positionName: 'HR Manager', groupStructLevelId: 'lvl-divisi', employeeId: '', parentId: 'pos-dirut' },
      'pos-hr',
    );
    const rows = await companyService.positions('gs-main');
    expect(rows.find((row) => row.id === 'pos-payroll')?.supervisorInfo).toBeNull();
  });
});

describe('grade & class', () => {
  it('menolak Class tanpa rentang gaji', async () => {
    await expect(
      companyService.saveJobGrade({
        name: 'Staff 3',
        gradeCode: 'S.3',
        parentId: 'jg-staff',
        salaryRangeFrom: '',
        salaryRangeTo: '',
      }),
    ).rejects.toThrow(/Rentang gaji wajib/);
  });

  it('menolak rentang gaji pada Grade', async () => {
    await expect(
      companyService.saveJobGrade({
        name: 'Direksi',
        gradeCode: 'D',
        parentId: '',
        salaryRangeFrom: '10000000',
        salaryRangeTo: '20000000',
      }),
    ).rejects.toThrow(/hanya milik Class/);
  });

  it('menolak penghapusan Grade yang masih memayungi Class', async () => {
    await expect(companyService.deleteJobGrade('jg-staff')).rejects.toThrow(/Class/);
  });
});

describe('cost center, sbu, dan vendor', () => {
  it('menolak kode cost center kembar dan perubahan kodenya', async () => {
    await expect(
      companyService.saveCostCenter({
        code: 'CC-OPS-01',
        name: 'Duplikat',
        costCenterCategoryId: 'ccc-ops',
        parentId: '',
        responsibleEmployeeId: '',
        annualBudget: '',
      }),
    ).rejects.toThrow(/409/);

    await expect(
      companyService.saveCostCenter(
        {
          code: 'CC-OPS-99',
          name: 'Operasional Bandung',
          costCenterCategoryId: 'ccc-ops',
          parentId: '',
          responsibleEmployeeId: '',
          annualBudget: '',
        },
        'cc-ops-02',
      ),
    ).rejects.toThrow(/tidak bisa diubah/);
  });

  it('menutup cost center dan SBU saat modenya dimatikan', async () => {
    await companyService.saveSetup({
      branchHierarchyMode: 'ENABLED',
      costCenterAssignmentMode: 'DISABLED',
      sbuAssignmentMode: 'DISABLED',
    });
    await expect(companyService.costCenters()).rejects.toThrow(/403/);
    await expect(companyService.sbus()).rejects.toThrow(/403/);
  });

  it('menyimpan vendor dan menolak nama yang sudah terdaftar', async () => {
    const row = await companyService.saveVendor({
      vendorName: 'PT Seragam Nusantara',
      address: 'Jl. Tekstil No. 3',
      phone: '08123456789',
      telephone: '',
      vendorType: 'COMPANY',
      picName: 'Bayu',
      picPosition: 'MANAGER',
    });
    expect(row.telephone).toBeNull();

    await expect(
      companyService.saveVendor({
        vendorName: 'pt sumber jaya',
        address: 'Jl. Lain No. 1',
        phone: '08120000000',
        telephone: '',
        vendorType: 'COMPANY',
        picName: '',
        picPosition: '',
      }),
    ).rejects.toThrow(/409/);
  });
});
