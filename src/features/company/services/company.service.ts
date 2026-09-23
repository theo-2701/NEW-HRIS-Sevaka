import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import {
  BRANCH_GROUP_SEED,
  BRANCH_SEED,
  COST_CENTER_CATEGORY_SEED,
  COST_CENTER_SEED,
  GROUP_LEVEL_SEED,
  GROUP_POSITION_SEED,
  GROUP_STRUCT_SEED,
  JOB_GRADE_SEED,
  PEOPLE,
  POSITION_LOG_SEED,
  SBU_GROUP_SEED,
  SBU_SEED,
  SETUP_SEED,
  VENDOR_SEED,
} from '@/features/company/mock-data';
import {
  computeGradeCode,
  deriveZip,
  isDescendantNode,
  isDescendantPosition,
  parentLevelError,
  parseInteger,
  parseNumber,
  salaryRangeError,
} from '@/features/company/rules';
import type {
  Branch,
  BranchDraft,
  BranchGroup,
  BranchGroupDraft,
  CompanySetup,
  CostCenter,
  CostCenterCategory,
  CostCenterDraft,
  GroupLevel,
  GroupPosition,
  GroupStruct,
  JobGrade,
  JobGradeDraft,
  PersonSnapshot,
  PositionActivity,
  PositionLog,
  Sbu,
  SbuDraft,
  SbuGroup,
  SetupMode,
  Vendor,
  VendorDraft,
} from '@/features/company/types';

/**
 * API service Settings › Company (UIC-001-COMPANY-0.9 §2).
 *
 * Enam menu master data dengan pola yang sama: kode unik antar baris aktif menolak 409, isian
 * yang tidak sah menolak 422, penghapusan bersifat lunak, dan menu yang dimatikan Company Setup
 * menolak 403.
 */
const delay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));
const now = () => new Date().toISOString();

let setup: CompanySetup = { ...SETUP_SEED };
let branchGroups: BranchGroup[] = [];
let branches: Branch[] = [];
let groupStructs: GroupStruct[] = [];
let groupLevels: GroupLevel[] = [];
let positions: GroupPosition[] = [];
let positionLogs: PositionLog[] = [];
let jobGrades: JobGrade[] = [];
let costCenterCategories: CostCenterCategory[] = [];
let costCenters: CostCenter[] = [];
let sbuGroups: SbuGroup[] = [];
let sbus: Sbu[] = [];
let vendors: Vendor[] = [];
let sequence = 0;

export function resetCompanyMocks() {
  setup = { ...SETUP_SEED };
  branchGroups = BRANCH_GROUP_SEED.map((row) => ({ ...row }));
  branches = BRANCH_SEED.map((row) => ({ ...row, zip: { ...row.zip }, parentInfo: row.parentInfo ? { ...row.parentInfo } : null }));
  groupStructs = GROUP_STRUCT_SEED.map((row) => ({ ...row }));
  groupLevels = GROUP_LEVEL_SEED.map((row) => ({ ...row }));
  positions = GROUP_POSITION_SEED.map((row) => ({ ...row }));
  positionLogs = POSITION_LOG_SEED.map((row) => ({ ...row }));
  jobGrades = JOB_GRADE_SEED.map((row) => ({ ...row }));
  costCenterCategories = COST_CENTER_CATEGORY_SEED.map((row) => ({ ...row }));
  costCenters = COST_CENTER_SEED.map((row) => ({ ...row }));
  sbuGroups = SBU_GROUP_SEED.map((row) => ({ ...row }));
  sbus = SBU_SEED.map((row) => ({ ...row }));
  vendors = VENDOR_SEED.map((row) => ({ ...row }));
  sequence = 0;
}
resetCompanyMocks();

const nextId = (prefix: string) => `${prefix}-${(sequence += 1).toString(36)}${Date.now().toString(36).slice(-4)}`;

const snapshotOf = (employeeId: string | null): PersonSnapshot | null => {
  if (!employeeId) return null;
  const person = PEOPLE[employeeId];
  return person ? { employeeId, nama: person.nama, nik: person.nik } : null;
};

/**
 * Cost Center dan SBU menolak `422` saat modenya `DISABLED` (`VAL-HRIS-069`/`070`,
 * UIC-COMPANY 0.10, dibuktikan live lewat `guardCostCenterModule()`/`guardSbuModule()`).
 * **Branch Group TIDAK memakai gerbang ini** — UIC-COMPANY 0.16 mencabut janji error mode untuk
 * Branch Group: API-nya tetap hidup berapa pun `BRANCH_HIERARCHY_MODE`-nya (`branch_group_id`
 * tetap wajib dirujuk tiap cabang), hanya visibilitas menu yang diatur mode itu di UI.
 */
