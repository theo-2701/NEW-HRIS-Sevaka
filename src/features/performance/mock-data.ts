import type {
  AuditActor,
  EligibilityEntry,
  NotAssessableReason,
  OutOfAssessmentReason,
  PerfActor,
  ReviewPeriod,
} from '@/features/performance/types';

/** Aktor uji UIC-001-PERFORMANCE §1.8 — ID sama dengan modul lain supaya lintas modul konsisten. */
export const PERF_ACTORS: PerfActor[] = [
  { employeeId: 'emp-hesti', name: 'Hesti Wulandari', nik: '2024010004', role: 'ROLE_HR_MANAGER' },
  { employeeId: 'emp-lukman', name: 'Lukman Hakim', nik: '2024010011', role: 'ROLE_HR_STAFF' },
  { employeeId: 'emp-budi-dm', name: 'Budi Santoso', nik: '2024010002', role: 'ROLE_DEPT_MANAGER' },
  { employeeId: 'emp-rina-amelia', name: 'Rina Amelia', nik: '2024010003', role: 'ROLE_DEPT_MANAGER' },
  { employeeId: 'emp-dedi', name: 'Dedi Kurniawan', nik: '2024010005', role: 'ROLE_EMPLOYEE' },
  { employeeId: 'emp-yanti', name: 'Yanti Prasetya', nik: '2024010006', role: 'ROLE_EMPLOYEE' },
  { employeeId: 'emp-admin', name: 'Administrator', nik: 'ADMIN', role: 'ROLE_SUPER_ADMIN' },
];

export const toAudit = (actor: PerfActor): AuditActor => ({
  employeeId: actor.employeeId,
  nama: actor.name,
  nik: actor.nik,
  timezone: 'Asia/Jakarta',
});

const HESTI = toAudit(PERF_ACTORS[0]);

/** Penunjuk `performance.assessment_structure_id` → nama struktur (dibaca hidup, cross-schema). */
export const ASSESSMENT_STRUCTURES: Record<string, string> = {
  '7b3e9c10-0001-4c2a-9f00-000000000001': 'Struktur Penilaian Utama',
};

export const PERIOD_SEED: ReviewPeriod[] = [
  {
    id: 'rp-2026-s1',
    periodName: 'Semester 1 2026',
    phase: 'SIGNING',
    assessmentStructureId: '7b3e9c10-0001-4c2a-9f00-000000000001',
    assessmentStructureNameSnapshot: 'Struktur Penilaian Utama',
    scaleLength: 5,
    closedAt: null,
    closedAtTimezone: null,
    createdBy: HESTI,
    createdAt: '2026-01-05T08:00:00+07:00',
    updatedBy: HESTI,
    updatedAt: '2026-03-15T09:00:00+07:00',
  },
  {
    id: 'rp-2025-s2',
    periodName: 'Semester 2 2025',
    phase: 'CLOSED',
    assessmentStructureId: '7b3e9c10-0001-4c2a-9f00-000000000001',
    assessmentStructureNameSnapshot: 'Struktur Penilaian Utama',
    scaleLength: 5,
    closedAt: '2026-01-04T17:00:00+07:00',
    closedAtTimezone: 'Asia/Jakarta',
    createdBy: HESTI,
    createdAt: '2025-07-01T08:00:00+07:00',
    updatedBy: HESTI,
    updatedAt: '2026-01-04T17:00:00+07:00',
  },
  {
    id: 'rp-2025-s1',
    periodName: 'Semester 1 2025',
    phase: 'CLOSED',
    assessmentStructureId: '7b3e9c10-0001-4c2a-9f00-000000000001',
    assessmentStructureNameSnapshot: 'Struktur Penilaian Utama',
    scaleLength: 5,
    closedAt: '2025-07-01T07:30:00+07:00',
    closedAtTimezone: 'Asia/Jakarta',
    createdBy: HESTI,
    createdAt: '2025-01-06T08:00:00+07:00',
    updatedBy: HESTI,
    updatedAt: '2025-07-01T07:30:00+07:00',
  },
];

/** Karyawan tanpa penilai di struktur — selalu "belum bisa dinilai". */
export const NOT_ASSESSABLE: EligibilityEntry<NotAssessableReason>[] = [
  { employeeId: 'emp-ahmad', employeeNameSnapshot: 'Ahmad Fauzi', reason: 'NO_ASSESSOR_IN_STRUCTURE' },
];

/** Puncak struktur tanpa penyetuju akhir. Rina Amelia sengaja tidak di sini (penyetuju akhir = Hesti). */
export const CHAIN_EXHAUSTED: EligibilityEntry<OutOfAssessmentReason>[] = [
  { employeeId: 'emp-wayan', employeeNameSnapshot: 'Wayan Sudira', reason: 'APPROVER_CHAIN_EXHAUSTED' },
];

/** Karyawan yang bergabung setelah periode dibuka dan belum dimasukkan HR. */
export const LATE_JOINERS: { employeeId: string; employeeNameSnapshot: string; joinDate: string }[] = [
  { employeeId: 'emp-fajar', employeeNameSnapshot: 'Fajar Setiawan', joinDate: '2026-02-15' },
];
