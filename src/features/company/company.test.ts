import { beforeEach, describe, expect, it } from 'vitest';
import { companyService, resetCompanyMocks } from '@/features/company/services/company.service';
import { deriveZip, isDescendantNode, isDescendantPosition, salaryRangeError } from '@/features/company/rules';
import type { BranchDraft, CompanyActor } from '@/features/company/types';

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
  taxNpwp: '',
  taxNitku: '',
  taxKlu: '',
  attendanceRadius: '',
  attendanceOnMobile: false,
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
  it('menyimpan cabang baru dengan wilayah hasil kode pos dibekukan di snapshot', async () => {
    const row = await companyService.saveBranch(BRANCH);
    expect(row.zip.timezone).toBe('Asia/Makassar');
    expect(row.zip.province).toBe('Bali');
    expect(row.zip.city).toBe('Denpasar');
    expect(row.parentInfo?.branchName).toBe('Kantor Pusat Jakarta');
    expect(await companyService.branches()).toHaveLength(4);
  });

  it('menyimpan Tax dan Attendance sebagai kolom asli, bukan lagi GAP', async () => {
    const row = await companyService.saveBranch({
      ...BRANCH,
      taxNpwp: '03.111.222.3-000.000',
      attendanceRadius: '75',
      attendanceOnMobile: true,
    });
    expect(row.taxNpwp).toBe('03.111.222.3-000.000');
    expect(row.taxNitku).toBeNull();
    expect(row.attendanceRadius).toBe(75);
    expect(row.attendanceOnMobile).toBe(true);
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

  it('tetap membolehkan Branch Group walau hierarki dimatikan (UIC 0.16 mencabut gerbang mode)', async () => {
    await companyService.saveSetup({
      branchHierarchyMode: 'DISABLED',
      costCenterAssignmentMode: 'ENABLED',
      sbuAssignmentMode: 'ENABLED',
    });
    const groups = await companyService.branchGroups();
    expect(groups.length).toBeGreaterThan(0);
    const created = await companyService.saveBranchGroup({ name: 'Kategori Baru', levelOrder: '9', canViewChildData: false });
    expect(created.name).toBe('Kategori Baru');
  });
});

const SUPER_ADMIN: CompanyActor = { employeeId: 'emp-hesti', label: 'Super Admin', role: 'ROLE_SUPER_ADMIN' };
const HR_MANAGER: CompanyActor = { employeeId: 'emp-maya', label: 'HR Manager', role: 'ROLE_HR_MANAGER' };
const POSITION_BASE = { canSignLetter: false, secondApproverEmployeeId: '' };

describe('group & level — di luar dokumen kontrak', () => {
  it('menyalakan group utama baru mematikan yang lama', async () => {
    const created = await companyService.saveGroupStruct({ name: 'Struktur Baru', isDefault: true, finalApproverEmployeeId: '' });
    expect(created.isDefault).toBe(true);
    const structs = await companyService.groupStructs();
    expect(structs.find((row) => row.id === 'gs-main')?.isDefault).toBe(false);
  });

  it('menolak urutan level kembar dalam satu group dan menghapus level yang masih dipakai posisi', async () => {
    await expect(
      companyService.saveGroupLevel({ groupStructId: 'gs-main', levelName: 'Duplikat', levelOrder: '1' }),
    ).rejects.toThrow(/409/);

    const level = await companyService.saveGroupLevel({ groupStructId: 'gs-main', levelName: 'Cabang', levelOrder: '9' });
    const cleared = await companyService.deleteGroupLevel(level.id);
    expect(cleared.id).toBe(level.id);

    await expect(companyService.deleteGroupLevel('lvl-direksi')).rejects.toThrow(/dipakai posisi/);
  });
});

