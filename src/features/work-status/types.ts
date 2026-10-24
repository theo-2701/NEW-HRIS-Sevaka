/**
 * Work Status — master jenis status kerja (FSD-001-EMPLOYEE 0.83 §11 · TSD 0.192 §7.13.3).
 * Baris tidak pernah dihapus; jenis yang masih dipegang karyawan tidak dapat dinonaktifkan.
 */
export type TaxCategory = 'PEGAWAI_TETAP' | 'BUKAN_PEGAWAI';

export interface WorkStatus {
  id: string;
  name: string;
  taxCategory: TaxCategory;
  requiresEndDate: boolean;
  deductBpjsTk: boolean;
  deductBpjsKs: boolean;
  eligibleForLeave: boolean;
  eligibleForOvertime: boolean;
  isActive: boolean;
  /** Karyawan WAITING/ACTIVE/OFFBOARDING/SUSPENDED yang memegang jenis ini. */
  activeEmployeeCount: number;
}

export type WorkStatusInput = Omit<WorkStatus, 'id' | 'activeEmployeeCount'>;

export interface WorkStatusFilter {
  keyword?: string;
  isActive?: boolean;
}

export const TAX_CATEGORY_LABEL: Record<TaxCategory, string> = {
  PEGAWAI_TETAP: 'Permanent employee tax',
  BUKAN_PEGAWAI: 'Non-employee tax',
};

/** HR Staff membaca; HR Manager · Super Admin mengelola. */
export const canManageWorkStatus = (role?: string) => role === 'ROLE_HR_MANAGER' || role === 'ROLE_SUPER_ADMIN';
