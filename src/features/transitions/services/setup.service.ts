import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import { EMPLOYEES } from '@/features/time-off/mock-data';
import { MIN_ASSIGNEES } from '@/features/transitions/setup-types';
import type {
  MaterializationSetup,
  MaterializeRole,
  SetupAudit,
  SetupStatus,
  SetupTask,
} from '@/features/transitions/setup-types';

/**
 * Endpoint kontrak (prefiks `/employee`):
 *   GET/POST materialization-setups · GET/PUT …/{setup-id} · GET …/{id}/audit
 *   GET materialization-setups/eligible-assignees · GET …/coverage            (§7.23.2)
 *   GET materialization-roles · PUT materialization-roles/{access-id}          (§7.23.10)
 */
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));
const T = '2026-10-22T09:00:00+07:00';

/** Role tiap karyawan contoh (auth `emp_employment.access_id`). */
export const EMPLOYEE_ROLE: Record<string, string> = {
  'emp-hendra': 'ROLE_HR_MANAGER',
  'emp-sari': 'ROLE_HR_STAFF',
  'emp-budi': 'ROLE_GA_STAFF',
  'emp-rina': 'ROLE_IT_STAFF',
};

const ROLES: MaterializeRole[] = [
  { accessId: 'acc-1', accessCode: 'ROLE_SUPER_ADMIN', accessName: 'Administrator', isMaterialize: false, updatedAt: T },
  { accessId: 'acc-2', accessCode: 'ROLE_HR_MANAGER', accessName: 'HR Manager', isMaterialize: true, updatedAt: T },
  { accessId: 'acc-3', accessCode: 'ROLE_HR_STAFF', accessName: 'HR Staff', isMaterialize: true, updatedAt: T },
  { accessId: 'acc-4', accessCode: 'ROLE_GA_STAFF', accessName: 'GA Staff', isMaterialize: true, updatedAt: T },
  { accessId: 'acc-5', accessCode: 'ROLE_IT_STAFF', accessName: 'IT Staff', isMaterialize: true, updatedAt: T },
  { accessId: 'acc-6', accessCode: 'ROLE_DEPT_MANAGER', accessName: 'Department Manager', isMaterialize: false, updatedAt: T },
  { accessId: 'acc-7', accessCode: 'ROLE_EMPLOYEE', accessName: 'Employee', isMaterialize: false, updatedAt: T },
];

const task = (code: string, name: string, side: SetupTask['side'], extra: Partial<SetupTask> = {}): SetupTask => ({
  code,
  name,
  side,
  durationDays: 3,
  approvalRequired: false,
  twoParty: false,
  locked: false,
  handlers: ['emp-sari', 'emp-hendra'],
  approvers: [],
  ...extra,
});

const SETUPS: MaterializationSetup[] = [
  {
    setupId: 'setup-onb', type: 'ONBOARDING', subtype: null, branch: null, isCompanyDefault: true, outFirstGate: false, status: 'COMPLETE', version: 1, updatedAt: T, updatedBy: 'SYSTEM',
    tasks: [
      task('ACCESS_SETUP', 'SEVAKA HRIS access', 'PROVISION', { locked: true, handlers: [], durationDays: 0 }),
      task('IT_ACCOUNTS', 'Create IT accounts', 'PROVISION', { handlers: ['emp-rina', 'emp-sari'] }),
      task('FACILITY_PROVISION', 'Facility provided', 'PROVISION', { twoParty: true, approvalRequired: true, handlers: ['emp-budi', 'emp-sari'], approvers: ['emp-hendra', 'emp-rina'] }),
      task('PAYROLL_REG', 'Payroll and tax registration', 'PROVISION', { durationDays: 5 }),
    ],
  },
  {
    setupId: 'setup-off', type: 'OFFBOARDING', subtype: null, branch: null, isCompanyDefault: true, outFirstGate: true, status: 'COMPLETE', version: 2, updatedAt: T, updatedBy: 'Hendra Kusuma',
    tasks: [
      task('KNOWLEDGE_HANDOVER', 'Knowledge handover', 'RELINQUISH', { durationDays: 5 }),
      task('FACILITY_WITHDRAWAL', 'Facility withdrawn', 'RELINQUISH', { twoParty: true, approvalRequired: true, handlers: ['emp-budi', 'emp-sari'], approvers: ['emp-hendra', 'emp-rina'] }),
      task('REVOKE_ACCESS', 'Revoke system access', 'RELINQUISH', { handlers: ['emp-rina', 'emp-sari'], durationDays: 1 }),
    ],
  },
  {
    setupId: 'setup-trf', type: 'TRANSFER', subtype: null, branch: null, isCompanyDefault: true, outFirstGate: true, status: 'COMPLETE', version: 1, updatedAt: T, updatedBy: 'SYSTEM',
    tasks: [
      task('HANDOVER_OUT', 'Hand over open work', 'RELINQUISH'),
      task('FACILITY_WITHDRAWAL', 'Facility withdrawn', 'RELINQUISH', { twoParty: true, approvalRequired: true, handlers: ['emp-budi', 'emp-sari'], approvers: ['emp-hendra', 'emp-rina'] }),
      task('VERIFY_NEW_UNIT', 'Verify identity in new unit', 'PROVISION', { approvalRequired: true, approvers: ['emp-hendra', 'emp-budi'] }),
      task('FACILITY_PROVISION', 'Facility provided', 'PROVISION', { twoParty: true, handlers: ['emp-budi', 'emp-sari'] }),
    ],
  },
  {
    setupId: 'setup-onb-sby', type: 'ONBOARDING', subtype: null, branch: 'BR-Surabaya', isCompanyDefault: false, outFirstGate: false, status: 'UNDERSTAFFED', version: 1, updatedAt: T, updatedBy: 'SYSTEM',
    tasks: [
      task('ACCESS_SETUP', 'SEVAKA HRIS access', 'PROVISION', { locked: true, handlers: [], durationDays: 0 }),
      task('IT_ACCOUNTS', 'Create IT accounts', 'PROVISION', { handlers: ['emp-budi'] }),
    ],
  },
];