describe('group structure', () => {
  it('menulis riwayat setiap posisi dibuat dan diubah', async () => {
    const row = await companyService.savePosition(SUPER_ADMIN, {
      ...POSITION_BASE,
      positionName: 'Recruiter',
      groupStructLevelId: 'lvl-unit',
      employeeId: 'emp-dimas',
      parentId: 'pos-hr',
    });
    expect(row.supervisorInfo?.nama).toBe('Maya Anggraini');

    await companyService.savePosition(
      SUPER_ADMIN,
      { ...POSITION_BASE, positionName: 'Recruiter', groupStructLevelId: 'lvl-unit', employeeId: '', parentId: 'pos-hr' },
      row.id,
    );
    const history = await companyService.positionHistory(row.id);
    expect(history.map((log) => log.activity)).toEqual(['U', 'I']);
  });

  it('menolak atasan yang berada pada level lebih dalam', async () => {
    await expect(
      companyService.savePosition(SUPER_ADMIN, {
        ...POSITION_BASE,
        positionName: 'Wakil Direktur',
        groupStructLevelId: 'lvl-direksi',
        employeeId: '',
        parentId: 'pos-payroll',
      }),
    ).rejects.toThrow(/level yang lebih dalam/);
  });

  it('gerbang can_sign_letter dua tangan MENYALAKAN, satu tangan MEMATIKAN', async () => {
    await expect(
      companyService.savePosition(HR_MANAGER, {
        ...POSITION_BASE,
        positionName: 'HR Manager',
        groupStructLevelId: 'lvl-divisi',
        employeeId: 'emp-maya',
        parentId: 'pos-dirut',
        canSignLetter: true,
        secondApproverEmployeeId: 'emp-rudi',
      }, 'pos-hr'),
    ).rejects.toThrow(/403/);

    await expect(
      companyService.savePosition(SUPER_ADMIN, {
        ...POSITION_BASE,
        positionName: 'HR Manager',
        groupStructLevelId: 'lvl-divisi',
        employeeId: 'emp-maya',
        parentId: 'pos-dirut',
        canSignLetter: true,
        secondApproverEmployeeId: SUPER_ADMIN.employeeId,
      }, 'pos-hr'),
    ).rejects.toThrow(/tidak boleh sama dengan pemanggil/);

    await expect(
      companyService.savePosition(SUPER_ADMIN, {
        ...POSITION_BASE,
        positionName: 'HR Manager',
        groupStructLevelId: 'lvl-divisi',
        employeeId: 'emp-maya',
        parentId: 'pos-dirut',
        canSignLetter: true,
        secondApproverEmployeeId: 'emp-maya',
      }, 'pos-hr'),
    ).rejects.toThrow(/harus berperan admin/);

    const on = await companyService.savePosition(SUPER_ADMIN, {
      ...POSITION_BASE,
      positionName: 'HR Manager',
      groupStructLevelId: 'lvl-divisi',
      employeeId: 'emp-maya',
      parentId: 'pos-dirut',
      canSignLetter: true,
      secondApproverEmployeeId: 'emp-rudi',
    }, 'pos-hr');
    expect(on.canSignLetter).toBe(true);

    const off = await companyService.savePosition(SUPER_ADMIN, { ...POSITION_BASE, positionName: 'HR Manager', groupStructLevelId: 'lvl-divisi', employeeId: 'emp-maya', parentId: 'pos-dirut', canSignLetter: false }, 'pos-hr');
    expect(off.canSignLetter).toBe(false);
  });

  it('menolak posisi yang menjadikan turunannya sebagai atasan', async () => {
    expect(
      isDescendantPosition(
        [
          { id: 'pos-hr', parentId: 'pos-dirut' },
          { id: 'pos-payroll', parentId: 'pos-hr' },
        ].map((row) => ({ ...row, positionName: '', groupStructLevelId: '', employeeId: null, employeeInfo: null, supervisorInfo: null, canSignLetter: false, createdAt: '' })),
        'pos-payroll',
        'pos-hr',
      ),
    ).toBe(true);
  });

  it('melepas snapshot atasan pada anak saat pengisi posisi dikosongkan', async () => {
    await companyService.savePosition(
      SUPER_ADMIN,
      { ...POSITION_BASE, positionName: 'HR Manager', groupStructLevelId: 'lvl-divisi', employeeId: '', parentId: 'pos-dirut' },
      'pos-hr',
    );
    const rows = await companyService.positions('gs-main');
    expect(rows.find((row) => row.id === 'pos-payroll')?.supervisorInfo).toBeNull();
  });
});

describe('module group struct map (GS-11)', () => {
  it('menutup baca bagi peran di luar Super Admin/System Admin/HR Manager/Department Manager', async () => {
    await expect(
      companyService.moduleGroupStructMaps({ employeeId: 'emp-ga', label: 'GA Staff', role: 'ROLE_GA_STAFF' }),
    ).rejects.toThrow(/403/);
  });

  it('menolak tulis dari HR Manager, membolehkan upsert dan hapus oleh admin', async () => {
    await expect(
      companyService.saveModuleGroupStructMap(HR_MANAGER, 'DOCUMENT', 'gs-main'),
    ).rejects.toThrow(/403/);

    const saved = await companyService.saveModuleGroupStructMap(SUPER_ADMIN, 'DOCUMENT', 'gs-main');
    expect(saved.groupStructId).toBe('gs-main');

    const cleared = await companyService.clearModuleGroupStructMap(SUPER_ADMIN, 'DOCUMENT');
    const rows = await companyService.moduleGroupStructMaps(SUPER_ADMIN);
    expect(rows.find((row) => row.moduleCode === cleared.moduleCode)).toBeUndefined();
  });

  it('menolak group_struct_id yang tidak menunjuk struktur aktif', async () => {
    await expect(companyService.saveModuleGroupStructMap(SUPER_ADMIN, 'PERFORMANCE', 'gs-tidak-ada')).rejects.toThrow(/404/);
  });
});

