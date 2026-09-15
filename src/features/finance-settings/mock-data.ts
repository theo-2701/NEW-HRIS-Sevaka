import { PURPOSE_TYPES } from '@/features/cash-advance/mock-data';
import type { Actor, LoanLimit, RejectionReason } from '@/features/finance-settings/types';

/**
 * Dataset skenario positif FSD/UIC-001-FINANCE 0.2 (company PTDIKA) untuk FT1.
 *
 * Satu sumber data dengan modul pemakainya: jenis keperluan disalin dari seed Cash
 * Advance, golongan dari seed Loan. Penyimpangan dari prototype:
 *  • prototype menandai lima sebab penolakan `is_system_default=true`; ERD §6.9
 *    (`uq_mst_rejection_reason_system_default`) mengizinkan **tepat satu** — hanya
 *    "Other" yang bawaan sistem (dan `requires_free_text=true`).
 */

export { JOB_GRADES, gradeName } from '@/features/loan/mock-data';

export const PURPOSE_TYPE_SEED = PURPOSE_TYPES;

/** Aktor uji UIC §1.7. */
export const VIEWERS: (Actor & { label: string })[] = [
  { employeeId: 'emp-rahmat', role: 'ROLE_FINANCE_OFFICER', label: 'Rahmat Hidayat · Finance Officer' },
  { employeeId: 'emp-ari', role: 'ROLE_HR_MANAGER', label: 'Ari Wibowo · HR Manager' },
  { employeeId: 'emp-budi', role: 'ROLE_EMPLOYEE', label: 'Budi Santoso · Employee' },
];

const base = { createdAt: '2026-07-01', updatedAt: null, deletedAt: null };

export const LOAN_LIMITS: LoanLimit[] = [
  { id: 'll-1', jobGradeId: 'jg-staff-1', limitAmount: 15_000_000, isActive: true, ...base },
  { id: 'll-2', jobGradeId: 'jg-staff-2', limitAmount: 30_000_000, isActive: true, ...base },
  { id: 'll-3', jobGradeId: 'jg-staff-3', limitAmount: 40_000_000, isActive: true, ...base },
  { id: 'll-4', jobGradeId: 'jg-spv-1', limitAmount: 60_000_000, isActive: true, ...base },
  { id: 'll-5', jobGradeId: 'jg-mgr-1', limitAmount: 90_000_000, isActive: false, ...base },
];

export const REJECTION_REASONS: RejectionReason[] = [
  { id: 'rr-1', name: 'Incomplete receipt evidence', requiresFreeText: false, isSystemDefault: false, isActive: true, deletedAt: null },
  { id: 'rr-2', name: 'Outside company policy', requiresFreeText: false, isSystemDefault: false, isActive: true, deletedAt: null },
  { id: 'rr-3', name: 'Exceeds the entitlement', requiresFreeText: false, isSystemDefault: false, isActive: true, deletedAt: null },
  { id: 'rr-4', name: 'Submitted data does not match', requiresFreeText: true, isSystemDefault: false, isActive: true, deletedAt: null },
  { id: 'rr-5', name: 'Other', requiresFreeText: true, isSystemDefault: true, isActive: true, deletedAt: null },
  { id: 'rr-6', name: 'Cost estimate is unreasonable', requiresFreeText: true, isSystemDefault: false, isActive: true, deletedAt: null },
];
