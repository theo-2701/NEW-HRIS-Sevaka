import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import { useAuthStore } from '@/store/auth.store';
import { CURRENT_USER } from '@/features/manpower/types';
import { ROLES } from '@/features/role-grant/types';
import type { RoleCode } from '@/features/role-grant/types';
import { BRANCH_OPTIONS, MIN_PEOPLE, setupStatus } from '@/features/materialization/types';
import type {
  Assignee,
  RoleMappingRow,
  Setup,
  SetupFilter,
  SetupHistory,
  SetupStatus,
  SetupTask,
  SetupType,
} from '@/features/materialization/types';
import type { TransferSubtype } from '@/features/transitions/types';

/**
 * API service Materialization (TSD-001-EMPLOYEE 0.192 §7.23, fungsi MS1–MS7, MR1/MR2):
 *   GET  /materialization-setups                — MS1 daftar (+ status, versi)
 *   GET  /materialization-setups/{id}?version=n — MS2 detail (versi lama hanya-baca)
 *   POST /materialization-setups                — MS3 setup baru (kembar 409 EMP-VAL-716)
 *   PUT  /materialization-setups/{id}           — MS4 simpan = versi baru (validasi EMP-VAL-710..715)
 *   GET  /materialization-setups/{id}/history   — MS5
 *   POST /materialization-assignees/search      — MS6 kandidat petugas/penyetuju (aktif, role dipetakan, cabang)
 *   GET  /materialization-setups/coverage       — MS7 cabang tanpa setup + jumlah Understaffed
 *   GET/PUT /materialization-roles              — MR1/MR2 Role Mapping
 */
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));
const newId = () => crypto.randomUUID();

/** Mode dummy: karyawan yang dapat ditugasi — role dan status dari auth/employee-service sesungguhnya. */
const PEOPLE: (Assignee & { role: RoleCode; branchId: string; status: 'ACTIVE' | 'SUSPENDED' })[] = [
  { employeeId: 'emp-tony', name: 'Tony Stark', nik: 'NIK-0001', branch: 'HO-Jakarta', branchId: 'br-jkt', role: 'ROLE_HR_MANAGER', status: 'ACTIVE' },
  { employeeId: 'emp-lia', name: 'Lia Permata', nik: 'NIK-0012', branch: 'HO-Jakarta', branchId: 'br-jkt', role: 'ROLE_HR_STAFF', status: 'ACTIVE' },
  { employeeId: 'emp-doni', name: 'Doni Prabowo', nik: 'NIK-0027', branch: 'HO-Jakarta', branchId: 'br-jkt', role: 'ROLE_GA_STAFF', status: 'ACTIVE' },
  { employeeId: 'emp-nur', name: 'Nur Aisyah', nik: 'NIK-0022', branch: 'HO-Jakarta', branchId: 'br-jkt', role: 'ROLE_GA_STAFF', status: 'ACTIVE' },
  { employeeId: 'emp-yoga', name: 'Yoga Pratama', nik: 'NIK-0036', branch: 'HO-Jakarta', branchId: 'br-jkt', role: 'ROLE_SYSTEM_ADMIN', status: 'ACTIVE' },
  { employeeId: 'emp-sari', name: 'Sari Dewanti', nik: 'NIK-0009', branch: 'HO-Jakarta', branchId: 'br-jkt', role: 'ROLE_PAYROLL_OFFICER', status: 'SUSPENDED' },
  { employeeId: 'emp-eka', name: 'Eka Saputra', nik: 'NIK-0005', branch: 'BR-Papua', branchId: 'br-papua', role: 'ROLE_FINANCE_OFFICER', status: 'ACTIVE' },
  { employeeId: 'emp-rudi-sby', name: 'Rudi Setiadi', nik: 'NIK-0051', branch: 'BR-Surabaya', branchId: 'br-sby', role: 'ROLE_GA_STAFF', status: 'ACTIVE' },
];

let roleMapping: RoleMappingRow[] = ROLES.map((roleCode) => ({
  roleCode,
  isMaterialize: ['ROLE_HR_MANAGER', 'ROLE_HR_STAFF', 'ROLE_GA_STAFF', 'ROLE_SYSTEM_ADMIN'].includes(roleCode),
}));

const person = (id: string): Assignee => {
  const found = PEOPLE.find((item) => item.employeeId === id)!;
  return { employeeId: found.employeeId, name: found.name, nik: found.nik, branch: found.branch };
};

