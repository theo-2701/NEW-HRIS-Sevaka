import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import { toIsoDate } from '@/lib/format';
import { CURRENT_USER, CURRENT_USER_ID } from '@/features/manpower/types';
import { employeeService } from '@/features/employees/services/employee.service';
import { ASSIGNMENT_SEATS } from '@/features/temporary-assignment/types';
import type {
  AssignmentDraft,
  AssignmentFilter,
  AssignmentStatus,
  TemporaryAssignment,
} from '@/features/temporary-assignment/types';

/**
 * API service Temporary Assignment (TSD-001-EMPLOYEE 0.192 §7.18):
 *   POST /temporary-assignments/search         — urut created_at turun
 *   POST /temporary-assignments                — Idempotency-Key; 409 penugasan/transisi terbuka, 422 kursi/tanggal
 *   GET  /temporary-assignments/{id}
 *   POST /temporary-assignments/{id}/approve   — checker ≠ pengaju (409); mulai ≤ hari ini ⇒ langsung ACTIVE
 *   POST /temporary-assignments/{id}/reject
 *   POST /temporary-assignments/{id}/cancel    — IN_APPROVAL/APPROVED; pengaju atau checker
 *   POST /temporary-assignments/{id}/return    — ACTIVE; kursi penugasan kosong lagi
 *   POST /temporary-assignments/{id}/extend    — APPROVED/ACTIVE; tanggal baru > tanggal kembali & > hari ini
 * Sapuan harian 01:00 WIB mengaktifkan dan memulangkan — di mode dummy dijalankan tiap kali daftar dibaca.
 */
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));
const today = () => toIsoDate(new Date());
const addDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
};
const OPEN: AssignmentStatus[] = ['IN_APPROVAL', 'APPROVED', 'ACTIVE'];

const base = {
  reason: '',
  returnTrigger: null,
  approvedBy: null,
  approvedAt: null,
  returnedOn: null,
} as const;

let rows: TemporaryAssignment[] = [
  {
    ...base,
    id: 'ta-6',
    employeeId: 'emp-nur',
    employeeName: 'Nur Aisyah',
    employeeNik: 'NIK-0022',
    homeSeat: 'Legal Officer',
    assignmentType: 'SECONDMENT',
    assignedSeatId: 'seat-fin-ap-03',
    startDate: addDays(10),
    returnDate: addDays(70),
    reason: 'Support the Papua branch audit.',
    status: 'APPROVED',
    approvedBy: 'Tony Stark',
    approvedAt: `${addDays(-2)}T10:00:00+07:00`,
    createdAt: `${addDays(-4)}T09:00:00+07:00`,
    createdBy: 'Lia Permata',
    createdById: 'usr-lia-permata',
  },
  {
    ...base,
    id: 'ta-3',
    employeeId: 'emp-yoga',
    employeeName: 'Yoga Pratama',
    employeeNik: 'NIK-0036',
    homeSeat: 'Data Analyst',
    assignmentType: 'ROTATION',
    assignedSeatId: 'seat-sls-exe-11',
    startDate: addDays(3),
    returnDate: addDays(33),
    reason: 'Learn the sales pipeline before the new dashboard project.',
    status: 'IN_APPROVAL',
    createdAt: `${addDays(-1)}T14:00:00+07:00`,
    createdBy: CURRENT_USER,
    createdById: CURRENT_USER_ID,
  },
  {
    ...base,
    id: 'ta-2',
    employeeId: 'emp-eka',
    employeeName: 'Eka Saputra',
    employeeNik: 'NIK-0005',
    homeSeat: 'Staff Finance',
    assignmentType: 'SECONDMENT',
    assignedSeatId: 'seat-ops-wh-07',
    startDate: addDays(7),
    returnDate: addDays(67),
    reason: 'Stock-take support for the Jakarta warehouse.',
    status: 'IN_APPROVAL',
    createdAt: `${addDays(-2)}T08:30:00+07:00`,
    createdBy: 'Lia Permata',
    createdById: 'usr-lia-permata',
  },
  {
    ...base,
    id: 'ta-1',
    employeeId: 'emp-doni',
    employeeName: 'Doni Prabowo',
    employeeNik: 'NIK-0027',
    homeSeat: 'Field Technician',
    assignmentType: 'ROTATION',
    assignedSeatId: 'seat-eng-qa-02',
    startDate: addDays(-20),
    returnDate: addDays(40),
    status: 'ACTIVE',
    approvedBy: 'Tony Stark',
    approvedAt: `${addDays(-25)}T10:00:00+07:00`,
    createdAt: `${addDays(-27)}T09:00:00+07:00`,
    createdBy: 'Lia Permata',
    createdById: 'usr-lia-permata',
  },
  {
    ...base,
    id: 'ta-5',
    employeeId: 'emp-lia',
    employeeName: 'Lia Permata',
    employeeNik: 'NIK-0012',
    homeSeat: 'HR Specialist',
    assignmentType: 'SECONDMENT',
    assignedSeatId: 'seat-eng-be-07',
    startDate: addDays(-30),
    returnDate: addDays(30),
    status: 'REJECTED',
    approvedBy: 'Tony Stark',
    approvedAt: `${addDays(-35)}T10:00:00+07:00`,
    createdAt: `${addDays(-36)}T09:00:00+07:00`,
    createdBy: 'Sari Dewanti',
    createdById: 'usr-sari-dewanti',
  },
  {
    ...base,
    id: 'ta-4',
    employeeId: 'emp-nur',
    employeeName: 'Nur Aisyah',
    employeeNik: 'NIK-0022',
    homeSeat: 'Legal Officer',
    assignmentType: 'ROTATION',
    assignedSeatId: 'seat-ops-wh-07',
    startDate: addDays(-60),
    returnDate: addDays(-5),
    status: 'RETURNED',
    returnTrigger: 'RETURN_DATE',
    returnedOn: addDays(-5),
    approvedBy: 'Tony Stark',
    approvedAt: `${addDays(-62)}T10:00:00+07:00`,
    createdAt: `${addDays(-63)}T09:00:00+07:00`,
    createdBy: 'Lia Permata',
    createdById: 'usr-lia-permata',
  },
];

