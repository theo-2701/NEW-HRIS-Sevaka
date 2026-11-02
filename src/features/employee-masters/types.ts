/**
 * Master Employee Directory — TSD-001-EMPLOYEE 0.212 §7.19 (Email Domain) dan
 * §7.13.3 (Work Status). Keduanya: nol hapus fisik, nonaktif ≠ hapus, HR Staff
 * baca saja, HR Manager/Super Admin menulis.
 */
export type MasterRole = 'HR_MANAGER' | 'HR_STAFF';

export const canManageMaster = (role: MasterRole) => role === 'HR_MANAGER';

export interface EmailDomain {
  id: string;
  domainName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmailDomainDraft {
  domainName: string;
  isActive: boolean;
}

export type TaxCategory = 'PEGAWAI_TETAP' | 'BUKAN_PEGAWAI';

export interface WorkStatus {
  id: string;
  workStatusName: string;
  /** Probation/kontrak: akhir masa = `contract_end_date` pegawai. */
  requiresEndDate: boolean;
  taxCategoryCode: TaxCategory;
  deductBpjsTk: boolean;
  deductBpjsKs: boolean;
  eligibleForLeave: boolean;
  eligibleForOvertime: boolean;
  isActive: boolean;
  /** Pegawai WAITING/ACTIVE/OFFBOARDING/SUSPENDED yang memegangnya — dihitung server. */
  activeEmployeeCount: number;
}

export type WorkStatusDraft = Omit<WorkStatus, 'id' | 'activeEmployeeCount'>;

export const TAX_CATEGORY_LABEL: Record<TaxCategory, string> = {
  PEGAWAI_TETAP: 'Employee (pegawai tetap)',
  BUKAN_PEGAWAI: 'Non-employee (bukan pegawai)',
};

/** Pola server (§7.19): minimal dua label, huruf/angka/tanda hubung. */
export const DOMAIN_PATTERN = /^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)+$/;
/** Pola server (§7.13.3). */
export const WORK_STATUS_PATTERN = /^[A-Za-z][A-Za-z0-9 ()-]*$/;

export type ActiveFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';