const t = (name: string, handlers: string[], extra: Partial<SetupTask> = {}): SetupTask => ({
  id: newId(),
  name,
  dueDays: 3,
  deadlineClass: 'OPERATIONAL',
  requiresApproval: false,
  handlers: handlers.map(person),
  approvers: [],
  ...extra,
});

const LOCKED: SetupTask = { ...t('SEVAKA HRIS access', []), locked: true, dueDays: 0 };

let setups: Setup[] = [
  {
    id: 'mz-onb-default',
    type: 'ONBOARDING',
    subtype: null,
    branchId: null,
    version: 3,
    updatedAt: '2026-10-21T10:00:00+07:00',
    updatedBy: 'Tony Stark',
    inOpensAfterOut: false,
    sections: {
      MAIN: [
        LOCKED,
        t('Create IT accounts', ['emp-yoga', 'emp-tony'], { dueDays: 2 }),
        t('Assign laptop & access card', ['emp-doni', 'emp-nur'], { dueDays: 5 }),
        t('Payroll & tax registration', ['emp-lia', 'emp-tony'], {
          dueDays: 7,
          deadlineClass: 'LEGAL',
          requiresApproval: true,
          approvers: [person('emp-sari'), person('emp-yoga')],
        }),
      ],
    },
  },
  {
    id: 'mz-off-sby',
    type: 'OFFBOARDING',
    subtype: null,
    branchId: 'br-sby',
    version: 1,
    updatedAt: '2026-10-20T15:30:00+07:00',
    updatedBy: 'Tony Stark',
    inOpensAfterOut: false,
    sections: {
      MAIN: [
        t('Return company laptop', ['emp-rudi-sby', 'emp-doni'], { dueDays: 3 }),
        t('Exit interview', ['emp-lia', 'emp-tony'], { dueDays: 5 }),
      ],
    },
  },
  {
    id: 'mz-trf-default',
    type: 'TRANSFER',
    subtype: null,
    branchId: null,
    version: 2,
    updatedAt: '2026-10-22T09:00:00+07:00',
    updatedBy: 'Tony Stark',
    inOpensAfterOut: true,
    sections: {
      OUT: [
        t('Handover open work', ['emp-lia', 'emp-tony']),
        { ...t('Facility withdrawn', ['emp-doni', 'emp-nur'], { requiresApproval: true, approvers: [person('emp-tony'), person('emp-lia')] }), facility: 'WITHDRAWN' },
      ],
      IN: [
        t('Provision system access', ['emp-yoga', 'emp-tony']),
        { ...t('Facility provided', ['emp-doni', 'emp-nur'], { requiresApproval: true, approvers: [person('emp-tony'), person('emp-lia')] }), facility: 'PROVIDED' },
      ],
    },
  },
  {
    id: 'mz-trf-promo',
    type: 'TRANSFER',
    subtype: 'PROMOTION',
    branchId: null,
    version: 1,
    updatedAt: '2026-10-22T11:00:00+07:00',
    updatedBy: 'Lia Permata',
    inOpensAfterOut: true,
    sections: {
      OUT: [t('Handover open work', ['emp-lia'])],
      IN: [t('Orientation with the new manager', ['emp-tony', 'emp-lia'])],
    },
  },
];

const history: Record<string, SetupHistory[]> = {};

const snapshot = (setup: Setup): SetupHistory['snapshot'] =>
  (Object.values(setup.sections).flat() as SetupTask[])
    .filter((task) => !task.locked)
    .map((task) => ({ task: task.name, handlers: task.handlers.map((p) => p.name), approvers: task.approvers.map((p) => p.name) }));

for (const setup of setups) history[setup.id] = [{ version: setup.version, savedAt: setup.updatedAt, savedBy: setup.updatedBy, action: 'Updated', snapshot: snapshot(setup) }];

/** Penanda nonaktif dihitung hidup dari status, role mapping, dan cabang (sapuan harian di produksi). */
function withInactive(setup: Setup): Setup {
  const mark = (people: Assignee[]) =>
    people.map((item) => {
      const found = PEOPLE.find((p) => p.employeeId === item.employeeId);
      const inactive: Assignee['inactive'] = !found || found.status !== 'ACTIVE'
        ? 'STATUS'
        : !roleMapping.find((r) => r.roleCode === found.role)?.isMaterialize
          ? 'ROLE_ACCESS'
          : setup.type !== 'TRANSFER' && setup.branchId && found.branchId !== setup.branchId
            ? 'BRANCH'
            : undefined;
      return { ...item, inactive };
    });
  const sections = Object.fromEntries(
    Object.entries(setup.sections).map(([key, tasks]) => [key, (tasks ?? []).map((task) => ({ ...task, handlers: mark(task.handlers), approvers: mark(task.approvers) }))]),
  );
  return { ...setup, sections };
}