/** Sapuan harian: APPROVED yang sudah mulai ⇒ ACTIVE; ACTIVE yang lewat tanggal kembali ⇒ RETURNED. */
function sweep() {
  const now = today();
  for (const row of rows) {
    if (row.status === 'APPROVED' && row.startDate <= now) row.status = 'ACTIVE';
    if (row.status === 'ACTIVE' && row.returnDate < now) {
      Object.assign(row, { status: 'RETURNED', returnTrigger: 'RETURN_DATE', returnedOn: row.returnDate });
    }
  }
}

/** Kursi kosong = belum dipegang penugasan APPROVED/ACTIVE (dummy; company-service yang sesungguhnya). */
export function vacantSeats(unitId: string, exceptId?: string) {
  return ASSIGNMENT_SEATS.filter(
    (seat) =>
      seat.unitId === unitId &&
      !rows.some((row) => row.id !== exceptId && row.assignedSeatId === seat.id && (row.status === 'APPROVED' || row.status === 'ACTIVE')),
  );
}

function find(id: string) {
  const row = rows.find((item) => item.id === id);
  if (!row) throw new Error('404 — Assignment not found.');
  return row;
}

function assertStatus(row: TemporaryAssignment, allowed: AssignmentStatus[], action: string) {
  if (!allowed.includes(row.status)) throw new Error(`409 — This assignment can no longer be ${action}.`);
}

function assertChecker(row: TemporaryAssignment) {
  if (row.createdById === CURRENT_USER_ID) throw new Error('409 — You submitted this request, so someone else must decide it.');
}