describe('grade & class', () => {
  it('menolak Class tanpa rentang gaji', async () => {
    await expect(
      companyService.saveJobGrade({
        name: 'Staff 3',
        parentId: 'jg-staff',
        sortOrder: '3',
        salaryRangeFrom: '',
        salaryRangeTo: '',
      }),
    ).rejects.toThrow(/Rentang gaji wajib/);
  });

  it('menolak rentang gaji pada Grade', async () => {
    await expect(
      companyService.saveJobGrade({
        name: 'Direksi',
        parentId: '',
        sortOrder: '3',
        salaryRangeFrom: '10000000',
        salaryRangeTo: '20000000',
      }),
    ).rejects.toThrow(/hanya milik Class/);
  });

  it('menolak penghapusan Grade yang masih memayungi Class', async () => {
    await expect(companyService.deleteJobGrade('jg-staff')).rejects.toThrow(/Class/);
  });

  it('men-generate kode <level>.<huruf> dan menghitungnya ulang untuk seluruh saudara', async () => {
    const root = await companyService.saveJobGrade({ name: 'Direksi', parentId: '', sortOrder: '3', salaryRangeFrom: '', salaryRangeTo: '' });
    expect(root.gradeCode).toBe('1.C');

    const staff3 = await companyService.saveJobGrade({
      name: 'Staff 3',
      parentId: 'jg-staff',
      sortOrder: '3',
      salaryRangeFrom: '3000000',
      salaryRangeTo: '4000000',
    });
    expect(staff3.gradeCode).toBe('2.C');
    const grades = await companyService.jobGrades();
    expect(grades.find((row) => row.id === 'jg-staff-1')?.gradeCode).toBe('2.A');
    expect(grades.find((row) => row.id === 'jg-staff-2')?.gradeCode).toBe('2.B');
    // Kode boleh duplikat lintas subtree — Manager 1 tetap "2.A" pada grupnya sendiri.
    expect(grades.find((row) => row.id === 'jg-manager-1')?.gradeCode).toBe('2.A');
  });

  it('menolak sortOrder kembar antar saudara sekandung', async () => {
    await expect(
      companyService.saveJobGrade({ name: 'Staff Kembar', parentId: 'jg-staff', sortOrder: '1', salaryRangeFrom: '1', salaryRangeTo: '2' }),
    ).rejects.toThrow(/409/);
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

  it('menutup cost center dan SBU dengan 422 (bukan 403) saat modenya dimatikan', async () => {
    await companyService.saveSetup({
      branchHierarchyMode: 'ENABLED',
      costCenterAssignmentMode: 'DISABLED',
      sbuAssignmentMode: 'DISABLED',
    });
    await expect(companyService.costCenters()).rejects.toThrow(/422/);
    await expect(companyService.sbus()).rejects.toThrow(/422/);
  });

  it('menyimpan vendor dengan surel opsional dan menolak nama yang sudah terdaftar', async () => {
    const row = await companyService.saveVendor({
      vendorName: 'PT Seragam Nusantara',
      address: 'Jl. Tekstil No. 3',
      phone: '08123456789',
      telephone: '',
      email: 'halo@seragamnusantara.co.id',
      vendorType: 'COMPANY',
      picName: 'Bayu',
      picPosition: 'MANAGER',
    });
    expect(row.telephone).toBeNull();
    expect(row.email).toBe('halo@seragamnusantara.co.id');

    await expect(
      companyService.saveVendor({
        vendorName: 'PT Format Salah',
        address: 'Jl. Lain No. 2',
        phone: '08120000001',
        telephone: '',
        email: 'bukan-surel',
        vendorType: 'COMPANY',
        picName: '',
        picPosition: '',
      }),
    ).rejects.toThrow(/format surel/i);

    await expect(
      companyService.saveVendor({
        vendorName: 'pt sumber jaya',
        address: 'Jl. Lain No. 1',
        phone: '08120000000',
        telephone: '',
        email: '',
        vendorType: 'COMPANY',
        picName: '',
        picPosition: '',
      }),
    ).rejects.toThrow(/409/);
  });
});
