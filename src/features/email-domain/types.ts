/**
 * Email Domain — master domain surel perusahaan (FSD-001-EMPLOYEE 0.83 §12 · TSD 0.192 §7.19).
 * Banyak domain per tenant, tanpa bawaan; tidak pernah dihapus, hanya dinonaktifkan.
 */
export interface EmailDomain {
  id: string;
  domainName: string;
  isActive: boolean;
}

export interface EmailDomainFilter {
  keyword?: string;
  isActive?: boolean;
}

/** Huruf/angka/tanda hubung/titik, minimal dua label (mis. company.co.id). */
export const DOMAIN_NAME = /^(?=.{1,100}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i;

export const canManageEmailDomain = (role?: string) => role === 'ROLE_HR_MANAGER' || role === 'ROLE_SUPER_ADMIN';