const canWrite = () => {
  const role = useAuthStore.getState().user?.role;
  return role === 'ROLE_HR_MANAGER' || role === 'ROLE_SUPER_ADMIN';
};

function assertSetup(setup: Setup) {
  for (const task of Object.values(setup.sections).flat() as SetupTask[]) {
    if (task.locked) continue;
    if (!task.name.trim()) throw new Error('422 — Every task needs a name.');
    if (task.handlers.length < MIN_PEOPLE) throw new Error(`422 — "${task.name}" needs at least ${MIN_PEOPLE} handlers.`);
    if (task.requiresApproval && task.approvers.length < MIN_PEOPLE) {
      throw new Error(`422 — "${task.name}" needs at least ${MIN_PEOPLE} approvers.`);
    }
    const handlerIds = new Set(task.handlers.map((p) => p.employeeId));
    const both = task.approvers.find((p) => handlerIds.has(p.employeeId));
    if (both) throw new Error(`422 — ${both.name} cannot be both a handler and an approver of "${task.name}".`);
    if (setup.type !== 'TRANSFER' && setup.branchId) {
      const outside = [...task.handlers, ...task.approvers].find((p) => PEOPLE.find((x) => x.employeeId === p.employeeId)?.branchId !== setup.branchId);
      if (outside) throw new Error(`422 — ${outside.name} is not in this setup's branch.`);
    }
  }
}

export interface Coverage {
  understaffed: number;
  missing: { type: SetupType; branchId: string }[];
}

