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
    expect(salaryRangeError('jg-staff', null, null)).toMatch(/required/);
    expect(salaryRangeError('jg-staff', 9000000, 4000000)).toMatch(/cannot be lower/);
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
      costCenterAssignmentMode: 'OPTIONAL',
      sbuAssignmentMode: 'OPTIONAL',
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
  it('Default Group kedua ditolak 409; default lama tidak dimatikan otomatis (FSD-COMPANY 0.38)', async () => {
    await expect(
      companyService.saveGroupStruct({ name: 'Struktur Baru', isDefault: true, finalApproverEmployeeId: '' }),
    ).rejects.toThrow(/409/);
    const structs = await companyService.groupStructs();
    expect(structs.find((row) => row.id === 'gs-main')?.isDefault).toBe(true);
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

describe('grade & class — tangga tingkat (FSD-COMPANY 0.54/0.55)', () => {
  const grade = (name: string, level: string, className = `${name} 1`) => ({
    name,
    level,
    defaultClass: { name: className, salaryRangeFrom: '1000000', salaryRangeTo: '2000000' },
  });

  it('kode server-generated: Grade <tingkat><huruf> menurut urutan dibuat, Class <kode Grade>.<n>', async () => {
    const rows = await companyService.jobGrades();
    const code = (id: string) => rows.find((row) => row.id === id)?.gradeCode;
    expect(code('jg-manager')).toBe('3A');
    expect(code('jg-head')).toBe('3B');
    expect(code('jg-staff-2')).toBe('5A.2');
    // Urut tampil: tingkat, huruf, lalu Class di bawah Grade-nya.
    expect(rows.map((row) => row.gradeCode).slice(0, 3)).toEqual(['1A', '1A.1', '2A']);
  });

  it('Grade baru membawa Class default dalam satu transaksi; setara = nomor tingkat sama', async () => {
    const created = await companyService.createGrade(grade('Chief', '3'));
    expect(created.gradeCode).toBe('3C');
    const rows = await companyService.jobGrades();
    expect(rows.find((row) => row.parentId === created.id)).toMatchObject({ gradeCode: '3C.1', salaryRangeFrom: 1000000 });
  });

  it('menolak Class default tanpa rentang gaji, nama kembar aktif, dan Level bukan angka ≥ 1', async () => {
    await expect(
      companyService.createGrade({ ...grade('Chief', '3'), defaultClass: { name: 'Chief 1', salaryRangeFrom: '', salaryRangeTo: '' } }),
    ).rejects.toThrow(/^422/);
    await expect(companyService.createGrade(grade('Manager', '6'))).rejects.toThrow(/^409/);
    await expect(companyService.createGrade(grade('Chief', '0'))).rejects.toThrow(/Level/);
  });

  it('pindah tingkat lewat Edit Grade menghitung ulang kode Grade setara dan Class-nya', async () => {
    await companyService.updateGrade('jg-manager', { name: 'Manager', level: '4', isActive: true });
    const rows = await companyService.jobGrades();
    const code = (id: string) => rows.find((row) => row.id === id)?.gradeCode;
    expect(code('jg-head')).toBe('3A');
    // Huruf mengikuti urutan dibuat di antara Grade setara, bukan pangkat.
    expect([code('jg-manager'), code('jg-supervisor')].sort()).toEqual(['4A', '4B']);
    expect(code('jg-manager-1')).toBe(`${code('jg-manager')}.1`);
  });

  it('Class wajib Grade aktif dan rentang to ≥ from; Class aktif terakhir tidak dapat dihapus; hapus Grade ikut Class-nya', async () => {
    await expect(
      companyService.saveClass({ name: 'Staff 3', parentId: 'jg-staff-1', salaryRangeFrom: '1', salaryRangeTo: '2', isActive: true }),
    ).rejects.toThrow(/active grade/);
    await expect(
      companyService.saveClass({ name: 'Staff 3', parentId: 'jg-staff', salaryRangeFrom: '9', salaryRangeTo: '2', isActive: true }),
    ).rejects.toThrow(/^422/);
    const added = await companyService.saveClass({ name: 'Staff 3', parentId: 'jg-staff', salaryRangeFrom: '9000000', salaryRangeTo: '12000000', isActive: true });
    expect(added.gradeCode).toBe('5A.3');
    await expect(companyService.deleteJobGrade('jg-manager-1')).rejects.toThrow(/last active class/);
    await companyService.deleteJobGrade('jg-staff');
    const rows = await companyService.jobGrades();
    expect(rows.some((row) => row.id === 'jg-staff' || row.parentId === 'jg-staff')).toBe(false);
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
