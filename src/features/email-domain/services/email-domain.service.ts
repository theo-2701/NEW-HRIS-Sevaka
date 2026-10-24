import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import { DOMAIN_NAME } from '@/features/email-domain/types';
import type { EmailDomain, EmailDomainFilter } from '@/features/email-domain/types';

/**
 * API service Email Domain (TSD-001-EMPLOYEE 0.192 §7.19):
 *   POST /email-domains/search  — ED1, urut nama naik
 *   POST /email-domains         — ED3, disimpan huruf kecil, kembar 409
 *   PUT  /email-domains/{id}    — ED4
 */
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

let rows: EmailDomain[] = [
  { id: 'ed-ptdika-coid', domainName: 'ptdika.co.id', isActive: true },
  { id: 'ed-ptdika-com', domainName: 'ptdika.com', isActive: true },
  { id: 'ed-juaracoding', domainName: 'juaracoding.co.id', isActive: false },
];

function clean(domainName: string, id?: string): string {
  const name = domainName.trim().toLowerCase();
  if (!DOMAIN_NAME.test(name)) {
    throw new Error('422 — Domain Name: letters, digits, hyphens and dots, for example company.co.id.');
  }
  if (rows.some((row) => row.id !== id && row.domainName === name)) throw new Error(`409 — ${name} already exists.`);
  return name;
}

/** Mode dummy: domain dibaca oleh Bulk Import (pembekuan ke batch) tanpa HTTP. */
export function emailDomainName(id: string | null | undefined): string | null {
  return rows.find((row) => row.id === id)?.domainName ?? null;
}

export const emailDomainService = {
  async search(filter: EmailDomainFilter = {}): Promise<EmailDomain[]> {
    if (MOCK) {
      await delay();
      const keyword = filter.keyword?.trim().toLowerCase() ?? '';
      return rows
        .filter((row) => !keyword || row.domainName.includes(keyword))
        .filter((row) => filter.isActive === undefined || row.isActive === filter.isActive)
        .sort((a, b) => a.domainName.localeCompare(b.domainName))
        .map((row) => ({ ...row }));
    }
    const { data } = await api.post<{ data: EmailDomain[] }>('/employee/email-domains/search', {
      keyword: filter.keyword || undefined,
      is_active: filter.isActive,
      page: 1,
      size: 100,
    });
    return data.data;
  },

  async create(domainName: string): Promise<EmailDomain> {
    if (MOCK) {
      await delay();
      const row: EmailDomain = { id: crypto.randomUUID(), domainName: clean(domainName), isActive: true };
      rows = [...rows, row];
      return { ...row };
    }
    const { data } = await api.post<EmailDomain>('/employee/email-domains', { domain_name: domainName });
    return data;
  },

  async update(id: string, input: { domainName: string; isActive: boolean }): Promise<EmailDomain> {
    if (MOCK) {
      await delay();
      const row = rows.find((item) => item.id === id);
      if (!row) throw new Error('404 — Email domain not found.');
      Object.assign(row, { domainName: clean(input.domainName, id), isActive: input.isActive });
      return { ...row };
    }
    const { data } = await api.put<EmailDomain>(`/employee/email-domains/${id}`, {
      domain_name: input.domainName,
      is_active: input.isActive,
    });
    return data;
  },
};