const clone = (row: MaterializationSetup): MaterializationSetup => ({
  ...row,
  tasks: row.tasks.map((item) => ({ ...item, handlers: [...item.handlers], approvers: [...item.approvers] })),
});

let setups = SETUPS.map(clone);
let roles = ROLES.map((row) => ({ ...row }));
let audit: SetupAudit[] = SETUPS.map((row) => ({ setupId: row.setupId, version: row.version, at: T, by: row.updatedBy, summary: 'Seeded from the active package' }));

export function resetSetupMocks() {
  setups = SETUPS.map(clone);
  roles = ROLES.map((row) => ({ ...row }));
  audit = SETUPS.map((row) => ({ setupId: row.setupId, version: row.version, at: T, by: row.updatedBy, summary: 'Seeded from the active package' }));
}

const name = (id: string) => EMPLOYEES.find((row) => row.id === id)?.name ?? id;

/** Kelayakan terpadu §7.23.10 (versi mock): role karyawan bertanda is_materialize. */
export function isEligible(employeeId: string): boolean {
  const code = EMPLOYEE_ROLE[employeeId];
  return roles.some((row) => row.accessCode === code && row.isMaterialize);
}

/** Status dihitung: daftar aktif kurang dari 2 ⇒ UNDERSTAFFED. */
export function statusOf(setup: MaterializationSetup): SetupStatus {
  const short = setup.tasks.some(
    (item) =>
      !item.locked &&
      (item.handlers.filter(isEligible).length < MIN_ASSIGNEES ||
        (item.approvalRequired && item.approvers.filter(isEligible).length < MIN_ASSIGNEES)),
  );
  return short ? 'UNDERSTAFFED' : 'COMPLETE';
}

/** Pemilih setup §7.23.4: cabang persis → bawaan perusahaan. */
export function pickSetup(type: MaterializationSetup['type'], branch?: string): MaterializationSetup | undefined {
  const exact = setups.find((row) => row.type === type && row.branch && row.branch === branch);
  const chosen = exact ?? setups.find((row) => row.type === type && row.isCompanyDefault);
  return chosen ? clone(chosen) : undefined;
}

function validate(draft: MaterializationSetup, existingId?: string) {
  if (setups.some((row) => row.setupId !== existingId && row.type === draft.type && row.subtype === draft.subtype && row.branch === draft.branch)) {
    throw new Error('422 EMP-VAL-716 — sudah ada setup untuk jenis, subtipe, dan cabang ini.');
  }
  for (const item of draft.tasks) {
    if (item.locked) continue;
    if (!item.name.trim()) throw new Error('422 — setiap tugas wajib bernama.');
    if (item.handlers.length < MIN_ASSIGNEES) throw new Error(`422 EMP-VAL-710 — «${item.name}» butuh minimal ${MIN_ASSIGNEES} petugas.`);
    if (item.approvalRequired && item.approvers.length < MIN_ASSIGNEES) {
      throw new Error(`422 EMP-VAL-710 — «${item.name}» butuh minimal ${MIN_ASSIGNEES} penyetuju.`);
    }
    if (item.handlers.some((id) => item.approvers.includes(id))) {
      throw new Error(`422 EMP-VAL-711 — nama yang sama ada di daftar petugas dan penyetuju «${item.name}».`);
    }
    const ineligible = [...item.handlers, ...item.approvers].find((id) => !isEligible(id));
    if (ineligible) throw new Error(`422 EMP-VAL-712 — ${name(ineligible)} tidak layak (role belum ditandai Materialization).`);
  }
}

