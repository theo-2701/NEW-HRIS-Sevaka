import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import { EMAIL_DOMAINS, WORK_STATUSES } from '@/features/employee-masters/mock-data';
import { DOMAIN_PATTERN, WORK_STATUS_PATTERN, canManageMaster } from '@/features/employee-masters/types';
import type {
  ActiveFilter,
  EmailDomain,
  EmailDomainDraft,
  MasterRole,
  WorkStatus,
  WorkStatusDraft,
} from '@/features/employee-masters/types';

/**
 * Endpoint kontrak (TSD-001-EMPLOYEE 0.212):
 *   POST /employee/email-domains/search · GET/PUT …/{id} · POST /employee/email-domains   (§7.19)
 *   POST /employee/work-statuses/search · GET/PUT …/{id} · POST /employee/work-statuses   (§7.13.3)
 */
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

let domains: EmailDomain[] = EMAIL_DOMAINS.map((row) => ({ ...row }));
let statuses: WorkStatus[] = WORK_STATUSES.map((row) => ({ ...row }));

export function resetMasterMocks() {
  domains = EMAIL_DOMAINS.map((row) => ({ ...row }));
  statuses = WORK_STATUSES.map((row) => ({ ...row }));
}

export interface MasterFilter {
  keyword?: string;
  active?: ActiveFilter;
}

const matchesActive = (isActive: boolean, active: ActiveFilter = 'ALL') =>
  active === 'ALL' || (active === 'ACTIVE') === isActive;

const toActiveParam = (active: ActiveFilter = 'ALL') => (active === 'ALL' ? undefined : active === 'ACTIVE');

function requireWriter(role: MasterRole, code: string) {
  if (!canManageMaster(role)) throw new Error(`403 ${code} — HR Staff hanya boleh membaca.`);
}

export const mastersService = {
  async emailDomains(filter: MasterFilter = {}): Promise<EmailDomain[]> {
    if (MOCK) {
      await delay(150);
      const keyword = filter.keyword?.trim().toLowerCase() ?? '';
      return domains
        .filter((row) => row.domainName.includes(keyword) && matchesActive(row.isActive, filter.active))
        .sort((a, b) => a.domainName.localeCompare(b.domainName))
        .map((row) => ({ ...row }));
    }
    const { data } = await api.post<{ data: EmailDomain[] }>('/employee/email-domains/search', {
      keyword: filter.keyword || undefined,
      is_active: toActiveParam(filter.active),
    });
    return data.data;
  },

  /** Tambah selalu aktif; ubah membawa `is_active`. Disimpan huruf kecil. */
  async saveEmailDomain(role: MasterRole, draft: EmailDomainDraft, id?: string): Promise<EmailDomain> {
    const domainName = draft.domainName.trim().toLowerCase();
    if (MOCK) {
      await delay(300);
      requireWriter(role, 'EMP-AUZ-618');
      if (!domainName || domainName.length > 100 || !DOMAIN_PATTERN.test(domainName)) {
        throw new Error('422 EMP-VAL-617 — nama domain tidak sah (contoh: ptdika.co.id).');
      }
      if (domains.some((row) => row.domainName === domainName && row.id !== id)) {
        throw new Error('409 EMP-CNF-619 — domain itu sudah terdaftar.');
      }
      const now = new Date().toISOString();
      if (id) {
        const row = domains.find((item) => item.id === id);
        if (!row) throw new Error('404 EMP-NFD-616 — domain tidak ditemukan.');
        Object.assign(row, { domainName, isActive: draft.isActive, updatedAt: now });
        return { ...row };
      }
      const row: EmailDomain = { id: `ed-${crypto.randomUUID().slice(0, 6)}`, domainName, isActive: true, createdAt: now, updatedAt: now };
      domains = [...domains, row];
      return { ...row };
    }
    const body = { domain_name: domainName, is_active: id ? draft.isActive : undefined };
    const { data } = id
      ? await api.put<EmailDomain>(`/employee/email-domains/${id}`, body)
      : await api.post<EmailDomain>('/employee/email-domains', body);
    return data;
  },

  async workStatuses(filter: MasterFilter = {}): Promise<WorkStatus[]> {
    if (MOCK) {
      await delay(150);
      const keyword = filter.keyword?.trim().toLowerCase() ?? '';
      return statuses
        .filter((row) => row.workStatusName.toLowerCase().includes(keyword) && matchesActive(row.isActive, filter.active))
        .sort((a, b) => a.workStatusName.localeCompare(b.workStatusName))
        .map((row) => ({ ...row }));
    }
    const { data } = await api.post<{ data: WorkStatus[] }>('/employee/work-statuses/search', {
      keyword: filter.keyword || undefined,
      is_active: toActiveParam(filter.active),
    });
    return data.data;
  },

  async saveWorkStatus(role: MasterRole, draft: WorkStatusDraft, id?: string): Promise<WorkStatus> {
    const workStatusName = draft.workStatusName.trim();
    if (MOCK) {
      await delay(300);
      requireWriter(role, 'EMP-AUZ-573');
      if (!workStatusName || workStatusName.length > 50 || !WORK_STATUS_PATTERN.test(workStatusName)) {
        throw new Error('422 EMP-VAL-572 — nama status kerja tidak sah.');
      }
      const lower = workStatusName.toLowerCase();
      if (statuses.some((row) => row.workStatusName.toLowerCase() === lower && row.id !== id)) {
        throw new Error('409 EMP-CNF-574 — nama status kerja sudah dipakai.');
      }
      if (id) {
        const row = statuses.find((item) => item.id === id);
        if (!row) throw new Error('404 EMP-NFD-571 — status kerja tidak ditemukan.');
        if (row.isActive && !draft.isActive && row.activeEmployeeCount > 0) {
          throw new Error(
            `409 EMP-CNF-575 — masih dipegang ${row.activeEmployeeCount} pegawai aktif; pindahkan dulu sebelum menonaktifkan.`,
          );
        }
        Object.assign(row, { ...draft, workStatusName });
        return { ...row };
      }
      const row: WorkStatus = {
        ...draft,
        workStatusName,
        id: `ws-${crypto.randomUUID().slice(0, 6)}`,
        isActive: true,
        activeEmployeeCount: 0,
      };
      statuses = [...statuses, row];
      return { ...row };
    }
    const body = {
      work_status_name: workStatusName,
      requires_end_date: draft.requiresEndDate,
      tax_category_code: draft.taxCategoryCode,
      deduct_bpjs_tk: draft.deductBpjsTk,
      deduct_bpjs_ks: draft.deductBpjsKs,
      eligible_for_leave: draft.eligibleForLeave,
      eligible_for_overtime: draft.eligibleForOvertime,
      is_active: id ? draft.isActive : undefined,
    };
    const { data } = id
      ? await api.put<WorkStatus>(`/employee/work-statuses/${id}`, body)
      : await api.post<WorkStatus>('/employee/work-statuses', body);
    return data;
  },
};