export const materializationService = {
  async search(filter: SetupFilter = {}): Promise<(Setup & { status: SetupStatus })[]> {
    if (MOCK) {
      await delay();
      return setups
        .map((setup) => {
          const live = withInactive(setup);
          return { ...live, status: setupStatus(live) };
        })
        .filter((row) => !filter.type || row.type === filter.type)
        .filter((row) => !filter.subtype || (filter.subtype === 'ALL_SUBTYPES' ? row.subtype === null : row.subtype === filter.subtype))
        .filter((row) => !filter.branchId || (filter.branchId === 'DEFAULT' ? row.branchId === null : row.branchId === filter.branchId))
        .filter((row) => !filter.status || row.status === filter.status)
        .sort((a, b) => a.type.localeCompare(b.type) || (a.subtype ?? '').localeCompare(b.subtype ?? '') || (a.branchId ?? '').localeCompare(b.branchId ?? ''));
    }
    const { data } = await api.get('/employee/materialization-setups', { params: filter });
    return data;
  },

  async get(id: string): Promise<Setup> {
    if (MOCK) {
      await delay(200);
      const found = setups.find((item) => item.id === id);
      if (!found) throw new Error('404 — Setup not found.');
      return withInactive(structuredClone(found));
    }
    const { data } = await api.get<Setup>(`/employee/materialization-setups/${id}`);
    return data;
  },

  /** Kerangka setup baru — Onboarding selalu memuat item terkunci; Transfer punya Out dan In. */
  blank(type: SetupType, subtype: TransferSubtype | null, branchId: string | null): Setup {
    return {
      id: '',
      type,
      subtype: type === 'TRANSFER' ? subtype : null,
      branchId: type === 'TRANSFER' ? null : branchId,
      version: 0,
      updatedAt: '',
      updatedBy: '',
      inOpensAfterOut: true,
      sections: type === 'TRANSFER' ? { OUT: [], IN: [] } : { MAIN: type === 'ONBOARDING' ? [{ ...LOCKED, id: newId() }] : [] },
    };
  },

  newTask(): SetupTask {
    return t('', []);
  },

  async save(setup: Setup): Promise<Setup> {
    if (MOCK) {
      await delay(400);
      if (!canWrite()) throw new Error('403 — Only an HR Manager or Super Admin can change materialization setups.');
      assertSetup(setup);
      const clean = structuredClone(setup);
      Object.values(clean.sections).forEach((tasks) =>
        tasks?.forEach((task) => [...task.handlers, ...task.approvers].forEach((p) => delete p.inactive)),
      );
      const now = new Date().toISOString();
      if (!clean.id) {
        if (setups.some((row) => row.type === clean.type && row.subtype === clean.subtype && row.branchId === clean.branchId)) {
          throw new Error('409 — A setup for this type, subtype and branch already exists.');
        }
        Object.assign(clean, { id: newId(), version: 1, updatedAt: now, updatedBy: CURRENT_USER });
        setups = [...setups, clean];
        history[clean.id] = [{ version: 1, savedAt: now, savedBy: CURRENT_USER, action: 'Created', snapshot: snapshot(clean) }];
      } else {
        const index = setups.findIndex((row) => row.id === clean.id);
        if (index < 0) throw new Error('404 — Setup not found.');
        const lockedBefore = JSON.stringify((Object.values(setups[index].sections).flat() as SetupTask[]).filter((x) => x.locked).map((x) => x.name));
        const lockedAfter = JSON.stringify((Object.values(clean.sections).flat() as SetupTask[]).filter((x) => x.locked).map((x) => x.name));
        if (lockedBefore !== lockedAfter) throw new Error('422 — The SEVAKA HRIS access item cannot be changed.');
        Object.assign(clean, { version: setups[index].version + 1, updatedAt: now, updatedBy: CURRENT_USER });
        setups[index] = clean;
        history[clean.id] = [...(history[clean.id] ?? []), { version: clean.version, savedAt: now, savedBy: CURRENT_USER, action: 'Updated', snapshot: snapshot(clean) }];
      }
      return withInactive(structuredClone(clean));
    }
    const { data } = setup.id
      ? await api.put<Setup>(`/employee/materialization-setups/${setup.id}`, setup)
      : await api.post<Setup>('/employee/materialization-setups', setup);
    return data;
  },

  async history(id: string): Promise<SetupHistory[]> {
    if (MOCK) {
      await delay(200);
      return [...(history[id] ?? [])].reverse();
    }
    const { data } = await api.get<SetupHistory[]>(`/employee/materialization-setups/${id}/history`);
    return data;
  },

  /** MS6 — karyawan aktif, role dipetakan di Role Mapping, dan (Onboarding/Offboarding) di cabang setup. */
  async eligible(setup: Pick<Setup, 'type' | 'branchId'>, keyword = ''): Promise<Assignee[]> {
    if (MOCK) {
      await delay(200);
      const word = keyword.trim().toLowerCase();
      return PEOPLE.filter(
        (p) =>
          p.status === 'ACTIVE' &&
          roleMapping.find((r) => r.roleCode === p.role)?.isMaterialize &&
          (setup.type === 'TRANSFER' || !setup.branchId || p.branchId === setup.branchId) &&
          (!word || `${p.name} ${p.nik}`.toLowerCase().includes(word)),
      ).map(({ employeeId, name, nik, branch }) => ({ employeeId, name, nik, branch }));
    }
    const { data } = await api.post<Assignee[]>('/employee/materialization-assignees/search', { ...setup, keyword });
    return data;
  },

  /** MS7 — cabang × jenis (Onboarding/Offboarding) tanpa setup sendiri (memakai company default). */
  async coverage(): Promise<Coverage> {
    if (MOCK) {
      await delay(150);
      const rows = await materializationService.search();
      const missing = (['ONBOARDING', 'OFFBOARDING'] as SetupType[]).flatMap((type) =>
        BRANCH_OPTIONS.filter((branch) => !setups.some((s) => s.type === type && s.branchId === branch.value)).map((branch) => ({
          type,
          branchId: branch.value,
        })),
      );
      return { understaffed: rows.filter((row) => row.status === 'UNDERSTAFFED').length, missing };
    }
    const { data } = await api.get<Coverage>('/employee/materialization-setups/coverage');
    return data;
  },

  async roles(): Promise<RoleMappingRow[]> {
    if (MOCK) {
      await delay(150);
      return roleMapping.map((row) => ({ ...row }));
    }
    const { data } = await api.get<RoleMappingRow[]>('/employee/materialization-roles');
    return data;
  },

  async setRole(roleCode: RoleCode, isMaterialize: boolean): Promise<void> {
    if (MOCK) {
      await delay(200);
      if (!canWrite()) throw new Error('403 — Only an HR Manager or Super Admin can change this list.');
      roleMapping = roleMapping.map((row) => (row.roleCode === roleCode ? { ...row, isMaterialize } : row));
      return;
    }
    await api.put(`/employee/materialization-roles/${roleCode}`, { is_materialize: isMaterialize });
  },
};