export const setupService = {
  async list(): Promise<MaterializationSetup[]> {
    if (MOCK) {
      await delay(150);
      return setups.map((row) => ({ ...clone(row), status: statusOf(row) }));
    }
    const { data } = await api.get<MaterializationSetup[]>('/employee/materialization-setups');
    return data;
  },

  /** Simpan = versi baru; versi lama tetap terbaca lewat audit (§7.23.2 MS4). */
  async save(role: 'HR_MANAGER' | 'HR_STAFF', draft: MaterializationSetup, actor: string): Promise<MaterializationSetup> {
    if (MOCK) {
      await delay(350);
      if (role !== 'HR_MANAGER') throw new Error('403 EMP-AUZ-710 — hanya HR Manager atau Super Admin yang menulis setup.');
      const current = setups.find((row) => row.setupId === draft.setupId);
      if (current) {
        const lockedBefore = current.tasks.filter((item) => item.locked).map((item) => `${item.code}:${item.name}`);
        const lockedAfter = draft.tasks.filter((item) => item.locked).map((item) => `${item.code}:${item.name}`);
        if (lockedBefore.join() !== lockedAfter.join()) throw new Error('422 EMP-VAL-715 — item bawaan terkunci tidak dapat dihapus atau diubah.');
      }
      validate(draft, current?.setupId);
      const saved: MaterializationSetup = {
        ...clone(draft),
        setupId: current?.setupId ?? `setup-${crypto.randomUUID().slice(0, 6)}`,
        version: (current?.version ?? 0) + 1,
        updatedAt: new Date().toISOString(),
        updatedBy: name(actor),
        status: 'COMPLETE',
      };
      setups = current ? setups.map((row) => (row.setupId === saved.setupId ? saved : row)) : [...setups, saved];
      audit = [
        { setupId: saved.setupId, version: saved.version, at: saved.updatedAt, by: saved.updatedBy, summary: `${saved.tasks.length} task(s) saved` },
        ...audit,
      ];
      return clone(saved);
    }
    const { data } = draft.version
      ? await api.put<MaterializationSetup>(`/employee/materialization-setups/${draft.setupId}`, draft)
      : await api.post<MaterializationSetup>('/employee/materialization-setups', draft);
    return data;
  },

  async audit(setupId: string): Promise<SetupAudit[]> {
    if (MOCK) {
      await delay(100);
      return audit.filter((row) => row.setupId === setupId);
    }
    const { data } = await api.get<SetupAudit[]>(`/employee/materialization-setups/${setupId}/audit`);
    return data;
  },

  /** Pemilih petugas §7.23.2 MS6 — hanya karyawan layak. */
  eligibleAssignees(): { id: string; name: string; role: string }[] {
    return EMPLOYEES.filter((row) => isEligible(row.id)).map((row) => ({ id: row.id, name: row.name, role: EMPLOYEE_ROLE[row.id] }));
  },

  async roles(): Promise<MaterializeRole[]> {
    if (MOCK) {
      await delay(120);
      return roles.map((row) => ({ ...row }));
    }
    const { data } = await api.get<MaterializeRole[]>('/employee/materialization-roles');
    return data;
  },

  async setRole(role: 'HR_MANAGER' | 'HR_STAFF', accessId: string, isMaterialize: boolean): Promise<MaterializeRole> {
    if (MOCK) {
      await delay(250);
      if (role !== 'HR_MANAGER') throw new Error('403 EMP-AUZ-714 — hanya HR Manager atau Super Admin yang mengubah penanda.');
      const row = roles.find((item) => item.accessId === accessId);
      if (!row) throw new Error('404 EMP-NFD-712 — role tidak ditemukan.');
      Object.assign(row, { isMaterialize, updatedAt: new Date().toISOString() });
      return { ...row };
    }
    const { data } = await api.put<MaterializeRole>(`/employee/materialization-roles/${accessId}`, { is_materialize: isMaterialize });
    return data;
  },
};
