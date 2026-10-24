import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import type { WorkStatus, WorkStatusFilter, WorkStatusInput } from '@/features/work-status/types';

/**
 * API service Work Status (TSD-001-EMPLOYEE 0.192 §7.13.3):
 *   POST /work-statuses/search   — W1, urut nama naik, baris nonaktif ikut
 *   POST /work-statuses          — W3, kembar nama (tanpa beda huruf) 409
 *   PUT  /work-statuses/{id}     — W4, menonaktifkan jenis yang masih dipegang karyawan 409
 */
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));
const NAME = /^[A-Za-z][A-Za-z0-9 ()-]{0,49}$/;

const flags = { deductBpjsTk: true, deductBpjsKs: true, eligibleForLeave: true, eligibleForOvertime: true };

let rows: WorkStatus[] = [
  { id: 'ws-permanent', name: 'Permanent Employee', taxCategory: 'PEGAWAI_TETAP', requiresEndDate: false, ...flags, isActive: true, activeEmployeeCount: 42 },
  { id: 'ws-contract', name: 'Contract', taxCategory: 'PEGAWAI_TETAP', requiresEndDate: true, ...flags, isActive: true, activeEmployeeCount: 18 },
  { id: 'ws-probation', name: 'Probation', taxCategory: 'PEGAWAI_TETAP', requiresEndDate: true, ...flags, isActive: true, activeEmployeeCount: 5 },
  {
    id: 'ws-intern',
    name: 'Intern',
    taxCategory: 'BUKAN_PEGAWAI',
    requiresEndDate: true,
    deductBpjsTk: true,
    deductBpjsKs: false,
    eligibleForLeave: false,
    eligibleForOvertime: false,
    isActive: true,
    activeEmployeeCount: 3,
  },
  {
    id: 'ws-freelancer',
    name: 'Freelancer',
    taxCategory: 'BUKAN_PEGAWAI',
    requiresEndDate: true,
    deductBpjsTk: false,
    deductBpjsKs: false,
    eligibleForLeave: false,
    eligibleForOvertime: false,
    isActive: true,
    activeEmployeeCount: 0,
  },
];

function assertInput(input: WorkStatusInput, id?: string) {
  const name = input.name.trim();
  if (!NAME.test(name)) {
    throw new Error('422 — Name: start with a letter; letters, digits, spaces, ( ) and - only, at most 50 characters.');
  }
  if (rows.some((row) => row.id !== id && row.name.toLowerCase() === name.toLowerCase())) {
    throw new Error(`409 — A work status named "${name}" already exists.`);
  }
}

export const workStatusService = {
  async search(filter: WorkStatusFilter = {}): Promise<WorkStatus[]> {
    if (MOCK) {
      await delay();
      const keyword = filter.keyword?.trim().toLowerCase() ?? '';
      return rows
        .filter((row) => !keyword || row.name.toLowerCase().includes(keyword))
        .filter((row) => filter.isActive === undefined || row.isActive === filter.isActive)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((row) => ({ ...row }));
    }
    const { data } = await api.post<{ data: WorkStatus[] }>('/employee/work-statuses/search', {
      keyword: filter.keyword || undefined,
      is_active: filter.isActive,
      page: 1,
      size: 100,
    });
    return data.data;
  },

  async create(input: WorkStatusInput): Promise<WorkStatus> {
    if (MOCK) {
      await delay();
      assertInput(input);
      const row: WorkStatus = { ...input, name: input.name.trim(), id: crypto.randomUUID(), isActive: true, activeEmployeeCount: 0 };
      rows = [...rows, row];
      return { ...row };
    }
    const { data } = await api.post<WorkStatus>('/employee/work-statuses', input);
    return data;
  },

  async update(id: string, input: WorkStatusInput): Promise<WorkStatus> {
    if (MOCK) {
      await delay();
      const row = rows.find((item) => item.id === id);
      if (!row) throw new Error('404 — Work status not found.');
      assertInput(input, id);
      if (row.isActive && !input.isActive && row.activeEmployeeCount > 0) {
        throw new Error(`409 — ${row.name} cannot be deactivated because employees still hold it. Move them to another type first.`);
      }
      Object.assign(row, input, { name: input.name.trim() });
      return { ...row };
    }
    const { data } = await api.put<WorkStatus>(`/employee/work-statuses/${id}`, input);
    return data;
  },
};