function requireMode(mode: SetupMode, menu: string) {
  if (mode !== 'ENABLED') throw new Error(`422 — menu ${menu} dimatikan pada Company Setup perusahaan ini.`);
}

/**
 * `grade_code` server-generated (`T49`, `ERD-001-COMPANY` §7.7.1) — dihitung ulang untuk
 * SELURUH baris aktif sesama `parentId` (level = kedalaman, root = 1) tiap kali ada baris
 * dibuat/dipindah induk/diurutkan ulang/dihapus. Duplikat kode lintas subtree memang disengaja.
 */
function recomputeGradeCodes(parentId: string | null) {
  const level = parentId === null ? 1 : 2;
  const siblings = jobGrades.filter((row) => row.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder);
  siblings.forEach((row, index) => {
    row.gradeCode = computeGradeCode(level, index + 1);
  });
}

function writePositionLog(position: GroupPosition, activity: PositionActivity, note: string) {
  positionLogs.push({
    id: nextId('log'),
    positionId: position.id,
    positionName: position.positionName,
    activity,
    note,
    createdBy: 'emp-maya',
    createdAt: now(),
  });
}

export const companyService = {
  async setup(): Promise<CompanySetup> {
    if (MOCK) {
      await delay(80);
      return { ...setup };
    }
    const { data } = await api.get<CompanySetup>('/company/setup');
    return data;
  },

  /** Hanya untuk mencoba varian tampilan Company Setup di mode dummy. */
  async saveSetup(next: CompanySetup): Promise<CompanySetup> {
    await delay(120);
    setup = { ...next };
    return { ...setup };
  },

  // ---------- Branch Group ----------

  async branchGroups(): Promise<BranchGroup[]> {
    if (MOCK) {
      await delay();
      return branchGroups.map((row) => ({ ...row })).sort((a, b) => a.levelOrder - b.levelOrder);
    }
    const { data } = await api.post<{ data: BranchGroup[] }>('/branch-groups/search', {});
    return data.data;
  },

  async saveBranchGroup(draft: BranchGroupDraft, id?: string): Promise<BranchGroup> {
    if (MOCK) {
      await delay(240);
      const name = draft.name.trim();
      const levelOrder = parseInteger(draft.levelOrder);
      if (!name) throw new Error('422 VALIDATION_ERROR — nama kategori wajib diisi.');
      if (levelOrder === null || levelOrder < 1) throw new Error('422 VALIDATION_ERROR — urutan level wajib angka mulai 1.');
      if (branchGroups.some((row) => row.id !== id && row.name.toLowerCase() === name.toLowerCase())) {
        throw new Error(`409 — kategori bernama ${name} sudah ada.`);
      }
      if (branchGroups.some((row) => row.id !== id && row.levelOrder === levelOrder)) {
        throw new Error(`409 — urutan level ${levelOrder} sudah dipakai kategori lain.`);
      }
      if (id) {
        const row = branchGroups.find((item) => item.id === id);
        if (!row) throw new Error('404 NOT_FOUND — kategori tidak ditemukan.');
        Object.assign(row, { name, levelOrder, canViewChildData: draft.canViewChildData });
        return { ...row };
      }
      const row: BranchGroup = {
        id: nextId('bg'),
        name,
        levelOrder,
        canViewChildData: draft.canViewChildData,
        isActive: true,
        createdAt: now(),
      };
      branchGroups.push(row);
      return { ...row };
    }
    const { data } = await api.post<BranchGroup>('/branch-groups', draft);
    return data;
  },

  async deleteBranchGroup(id: string): Promise<{ id: string }> {
    if (MOCK) {
      await delay(200);
      if (branches.some((row) => row.branchGroupId === id)) {
        throw new Error('409 — kategori ini masih dipakai cabang yang aktif.');
      }
      branchGroups = branchGroups.filter((row) => row.id !== id);
      return { id };
    }
    const { data } = await api.delete<{ id: string }>(`/branch-groups/${id}`);
    return data;
  },

  // ---------- Branch ----------

  async branches(search = ''): Promise<Branch[]> {
    if (MOCK) {
      await delay();
      const query = search.trim().toLowerCase();
      return branches
        .filter((row) => !query || row.branchName.toLowerCase().includes(query))
        .map((row) => ({ ...row }))
        .sort((a, b) => a.branchName.localeCompare(b.branchName));
    }
    const { data } = await api.post<{ data: Branch[] }>('/branches/search', { filters: { branch_name: search } });
    return data.data;
  },

  /** Kode cabang unik antar baris aktif, dan tidak bisa diubah setelah dibuat. */
  async saveBranch(draft: BranchDraft, id?: string): Promise<Branch> {
    if (MOCK) {
      await delay(280);
      const code = draft.branchCode.trim().toUpperCase();
      const name = draft.branchName.trim();
      if (!name) throw new Error('422 VALIDATION_ERROR — nama cabang wajib diisi.');
      if (!code) throw new Error('422 VALIDATION_ERROR — kode cabang wajib diisi.');
      if (!draft.branchGroupId) throw new Error('422 VALIDATION_ERROR — kategori cabang wajib dipilih.');
      if (!draft.address.trim()) throw new Error('422 VALIDATION_ERROR — alamat wajib diisi.');
      if (!draft.phone.trim()) throw new Error('422 VALIDATION_ERROR — telepon wajib diisi.');

      const wage = parseNumber(draft.regionalWage);
      const days = parseInteger(draft.workDaysPerWeek);
      const hours = parseInteger(draft.workHoursPerDay);
      const tolerance = parseInteger(draft.lateToleranceMinutes);
      if (wage === null || wage < 0) throw new Error('422 VALIDATION_ERROR — upah minimum wajib angka tidak negatif.');
      if (days === null || days < 1 || days > 7) throw new Error('422 VALIDATION_ERROR — hari kerja per minggu antara 1 dan 7.');
      if (hours === null || hours < 1 || hours > 24) throw new Error('422 VALIDATION_ERROR — jam kerja per hari antara 1 dan 24.');
      if (tolerance === null || tolerance < 0) throw new Error('422 VALIDATION_ERROR — toleransi terlambat tidak boleh negatif.');

      const derived = deriveZip(draft.zip);
      if (!derived.known) throw new Error('422 VALIDATION_ERROR — kode pos tidak dikenal pada data wilayah.');

      if (branches.some((row) => row.id !== id && row.branchCode === code)) {
        throw new Error(`409 — kode cabang ${code} sudah dipakai cabang aktif lain.`);
      }

      const hierarchy = setup.branchHierarchyMode === 'ENABLED';
      const parentId = hierarchy && draft.parentId ? draft.parentId : null;
      if (parentId && id && isDescendantNode(branches, parentId, id)) {
        throw new Error('422 VALIDATION_ERROR — cabang induk tidak boleh dirinya sendiri atau turunannya.');
      }
      const parent = parentId ? branches.find((row) => row.id === parentId) : undefined;

      const latitude = draft.latitude.trim() ? parseNumber(draft.latitude) : null;
      const longitude = draft.longitude.trim() ? parseNumber(draft.longitude) : null;
      const attendanceRadius = draft.attendanceRadius.trim() ? parseNumber(draft.attendanceRadius) : null;
      if (draft.attendanceRadius.trim() && (attendanceRadius === null || attendanceRadius < 0)) {
        throw new Error('422 VALIDATION_ERROR — radius absensi wajib angka tidak negatif.');
      }

      if (id) {
        const row = branches.find((item) => item.id === id);
        if (!row) throw new Error('404 NOT_FOUND — cabang tidak ditemukan.');
        if (row.branchCode !== code) throw new Error('422 VALIDATION_ERROR — kode cabang tidak bisa diubah.');
        Object.assign(row, {
          branchName: name,
          branchGroupId: draft.branchGroupId,
          parentId,
          parentInfo: parent ? { branchId: parent.id, branchName: parent.branchName } : null,
          address: draft.address.trim(),
          phone: draft.phone.trim(),
          zip: { zip: draft.zip.trim(), timezone: derived.timezone, province: derived.province, city: derived.city },
          regionalWage: wage,
          workDaysPerWeek: days,
          workHoursPerDay: hours,
          lateToleranceMinutes: tolerance,
          latitude,
          longitude,
          taxNpwp: draft.taxNpwp.trim() || null,
          taxNitku: draft.taxNitku.trim() || null,
          taxKlu: draft.taxKlu.trim() || null,
          attendanceRadius,
          attendanceOnMobile: draft.attendanceOnMobile,
        });
        return { ...row };
      }

      const row: Branch = {
        id: nextId('br'),
        branchName: name,
        branchCode: code,
        branchGroupId: draft.branchGroupId,
        parentId,
        parentInfo: parent ? { branchId: parent.id, branchName: parent.branchName } : null,
        address: draft.address.trim(),
        phone: draft.phone.trim(),
        zip: { zip: draft.zip.trim(), timezone: derived.timezone, province: derived.province, city: derived.city },
        regionalWage: wage,
        workDaysPerWeek: days,
        workHoursPerDay: hours,
        lateToleranceMinutes: tolerance,
        latitude,
        longitude,
        taxNpwp: draft.taxNpwp.trim() || null,
        taxNitku: draft.taxNitku.trim() || null,
        taxKlu: draft.taxKlu.trim() || null,
        attendanceRadius,
        attendanceOnMobile: draft.attendanceOnMobile,
        employeeCount: 0,
        createdAt: now(),
      };
      branches.push(row);
      return { ...row };
    }
    const { data } = await api.post<Branch>('/branches', draft);
    return data;
  },

  async deleteBranch(id: string): Promise<{ id: string }> {
    if (MOCK) {
      await delay(220);
      if (branches.some((row) => row.parentId === id)) {
        throw new Error('409 — cabang ini masih menjadi induk cabang lain.');
      }
      branches = branches.filter((row) => row.id !== id);
      return { id };
    }
    const { data } = await api.delete<{ id: string }>(`/branches/${id}`);
    return data;
  },

  // ---------- Group Structure ----------

  async groupStructs(): Promise<GroupStruct[]> {
    if (MOCK) {
      await delay();
      return groupStructs.map((row) => ({ ...row }));
    }
    const { data } = await api.post<{ data: GroupStruct[] }>('/group-structs/search', {});
    return data.data;
  },

  async groupLevels(groupStructId?: string): Promise<GroupLevel[]> {
    if (MOCK) {
      await delay();
      return groupLevels
        .filter((row) => !groupStructId || row.groupStructId === groupStructId)
        .map((row) => ({ ...row }))
        .sort((a, b) => a.levelOrder - b.levelOrder);
    }
    const { data } = await api.post<{ data: GroupLevel[] }>('/group-struct-levels/search', { group_struct_id: groupStructId });
    return data.data;
  },

  async positions(groupStructId?: string): Promise<GroupPosition[]> {
    if (MOCK) {
      await delay();
      const levelIds = groupLevels
        .filter((row) => !groupStructId || row.groupStructId === groupStructId)
        .map((row) => row.id);
      return positions
        .filter((row) => levelIds.includes(row.groupStructLevelId))
        .map((row) => ({ ...row }));
    }
    const { data } = await api.post<{ data: GroupPosition[] }>('/group-struct-positions/search', {});
    return data.data;
  },

  async positionHistory(positionId: string): Promise<PositionLog[]> {
    if (MOCK) {
      await delay(150);
      return positionLogs
        .filter((row) => row.positionId === positionId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((row) => ({ ...row }));
    }
    const { data } = await api.get<PositionLog[]>(`/group-struct-positions/${positionId}/histories`);
    return data;
  },

  /**
   * Menyimpan posisi sekaligus menuliskan jejaknya dalam satu transaksi: snapshot pengisi,
   * snapshot atasan dari posisi induk, dan satu baris log.
   */
  async savePosition(
    draft: { positionName: string; groupStructLevelId: string; employeeId: string; parentId: string },
    id?: string,
  ): Promise<GroupPosition> {
    if (MOCK) {
      await delay(260);
      const name = draft.positionName.trim();
      if (!name) throw new Error('422 VALIDATION_ERROR — nama posisi wajib diisi.');
      if (!draft.groupStructLevelId) throw new Error('422 VALIDATION_ERROR — level wajib dipilih.');

      const parent = draft.parentId ? positions.find((row) => row.id === draft.parentId) : undefined;
      if (draft.parentId && !parent) throw new Error('404 NOT_FOUND — posisi induk tidak ditemukan.');
      if (id && draft.parentId && isDescendantPosition(positions, draft.parentId, id)) {
        throw new Error('422 VALIDATION_ERROR — posisi induk tidak boleh dirinya sendiri atau turunannya.');
      }
      const levelError = parentLevelError(groupLevels, parent, draft.groupStructLevelId);
      if (levelError) throw new Error(`422 VALIDATION_ERROR — ${levelError}`);

      const employeeId = draft.employeeId || null;
      if (id) {
        const row = positions.find((item) => item.id === id);
        if (!row) throw new Error('404 NOT_FOUND — posisi tidak ditemukan.');
        const wasFilled = row.employeeId;
        Object.assign(row, {
          positionName: name,
          groupStructLevelId: draft.groupStructLevelId,
          employeeId,
          employeeInfo: snapshotOf(employeeId),
          parentId: parent?.id ?? null,
          supervisorInfo: parent?.employeeInfo ? { ...parent.employeeInfo } : null,
        });
        // Posisi yang ditinggalkan pengisinya kehilangan snapshot atasan pada anak-anaknya.
        if (wasFilled && !employeeId) {
          positions
            .filter((child) => child.parentId === row.id)
            .forEach((child) => {
              child.supervisorInfo = null;
            });
        } else if (employeeId) {
          positions
            .filter((child) => child.parentId === row.id)
            .forEach((child) => {
              child.supervisorInfo = snapshotOf(employeeId);
            });
        }
        writePositionLog(row, 'U', employeeId ? 'Posisi diperbarui.' : 'Pengisi posisi dikosongkan.');
        return { ...row };
      }

      const row: GroupPosition = {
        id: nextId('pos'),
        positionName: name,
        groupStructLevelId: draft.groupStructLevelId,
        employeeId,
        employeeInfo: snapshotOf(employeeId),
        parentId: parent?.id ?? null,
        supervisorInfo: parent?.employeeInfo ? { ...parent.employeeInfo } : null,
        createdAt: now(),
      };
      positions.push(row);
      writePositionLog(row, 'I', employeeId ? 'Posisi dibuat dengan pengisi.' : 'Posisi dibuat dalam keadaan lowong.');
      return { ...row };
    }
    const { data } = await api.post<GroupPosition>('/group-struct-positions', draft);
    return data;
  },

  async deletePosition(id: string): Promise<{ id: string }> {
    if (MOCK) {
      await delay(220);
      const row = positions.find((item) => item.id === id);
      if (!row) throw new Error('404 NOT_FOUND — posisi tidak ditemukan.');
      if (positions.some((item) => item.parentId === id)) {
        throw new Error('409 — posisi ini masih menjadi atasan posisi lain.');
      }
      writePositionLog(row, 'D', 'Posisi dihapus.');
      positions = positions.filter((item) => item.id !== id);
      return { id };
    }
    const { data } = await api.delete<{ id: string }>(`/group-struct-positions/${id}`);
    return data;
  },

  // ---------- Grade & Class ----------

  async jobGrades(): Promise<JobGrade[]> {
    if (MOCK) {
      await delay();
      return jobGrades.map((row) => ({ ...row })).sort((a, b) => a.gradeCode.localeCompare(b.gradeCode));
    }
    const { data } = await api.post<{ data: JobGrade[] }>('/job-grades/search', {});
    return data.data;
  },

  /**
   * Class wajib membawa rentang gaji; Grade justru tidak boleh punya rentang. `gradeCode`
   * BUKAN input klien sejak `T49` — dihitung ulang di sini untuk seluruh saudara sekandung
   * lewat `recomputeGradeCodes`, bukan disimpan langsung dari draft.
   */
  async saveJobGrade(draft: JobGradeDraft, id?: string): Promise<JobGrade> {
    if (MOCK) {
      await delay(260);
      const name = draft.name.trim();
      const parentId = draft.parentId || null;
      const sortOrder = parseInteger(draft.sortOrder);
      if (!name) throw new Error('422 VALIDATION_ERROR — nama wajib diisi.');
      if (sortOrder === null || sortOrder < 1) throw new Error('422 VALIDATION_ERROR — urutan wajib angka mulai 1.');
      if (jobGrades.some((row) => row.id !== id && row.name.toLowerCase() === name.toLowerCase())) {
        throw new Error(`409 — nama ${name} sudah dipakai baris aktif lain.`);
      }
      if (jobGrades.some((row) => row.id !== id && row.parentId === parentId && row.sortOrder === sortOrder)) {
        throw new Error(`409 — urutan ${sortOrder} sudah dipakai baris saudara lain.`);
      }
      const from = draft.salaryRangeFrom.trim() ? parseNumber(draft.salaryRangeFrom) : null;
      const to = draft.salaryRangeTo.trim() ? parseNumber(draft.salaryRangeTo) : null;
      const rangeError = salaryRangeError(parentId ?? '', from, to);
      if (rangeError) throw new Error(`422 VALIDATION_ERROR — ${rangeError}`);
      if (!parentId && (from !== null || to !== null)) {
        throw new Error('422 VALIDATION_ERROR — Grade tidak memakai rentang gaji; rentang hanya milik Class.');
      }

      const previousParentId = id ? (jobGrades.find((item) => item.id === id)?.parentId ?? null) : null;

      if (id) {
        const row = jobGrades.find((item) => item.id === id);
        if (!row) throw new Error('404 NOT_FOUND — baris tidak ditemukan.');
        Object.assign(row, {
          name,
          parentId,
          sortOrder,
          salaryRangeFrom: parentId ? from : null,
          salaryRangeTo: parentId ? to : null,
        });
      } else {
        const row: JobGrade = {
          id: nextId('jg'),
          name,
          gradeCode: '',
          parentId,
          sortOrder,
          salaryRangeFrom: parentId ? from : null,
          salaryRangeTo: parentId ? to : null,
          createdAt: now(),
        };
        jobGrades.push(row);
      }

      recomputeGradeCodes(parentId);
      if (previousParentId !== null && previousParentId !== parentId) recomputeGradeCodes(previousParentId);
      const saved = jobGrades.find((item) => item.id === id) ?? jobGrades[jobGrades.length - 1];
      return { ...saved };
    }
    const { data } = await api.post<JobGrade>('/job-grades', draft);
    return data;
  },

  async deleteJobGrade(id: string): Promise<{ id: string }> {
    if (MOCK) {
      await delay(200);
      const row = jobGrades.find((item) => item.id === id);
      if (!row) throw new Error('404 NOT_FOUND — baris tidak ditemukan.');
      if (jobGrades.some((item) => item.parentId === id)) {
        throw new Error('409 — Grade ini masih memayungi Class di bawahnya.');
      }
      jobGrades = jobGrades.filter((item) => item.id !== id);
      recomputeGradeCodes(row.parentId);
      return { id };
    }
    const { data } = await api.delete<{ id: string }>(`/job-grades/${id}`);
    return data;
  },

  // ---------- Cost Center ----------

  async costCenterCategories(): Promise<CostCenterCategory[]> {
    if (MOCK) {
      await delay();
      requireMode(setup.costCenterAssignmentMode, 'Cost Center');
      return costCenterCategories.map((row) => ({ ...row }));
    }
    const { data } = await api.post<{ data: CostCenterCategory[] }>('/cost-center-categories/search', {});
    return data.data;
  },

  async saveCostCenterCategory(draft: { name: string; description: string }, id?: string): Promise<CostCenterCategory> {
    if (MOCK) {
      await delay(220);
      requireMode(setup.costCenterAssignmentMode, 'Cost Center');
      const name = draft.name.trim();
      if (!name) throw new Error('422 VALIDATION_ERROR — nama kategori wajib diisi.');
      if (costCenterCategories.some((row) => row.id !== id && row.name.toLowerCase() === name.toLowerCase())) {
        throw new Error(`409 — kategori ${name} sudah ada.`);
      }
      if (id) {
        const row = costCenterCategories.find((item) => item.id === id);
        if (!row) throw new Error('404 NOT_FOUND — kategori tidak ditemukan.');
        Object.assign(row, { name, description: draft.description.trim() });
        return { ...row };
      }
      const row: CostCenterCategory = {
        id: nextId('ccc'),
        name,
        description: draft.description.trim(),
        createdAt: now(),
      };
      costCenterCategories.push(row);
      return { ...row };
    }
    const { data } = await api.post<CostCenterCategory>('/cost-center-categories', draft);
    return data;
  },

  async costCenters(): Promise<CostCenter[]> {
    if (MOCK) {
      await delay();
      requireMode(setup.costCenterAssignmentMode, 'Cost Center');
      return costCenters.map((row) => ({ ...row })).sort((a, b) => a.code.localeCompare(b.code));
    }
    const { data } = await api.post<{ data: CostCenter[] }>('/cost-centers/search', {});
    return data.data;
  },

  async saveCostCenter(draft: CostCenterDraft, id?: string): Promise<CostCenter> {
    if (MOCK) {
      await delay(260);
      requireMode(setup.costCenterAssignmentMode, 'Cost Center');
      const code = draft.code.trim().toUpperCase();
      const name = draft.name.trim();
      if (!code) throw new Error('422 VALIDATION_ERROR — kode wajib diisi.');
      if (!name) throw new Error('422 VALIDATION_ERROR — nama wajib diisi.');
      if (!draft.costCenterCategoryId) throw new Error('422 VALIDATION_ERROR — kategori wajib dipilih.');
      if (costCenters.some((row) => row.id !== id && row.code === code)) {
        throw new Error(`409 — kode ${code} sudah dipakai cost center aktif lain.`);
      }
      const budget = draft.annualBudget.trim() ? parseNumber(draft.annualBudget) : null;
      if (draft.annualBudget.trim() && (budget === null || budget < 0)) {
        throw new Error('422 VALIDATION_ERROR — anggaran tahunan wajib angka tidak negatif.');
      }
      if (id && draft.parentId && isDescendantNode(costCenters, draft.parentId, id)) {
        throw new Error('422 VALIDATION_ERROR — induk tidak boleh dirinya sendiri atau turunannya.');
      }

      if (id) {
        const row = costCenters.find((item) => item.id === id);
        if (!row) throw new Error('404 NOT_FOUND — cost center tidak ditemukan.');
        if (row.code !== code) throw new Error('422 VALIDATION_ERROR — kode cost center tidak bisa diubah.');
        Object.assign(row, {
          name,
          costCenterCategoryId: draft.costCenterCategoryId,
          parentId: draft.parentId || null,
          responsibleEmployeeId: draft.responsibleEmployeeId || null,
          annualBudget: budget,
        });
        return { ...row };
      }
      const row: CostCenter = {
        id: nextId('cc'),
        code,
        name,
        costCenterCategoryId: draft.costCenterCategoryId,
        parentId: draft.parentId || null,
        responsibleEmployeeId: draft.responsibleEmployeeId || null,
        annualBudget: budget,
        createdAt: now(),
      };
      costCenters.push(row);
      return { ...row };
    }
    const { data } = await api.post<CostCenter>('/cost-centers', draft);
    return data;
  },

  async deleteCostCenter(id: string): Promise<{ id: string }> {
    if (MOCK) {
      await delay(200);
      requireMode(setup.costCenterAssignmentMode, 'Cost Center');
      if (costCenters.some((row) => row.parentId === id)) {
        throw new Error('409 — cost center ini masih menjadi induk baris lain.');
      }
      costCenters = costCenters.filter((row) => row.id !== id);
      return { id };
    }
    const { data } = await api.delete<{ id: string }>(`/cost-centers/${id}`);
    return data;
  },

  // ---------- SBU ----------

  async sbuGroups(): Promise<SbuGroup[]> {
    if (MOCK) {
      await delay();
      requireMode(setup.sbuAssignmentMode, 'SBU');
      return sbuGroups.map((row) => ({ ...row }));
    }
    const { data } = await api.post<{ data: SbuGroup[] }>('/sbu-groups/search', {});
    return data.data;
  },

  async saveSbuGroup(draft: { name: string }, id?: string): Promise<SbuGroup> {
    if (MOCK) {
      await delay(220);
      requireMode(setup.sbuAssignmentMode, 'SBU');
      const name = draft.name.trim();
      if (!name) throw new Error('422 VALIDATION_ERROR — nama grup wajib diisi.');
      if (sbuGroups.some((row) => row.id !== id && row.name.toLowerCase() === name.toLowerCase())) {
        throw new Error(`409 — grup ${name} sudah ada.`);
      }
      if (id) {
        const row = sbuGroups.find((item) => item.id === id);
        if (!row) throw new Error('404 NOT_FOUND — grup tidak ditemukan.');
        row.name = name;
        return { ...row };
      }
      const row: SbuGroup = { id: nextId('sg'), name, createdAt: now() };
      sbuGroups.push(row);
      return { ...row };
    }
    const { data } = await api.post<SbuGroup>('/sbu-groups', draft);
    return data;
  },

  async sbus(): Promise<Sbu[]> {
    if (MOCK) {
      await delay();
      requireMode(setup.sbuAssignmentMode, 'SBU');
      return sbus.map((row) => ({ ...row })).sort((a, b) => a.code.localeCompare(b.code));
    }
    const { data } = await api.post<{ data: Sbu[] }>('/sbus/search', {});
    return data.data;
  },

  async saveSbu(draft: SbuDraft, id?: string): Promise<Sbu> {
    if (MOCK) {
      await delay(260);
      requireMode(setup.sbuAssignmentMode, 'SBU');
      const code = draft.code.trim().toUpperCase();
      const name = draft.name.trim();
      if (!code) throw new Error('422 VALIDATION_ERROR — kode wajib diisi.');
      if (!name) throw new Error('422 VALIDATION_ERROR — nama wajib diisi.');
      if (!draft.sbuGroupId) throw new Error('422 VALIDATION_ERROR — grup SBU wajib dipilih.');
      if (sbus.some((row) => row.id !== id && row.code === code)) {
        throw new Error(`409 — kode ${code} sudah dipakai SBU aktif lain.`);
      }
      if (id && draft.parentId && isDescendantNode(sbus, draft.parentId, id)) {
        throw new Error('422 VALIDATION_ERROR — induk tidak boleh dirinya sendiri atau turunannya.');
      }
      if (id) {
        const row = sbus.find((item) => item.id === id);
        if (!row) throw new Error('404 NOT_FOUND — SBU tidak ditemukan.');
        Object.assign(row, {
          code,
          name,
          sbuGroupId: draft.sbuGroupId,
          parentId: draft.parentId || null,
          responsibleEmployeeId: draft.responsibleEmployeeId || null,
        });
        return { ...row };
      }
      const row: Sbu = {
        id: nextId('sbu'),
        code,
        name,
        sbuGroupId: draft.sbuGroupId,
        parentId: draft.parentId || null,
        responsibleEmployeeId: draft.responsibleEmployeeId || null,
        createdAt: now(),
      };
      sbus.push(row);
      return { ...row };
    }
    const { data } = await api.post<Sbu>('/sbus', draft);
    return data;
  },

  async deleteSbu(id: string): Promise<{ id: string }> {
    if (MOCK) {
      await delay(200);
      requireMode(setup.sbuAssignmentMode, 'SBU');
      if (sbus.some((row) => row.parentId === id)) throw new Error('409 — SBU ini masih menjadi induk baris lain.');
      sbus = sbus.filter((row) => row.id !== id);
      return { id };
    }
    const { data } = await api.delete<{ id: string }>(`/sbus/${id}`);
    return data;
  },

  // ---------- Vendor ----------

  async vendors(search = ''): Promise<Vendor[]> {
    if (MOCK) {
      await delay();
      const query = search.trim().toLowerCase();
      return vendors
        .filter((row) => !query || row.vendorName.toLowerCase().includes(query))
        .map((row) => ({ ...row }))
        .sort((a, b) => a.vendorName.localeCompare(b.vendorName));
    }
    const { data } = await api.post<{ data: Vendor[] }>('/vendors/search', { filters: { vendor_name: search } });
    return data.data;
  },

  async saveVendor(draft: VendorDraft, id?: string): Promise<Vendor> {
    if (MOCK) {
      await delay(260);
      const name = draft.vendorName.trim();
      if (!name) throw new Error('422 VALIDATION_ERROR — nama vendor wajib diisi.');
      if (!draft.address.trim()) throw new Error('422 VALIDATION_ERROR — alamat wajib diisi.');
      if (!draft.phone.trim()) throw new Error('422 VALIDATION_ERROR — telepon wajib diisi.');
      const email = draft.email.trim();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('422 VALIDATION_ERROR — format surel tidak sah.');
      }
      if (vendors.some((row) => row.id !== id && row.vendorName.toLowerCase() === name.toLowerCase())) {
        throw new Error(`409 — vendor bernama ${name} sudah terdaftar.`);
      }
      if (id) {
        const row = vendors.find((item) => item.id === id);
        if (!row) throw new Error('404 NOT_FOUND — vendor tidak ditemukan.');
        Object.assign(row, {
          vendorName: name,
          address: draft.address.trim(),
          phone: draft.phone.trim(),
          telephone: draft.telephone.trim() || null,
          email: email || null,
          vendorType: draft.vendorType,
          picName: draft.picName.trim() || null,
          picPosition: draft.picPosition || null,
        });
        return { ...row };
      }
      const row: Vendor = {
        id: nextId('vd'),
        vendorName: name,
        address: draft.address.trim(),
        phone: draft.phone.trim(),
        telephone: draft.telephone.trim() || null,
        email: email || null,
        vendorType: draft.vendorType,
        picName: draft.picName.trim() || null,
        picPosition: draft.picPosition || null,
        isActive: true,
        createdAt: now(),
      };
      vendors.push(row);
      return { ...row };
    }
    const { data } = await api.post<Vendor>('/vendors', draft);
    return data;
  },

  async deleteVendor(id: string): Promise<{ id: string }> {
    if (MOCK) {
      await delay(200);
      vendors = vendors.filter((row) => row.id !== id);
      return { id };
    }
    const { data } = await api.delete<{ id: string }>(`/vendors/${id}`);
    return data;
  },
};
