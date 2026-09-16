import type { Actor, EmployeeValue, UmpAttestation } from '@/features/salary-settings/types';

/** Dataset skenario positif UIC-001-PAYROLL §4 sisi Penjalan (maker). */

export const VIEWERS: (Actor & { label: string })[] = [
  { employeeId: 'emp-rudi', role: 'ROLE_PAYROLL_OFFICER', label: 'Rudi Hartono · Payroll Officer' },
  { employeeId: 'emp-maya', role: 'ROLE_HR_MANAGER', label: 'Maya Anggraini · HR Manager' },
];

const at = (date: string, time = '09:00') => `${date}T${time}:00+07:00`;

/** Upah minimum per cabang — dibaca dari company-service, tidak pernah disimpan payroll. */
export const REGIONAL_WAGE: Record<string, number> = {
  Bandung: 4209309,
  'Jakarta Pusat': 5396761,
  Semarang: 3243969,
};

/** Ambang eskalasi kumpulan massal (`payroll.bulk_change_escalation_count`). */
export const BULK_ESCALATION_THRESHOLD = 5;

export const ESCALATION_APPROVER_ID = 'emp-hesti';

/** Baris `ver_emp_salary_component` yang sudah disetujui — riwayat nilai berjalan. */
export const VALUE_SEED: EmployeeValue[] = [
  {
    id: 'EV-0001',
    employeeId: 'pay-indah',
    salaryComponentId: 'SC-001',
    amount: 5000000,
    effectiveFrom: '2025-01-01',
    effectiveUntil: '2025-12-31',
    approvalState: 'DISETUJUI',
    sourceChannel: 'ONBOARDING',
  },
  {
    id: 'EV-0002',
    employeeId: 'pay-indah',
    salaryComponentId: 'SC-001',
    amount: 5600000,
    effectiveFrom: '2026-01-01',
    effectiveUntil: null,
    approvalState: 'DISETUJUI',
    sourceChannel: 'CHANGE',
  },
  {
    id: 'EV-0003',
    employeeId: 'pay-indah',
    salaryComponentId: 'SC-002',
    amount: 750000,
    effectiveFrom: '2026-01-01',
    effectiveUntil: null,
    approvalState: 'DISETUJUI',
    sourceChannel: 'ONBOARDING',
  },
  {
    id: 'EV-0004',
    employeeId: 'pay-dewi',
    salaryComponentId: 'SC-001',
    amount: 4000000,
    effectiveFrom: '2026-01-01',
    effectiveUntil: null,
    approvalState: 'DISETUJUI',
    sourceChannel: 'ONBOARDING',
  },
  {
    id: 'EV-0005',
    employeeId: 'pay-bayu',
    salaryComponentId: 'SC-001',
    amount: 4300000,
    effectiveFrom: '2026-01-01',
    effectiveUntil: null,
    approvalState: 'DISETUJUI',
    sourceChannel: 'ONBOARDING',
  },
  {
    id: 'EV-0006',
    employeeId: 'pay-agus',
    salaryComponentId: 'SC-001',
    amount: 5500000,
    effectiveFrom: '2026-01-01',
    effectiveUntil: null,
    approvalState: 'DISETUJUI',
    sourceChannel: 'ONBOARDING',
  },
];

export const ATTESTATION_SEED: UmpAttestation[] = [
  {
    id: 'ATT-0001',
    employeeId: 'pay-dewi',
    checkPoint: 'PENETAPAN_ATAU_PERUBAHAN',
    regionalWageCompared: 4209309,
    salaryBaseCompared: 4000000,
    isBelowUmp: true,
    selectedReason: 'LAINNYA',
    reasonNote:
      'Karyawan dalam masa penyesuaian jabatan — kenaikan dijadwalkan pada kumpulan perubahan semester 2.',
    periodId: null,
    createdBy: 'emp-rudi',
    createdAt: at('2026-07-12'),
  },
  {
    id: 'ATT-0002',
    employeeId: 'pay-dewi',
    checkPoint: 'PERIODE_DIJALANKAN',
    regionalWageCompared: 4209309,
    salaryBaseCompared: 4000000,
    isBelowUmp: true,
    selectedReason: null,
    reasonNote: null,
    periodId: 'per-2026-09',
    createdBy: 'SYSTEM_PAYROLL_RUN',
    createdAt: at('2026-09-26'),
  },
];