export const temporaryAssignmentService = {
  async search(filter: AssignmentFilter = {}): Promise<TemporaryAssignment[]> {
    if (MOCK) {
      await delay();
      sweep();
      const keyword = filter.keyword?.trim().toLowerCase() ?? '';
      return rows
        .filter((row) => !keyword || `${row.employeeName} ${row.employeeNik}`.toLowerCase().includes(keyword))
        .filter((row) => !filter.statuses?.length || filter.statuses.includes(row.status))
        .filter((row) => !filter.assignmentType || row.assignmentType === filter.assignmentType)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((row) => ({ ...row }));
    }
    const { data } = await api.post<{ data: TemporaryAssignment[] }>('/employee/temporary-assignments/search', {
      keyword: filter.keyword || undefined,
      status_in: filter.statuses?.length ? filter.statuses : undefined,
      assignment_type: filter.assignmentType,
      page: 1,
      size: 100,
    });
    return data.data;
  },

  async create(draft: AssignmentDraft, idempotencyKey: string): Promise<TemporaryAssignment> {
    if (MOCK) {
      await delay(400);
      const { rows: people } = await employeeService.search({
        keyword: '',
        branchId: '',
        createdFrom: '',
        createdTo: '',
        employmentStatus: [],
        page: 1,
        size: 500,
        sortBy: 'name',
        sortDir: 'ASC',
      });
      const person = people.find((item) => item.id === draft.employeeId);
      if (!person || person.employmentStatus !== 'ACTIVE') throw new Error('422 — Only an active employee can be assigned.');
      if (!draft.assignmentType) throw new Error('422 — Choose the type.');
      if (rows.some((row) => row.employeeId === draft.employeeId && OPEN.includes(row.status))) {
        throw new Error(`409 — ${person.name} already has an open temporary assignment.`);
      }
      if (!vacantSeats(draft.unitId).some((seat) => seat.id === draft.assignedSeatId)) {
        throw new Error('422 — The assignment seat must be a vacant seat of the chosen unit.');
      }
      if (!draft.startDate || draft.startDate < today()) throw new Error('422 — The start date cannot be in the past.');
      if (!draft.returnDate || draft.returnDate <= draft.startDate) throw new Error('422 — The return date must be after the start date.');
      if (draft.reason.length > 500) throw new Error('422 — The reason is at most 500 characters.');
      const row: TemporaryAssignment = {
        ...base,
        id: `ta-${idempotencyKey.slice(0, 8)}`,
        employeeId: person.id,
        employeeName: person.name,
        employeeNik: person.nik,
        homeSeat: person.position,
        assignmentType: draft.assignmentType,
        assignedSeatId: draft.assignedSeatId,
        startDate: draft.startDate,
        returnDate: draft.returnDate,
        reason: draft.reason.trim(),
        status: 'IN_APPROVAL',
        createdAt: new Date().toISOString(),
        createdBy: CURRENT_USER,
        createdById: CURRENT_USER_ID,
      };
      if (!rows.some((item) => item.id === row.id)) rows = [row, ...rows];
      return { ...row };
    }
    const { unitId: _unit, ...body } = draft;
    const { data } = await api.post<TemporaryAssignment>('/employee/temporary-assignments', body, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    return data;
  },

  async approve(id: string): Promise<void> {
    if (MOCK) {
      await delay();
      const row = find(id);
      assertStatus(row, ['IN_APPROVAL'], 'approved');
      assertChecker(row);
      Object.assign(row, {
        status: row.startDate <= today() ? 'ACTIVE' : 'APPROVED',
        approvedBy: CURRENT_USER,
        approvedAt: new Date().toISOString(),
      });
      return;
    }
    await api.post(`/employee/temporary-assignments/${id}/approve`, {});
  },

  async reject(id: string): Promise<void> {
    if (MOCK) {
      await delay();
      const row = find(id);
      assertStatus(row, ['IN_APPROVAL'], 'rejected');
      assertChecker(row);
      Object.assign(row, { status: 'REJECTED', approvedBy: CURRENT_USER, approvedAt: new Date().toISOString() });
      return;
    }
    await api.post(`/employee/temporary-assignments/${id}/reject`, {});
  },

  async cancel(id: string): Promise<void> {
    if (MOCK) {
      await delay();
      const row = find(id);
      assertStatus(row, ['IN_APPROVAL', 'APPROVED'], 'cancelled');
      row.status = 'CANCELLED';
      return;
    }
    await api.post(`/employee/temporary-assignments/${id}/cancel`, {});
  },

  async returnEarly(id: string): Promise<void> {
    if (MOCK) {
      await delay();
      const row = find(id);
      assertStatus(row, ['ACTIVE'], 'returned early');
      Object.assign(row, { status: 'RETURNED', returnTrigger: 'EARLY', returnedOn: today() });
      return;
    }
    await api.post(`/employee/temporary-assignments/${id}/return`, {});
  },

  async extend(id: string, returnDate: string): Promise<void> {
    if (MOCK) {
      await delay();
      const row = find(id);
      assertStatus(row, ['APPROVED', 'ACTIVE'], 'extended');
      if (returnDate <= row.returnDate || returnDate <= today()) {
        throw new Error('422 — The new return date must be after the current return date and after today.');
      }
      row.returnDate = returnDate;
      return;
    }
    await api.post(`/employee/temporary-assignments/${id}/extend`, { return_date: returnDate });
  },
};
