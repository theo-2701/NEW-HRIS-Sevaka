import type { Actor, DisputeHoldRow, ExportLog, MedicalAccessLog, Role } from '@/features/finance-security/types';

/**
 * Dataset skenario positif FSD/UIC-001-FINANCE 0.2 (company PTDIKA) untuk FT8.
 *
 * `HOLD_SEED` adalah satu-satunya sumber penandaan sengketa — Benefit, Loan, dan
 * Pencairan & Piutang membacanya lewat `holds-store`, bukan seed milik sendiri.
 */

export { EMPLOYEES, employeeName, employeeOf } from '@/features/cash-advance/mock-data';

/** Peran tiap aktor dataset — untuk kolom "oleh" di grid jejak. */
export const ROLE_OF: Record<string, Role> = {
  'emp-budi': 'ROLE_EMPLOYEE',
  'emp-sinta': 'ROLE_DEPT_MANAGER',
  'emp-rahmat': 'ROLE_FINANCE_OFFICER',
  'emp-ari': 'ROLE_HR_MANAGER',
  'emp-maya': 'ROLE_HEALTH_DATA_OFFICER',
};

/** Aktor uji UIC §7 — Maya untuk memperlihatkan pembuka ≠ auditor (403). */
export const VIEWERS: (Actor & { label: string })[] = [
  { employeeId: 'emp-rahmat', role: 'ROLE_FINANCE_OFFICER', label: 'Rahmat Hidayat · Finance Officer' },
  { employeeId: 'emp-ari', role: 'ROLE_HR_MANAGER', label: 'Ari Wibowo · HR Manager' },
  { employeeId: 'emp-maya', role: 'ROLE_HEALTH_DATA_OFFICER', label: 'Maya Puspita · Health Data Officer' },
];

const released = { releasedBy: null, releasedAt: null, releasedAtTimezone: null, releasedReasonNote: null };

export const HOLD_SEED: DisputeHoldRow[] = [
  {
    id: 'hold-46', targetType: 'BENEFIT_CLAIM', targetId: 'clm-46', targetRequestNo: 'CLM-2026-000046', isActive: true,
    createdBy: 'emp-rahmat', createdAt: '2026-07-15T09:00:00+07:00', ...released,
  },
  {
    id: 'hold-21', targetType: 'LOAN', targetId: 'loan-21', targetRequestNo: 'LON-2026-000021', isActive: true,
    createdBy: 'emp-ari', createdAt: '2026-07-29T10:00:00+07:00', ...released,
  },
  {
    id: 'hold-72', targetType: 'CASH_ADVANCE', targetId: 'adv-72', targetRequestNo: 'ADV-2026-000072', isActive: false,
    createdBy: 'emp-rahmat', createdAt: '2026-06-11T08:30:00+07:00', releasedBy: 'emp-ari',
    releasedAt: '2026-06-20T11:00:00+07:00', releasedAtTimezone: 'Asia/Jakarta',
    releasedReasonNote: 'Clarified with the employee — the original receipt was found',
  },
];

export const EXPORT_LOGS: ExportLog[] = [
  {
    id: 'exp-1', scope: 'DISBURSEMENT', filterCriteria: { start_date: '2026-07-01', end_date: '2026-07-31' }, rowCount: 12,
    downloadedAt: '2026-07-31T16:04:00+07:00', downloadedAtTimezone: 'Asia/Jakarta', createdBy: 'emp-rahmat',
  },
  {
    id: 'exp-2', scope: 'BENEFIT_CLAIM', filterCriteria: { start_date: '2026-06-01', end_date: '2026-06-30' }, rowCount: 34,
    downloadedAt: '2026-07-01T09:12:00+07:00', downloadedAtTimezone: 'Asia/Jakarta', createdBy: 'emp-rahmat',
  },
  {
    id: 'exp-3', scope: 'LOAN', filterCriteria: { start_date: '2026-01-01', end_date: '2026-06-30' }, rowCount: 8,
    downloadedAt: '2026-07-02T11:40:00+07:00', downloadedAtTimezone: 'Asia/Jakarta', createdBy: 'emp-rahmat',
  },
];

export const MEDICAL_LOGS: MedicalAccessLog[] = [
  {
    id: 'mdl-1', employeeId: 'emp-budi', claimItemId: 'ci-45-1', documentId: 'doc-rs-melati-0231',
    accessedAt: '2026-07-11T13:20:00+07:00', accessedAtTimezone: 'Asia/Jakarta', createdBy: 'emp-maya',
  },
  {
    id: 'mdl-2', employeeId: 'emp-budi', claimItemId: 'ci-46-2', documentId: 'doc-kln-sehat-1102',
    accessedAt: '2026-07-23T08:41:00+07:00', accessedAtTimezone: 'Asia/Jakarta', createdBy: 'emp-ari',
  },
  {
    id: 'mdl-3', employeeId: 'emp-budi', claimItemId: 'ci-38-1', documentId: 'doc-apt-sehat-0912',
    accessedAt: '2026-05-15T15:02:00+07:00', accessedAtTimezone: 'Asia/Jakarta', createdBy: 'emp-maya',
  },
];
