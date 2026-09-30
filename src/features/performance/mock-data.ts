import type {
  AuditActor,
  EligibilityEntry,
  KpiItem,
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

const HESTI_SHORT = { id: 'emp-hesti', name: 'Hesti Wulandari' };

/**
 * Daftar induk dataset §3 — golongan memakai data Company (`Staff 2` sebagai padanan "Staff Grade 3").
 * Nama golongan di sini adalah snapshot saat baris ditetapkan, bukan cermin hidup.
 */
export const KPI_SEED: KpiItem[] = [
  {
    id: '019ba5a1-c100-73f1-a3f1-4e2c015a91b7',
    itemName: 'Menyelesaikan tiket dukungan',
    jobGradeId: 'jg-staff-2',
    jobGradeNameSnapshot: 'Staff 2',
    targetType: 'NUMERIC',
    rawWeight: 40,
    isActive: true,
    createdBy: HESTI_SHORT,
    createdAt: '2026-01-10T09:00:00+07:00',
    updatedBy: null,
    updatedAt: null,
  },
  {
    id: '019ba5a6-54e0-77c2-b7c2-4e2c025a91b7',
    itemName: 'Kolaborasi tim',
    jobGradeId: 'jg-staff-2',
    jobGradeNameSnapshot: 'Staff 2',
    targetType: 'NARRATIVE',
    rawWeight: 30,
    isActive: true,
    createdBy: HESTI_SHORT,
    createdAt: '2026-01-10T09:05:00+07:00',
    updatedBy: null,
    updatedAt: null,
  },
  {
    id: '019ba5aa-e8c0-7d40-8d40-4e2c035a91b7',
    itemName: 'Ketepatan waktu pelaporan',
    jobGradeId: 'jg-staff-2',
    jobGradeNameSnapshot: 'Staff 2',
    targetType: 'NUMERIC',
    rawWeight: 20,
    isActive: true,
    createdBy: HESTI_SHORT,
    createdAt: '2026-01-10T09:10:00+07:00',
    updatedBy: null,
    updatedAt: null,
  },
  {
    id: '019ba5af-7ca0-7e15-9e15-4e2c045a91b7',
    itemName: 'Kepatuhan SOP lama',
    jobGradeId: 'jg-staff-2',
    jobGradeNameSnapshot: 'Staff 2',
    targetType: 'NARRATIVE',
    rawWeight: 10,
    isActive: false,
    createdBy: HESTI_SHORT,
    createdAt: '2026-01-10T09:15:00+07:00',
    updatedBy: null,
    updatedAt: null,
  },
  {
    id: '019baaff-0b80-702b-a02b-4e2c065a91b7',
    itemName: 'Pencapaian target tim',
    jobGradeId: 'jg-manager-1',
    jobGradeNameSnapshot: 'Manager 1',
    targetType: 'NUMERIC',
    rawWeight: 50,
    isActive: true,
    createdBy: HESTI_SHORT,
    createdAt: '2026-01-11T10:00:00+07:00',
    updatedBy: null,
    updatedAt: null,
  },
  {
    id: '019bab03-9f60-79d6-b9d6-4e2c075a91b7',
    itemName: 'Pengembangan anggota tim',
    jobGradeId: 'jg-manager-1',
    jobGradeNameSnapshot: 'Manager 1',
    targetType: 'NARRATIVE',
    rawWeight: 30,
    isActive: true,
    createdBy: HESTI_SHORT,
    createdAt: '2026-01-11T10:05:00+07:00',
    updatedBy: null,
    updatedAt: null,
  },
];

/** Pemakaian baris daftar induk di lembar berjalan (`review_sheet_item.master_item_id`). */
export const KPI_USAGE: Record<string, number> = {
  '019ba5a1-c100-73f1-a3f1-4e2c015a91b7': 3,
  '019ba5a6-54e0-77c2-b7c2-4e2c025a91b7': 3,
  '019ba5aa-e8c0-7d40-8d40-4e2c035a91b7': 2,
  '019baaff-0b80-702b-a02b-4e2c065a91b7': 1,
};

/** Karyawan yang bergabung setelah periode dibuka dan belum dimasukkan HR. */
export const LATE_JOINERS: { employeeId: string; employeeNameSnapshot: string; joinDate: string }[] = [
  { employeeId: 'emp-fajar', employeeNameSnapshot: 'Fajar Setiawan', joinDate: '2026-02-15' },
];
