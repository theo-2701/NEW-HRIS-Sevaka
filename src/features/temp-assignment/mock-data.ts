import { EMPLOYEES } from '@/features/time-off/mock-data';
import type { OrgUnit, Seat, TaSession, TempAssignment } from '@/features/temp-assignment/types';

/** "Hari ini" dataset — tanggal mulai tidak boleh sebelum ini. */
export const TA_TODAY = '2026-11-02';

export const TA_VIEWERS: TaSession[] = [
  { employeeId: 'emp-sari', role: 'HR_STAFF' },
  { employeeId: 'emp-hendra', role: 'HR_MANAGER' },
];

/** Unit organisasi dan kursinya (dibaca dari company `group-struct-positions` di backend). */
export const ORG_UNITS: OrgUnit[] = [
  { id: 'ou-fin', name: 'Finance Division' },
  { id: 'ou-ops', name: 'Operations Division' },
  { id: 'ou-proj', name: 'Project Alpha' },
];

export const SEATS: Seat[] = [
  { id: 'pos-fin-staff', name: 'Finance Staff', orgUnitId: 'ou-fin', occupantId: 'emp-rina' },
  { id: 'pos-fin-hrm', name: 'HR Manager', orgUnitId: 'ou-fin', occupantId: 'emp-hendra' },
  { id: 'pos-fin-analyst', name: 'Financial Analyst', orgUnitId: 'ou-fin', occupantId: null },
  { id: 'pos-ops-staff', name: 'Operations Staff', orgUnitId: 'ou-ops', occupantId: 'emp-sari' },
  { id: 'pos-ops-spv', name: 'Operations Supervisor', orgUnitId: 'ou-ops', occupantId: 'emp-budi' },
  { id: 'pos-ops-planner', name: 'Operations Planner', orgUnitId: 'ou-ops', occupantId: null },
  { id: 'pos-proj-lead', name: 'Project Lead', orgUnitId: 'ou-proj', occupantId: null },
  { id: 'pos-proj-analyst', name: 'Project Analyst', orgUnitId: 'ou-proj', occupantId: 'emp-budi' },
];

export const TEMP_ASSIGNMENTS: TempAssignment[] = [
  {
    id: 'ta-1',
    employeeId: 'emp-budi',
    assignmentType: 'SECONDMENT',
    homePosId: 'pos-ops-spv',
    assignedPosId: 'pos-proj-analyst',
    startDate: '2026-10-01',
    returnDate: '2026-12-31',
    status: 'ACTIVE',
    reason: 'Dukungan analisis untuk Project Alpha selama fase rollout.',
    returnTrigger: null,
    approvedBy: 'emp-hendra',
    approvedAt: '2026-09-25T10:00:00+07:00',
    returnedAt: null,
    createdAt: '2026-09-24T09:00:00+07:00',
    createdByEmployeeId: 'emp-sari',
  },
  {
    id: 'ta-2',
    employeeId: 'emp-rina',
    assignmentType: 'ROTATION',
    homePosId: 'pos-fin-staff',
    assignedPosId: 'pos-ops-planner',
    startDate: '2026-11-16',
    returnDate: '2027-02-15',
    status: 'IN_APPROVAL',
    reason: 'Rotasi pengembangan ke Operations.',
    returnTrigger: null,
    approvedBy: null,
    approvedAt: null,
    returnedAt: null,
    createdAt: '2026-10-30T14:00:00+07:00',
    createdByEmployeeId: 'emp-sari',
  },
];

export const taEmployeeName = (id: string | null) => (id ? (EMPLOYEES.find((row) => row.id === id)?.name ?? id) : '—');
export const TA_EMPLOYEES = EMPLOYEES;
