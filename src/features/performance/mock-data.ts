import type {
  ApprovalRound,
  AuditActor,
  EligibilityEntry,
  KpiItem,
  NamedEmployee,
  NotAssessableReason,
  OutOfAssessmentReason,
  PerfActor,
  ReviewPeriod,
  SelfAssessment,
  SheetItem,
  SheetRow,
  SupervisorHistoryRow,
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

// ---------- Menu 3/4 — Lembar Penilaian & Persetujuan Nilai ----------

/**
 * Rantai atasan struktur penilaian (resolve `CompanySvc`). Rina Amelia = puncak struktur; penadah
 * terakhir rantai yang habis adalah HR Manager (`PF-19` k2).
 */
export const SUPERVISOR_OF: Record<string, string | null> = {
  'emp-dedi': 'emp-budi-dm',
  'emp-yanti': 'emp-budi-dm',
  'emp-budi-dm': 'emp-rina-amelia',
  'emp-rina-amelia': null,
};

const HESTI_NAMED: NamedEmployee = { employeeId: 'emp-hesti', name: 'Hesti Wulandari' };

/** `null` bila company tidak punya HR Manager — submit lalu ditolak `403` (rantai habis, `PF-44`). */
export const HR_LAST_CATCHER: NamedEmployee | null = HESTI_NAMED;

/** Baris nilai tersimpan — `masterItemId`/nilai mentah hanya ada di sisi server. */
export interface SheetItemSeed extends Omit<SheetItem, 'initialValue' | 'submittedValue'> {
  masterItemId: string | null;
  initialValue: string | null;
  submittedValue: string | null;
  deletedAt: string | null;
}

export interface SheetSeed extends SheetRow {
  processInstanceId: string | null;
  createdAt: string;
  selfAssessment: SelfAssessment | null;
  items: SheetItemSeed[];
  history: SupervisorHistoryRow[];
  rounds: ApprovalRound[];
}

const KPI = {
  tickets: '019ba5a1-c100-73f1-a3f1-4e2c015a91b7',
  teamwork: '019ba5a6-54e0-77c2-b7c2-4e2c025a91b7',
  timeliness: '019ba5aa-e8c0-7d40-8d40-4e2c035a91b7',
};

const line = (row: Partial<SheetItemSeed> & Pick<SheetItemSeed, 'id' | 'origin' | 'itemNameSnapshot' | 'targetTypeSnapshot' | 'rawWeight' | 'target'>): SheetItemSeed => ({
  masterItemId: null,
  frozenWeightRatio: null,
  employeeReadAt: null,
  employeeReadResetCount: 0,
  employeeObjectionNote: null,
  initialValue: null,
  initialValueRecordedAt: null,
  submittedValue: null,
  deletedAt: null,
  ...row,
});

const RINA = { employeeId: 'emp-rina-amelia', name: 'Rina Amelia' };

/**
 * Rata-rata sebaran nilai penilai per lembar — milik Menu 6 (`PF-25`), dikutip apa adanya oleh antrean
 * persetujuan. Lembar tanpa angka di sini tampil "—" (formula tidak dihitung ulang di layar persetujuan).
 */
export const ASSESSOR_AVERAGE: Record<string, number> = {
  'rs-0002': 4.2,
  'rs-0004': 3.4,
};

/** Dataset UIC-001-PERFORMANCE §4 (`RS-0001`–`RS-0004`), seluruhnya periode Semester 1 2026. */
export const SHEET_SEED: SheetSeed[] = [
  {
    id: 'rs-0001',
    employeeId: 'emp-dedi',
    employeeNameDisplay: 'Dedi Kurniawan',
    reviewPeriodId: 'rp-2026-s1',
    status: 'IN_PROGRESS',
    assessorId: 'emp-budi-dm',
    hasRevision: false,
    processInstanceId: null,
    createdAt: '2026-01-05T08:00:00+07:00',
    selfAssessment: {
      content:
        'Saya merasa cukup baik dalam menyelesaikan tiket dukungan bulan ini, meski masih perlu perbaikan di dokumentasi.',
      submittedAt: '2026-03-10T10:00:00+07:00',
    },
    items: [
      line({
        id: 'rsi-0001-1',
        origin: 'MASTER',
        masterItemId: KPI.tickets,
        itemNameSnapshot: 'Menyelesaikan tiket dukungan',
        targetTypeSnapshot: 'NUMERIC',
        rawWeight: 40,
        target: '40 tiket',
        employeeReadAt: '2026-03-10T08:00:00+07:00',
        initialValue: '38 tiket',
        initialValueRecordedAt: '2026-03-11T09:00:00+07:00',
      }),
      line({
        id: 'rsi-0001-2',
        origin: 'MASTER',
        masterItemId: KPI.teamwork,
        itemNameSnapshot: 'Kolaborasi tim',
        targetTypeSnapshot: 'NARRATIVE',
        rawWeight: 30,
        target: 'Aktif membantu 2 rekan kerja',
      }),
      line({
        id: 'rsi-0001-3',
        origin: 'ADDITIONAL',
        itemNameSnapshot: 'Membantu onboarding karyawan baru',
        targetTypeSnapshot: 'NARRATIVE',
        rawWeight: 15,
        target: 'Mendampingi 1 karyawan baru',
      }),
    ],
    history: [
      {
        supervisorEmployeeId: 'emp-budi-dm',
        supervisorNameDisplay: 'Budi Santoso',
        validFrom: '2026-01-05T00:00:00+07:00',
        validUntil: null,
        handoverNote: null,
      },
    ],
    rounds: [],
  },
  {
    id: 'rs-0002',
    employeeId: 'emp-budi-dm',
    employeeNameDisplay: 'Budi Santoso',
    reviewPeriodId: 'rp-2026-s1',
    status: 'APPROVED',
    assessorId: 'emp-rina-amelia',
    hasRevision: false,
    processInstanceId: '8c000000-0000-7000-8000-000000000ab2',
    createdAt: '2026-01-05T08:00:00+07:00',
    selfAssessment: {
      content: 'Saya berhasil memimpin tim menuntaskan migrasi server dan menjaga kolaborasi lintas divisi.',
      submittedAt: '2026-01-20T09:00:00+07:00',
    },
    items: [
      line({
        id: 'rsi-0002-1',
        origin: 'MASTER',
        masterItemId: KPI.tickets,
        itemNameSnapshot: 'Menyelesaikan tiket dukungan',
        targetTypeSnapshot: 'NUMERIC',
        rawWeight: 40,
        frozenWeightRatio: 57.14,
        target: '35 tiket',
        employeeReadAt: '2026-03-20T09:00:00+07:00',
        employeeReadResetCount: 1,
        initialValue: '33 tiket',
        initialValueRecordedAt: '2026-03-01T10:00:00+07:00',
        submittedValue: '35 tiket',
      }),
      line({
        id: 'rsi-0002-2',
        origin: 'MASTER',
        masterItemId: KPI.teamwork,
        itemNameSnapshot: 'Kolaborasi tim',
        targetTypeSnapshot: 'NARRATIVE',
        rawWeight: 30,
        frozenWeightRatio: 42.86,
        target: 'Mentoring 2 anggota',
        employeeReadAt: '2026-03-20T09:00:00+07:00',
        employeeReadResetCount: 1,
        initialValue: 'Baik, konsisten',
        initialValueRecordedAt: '2026-03-01T10:05:00+07:00',
        submittedValue: 'Baik, konsisten, ditingkatkan Q2',
      }),
    ],
    history: [
      {
        supervisorEmployeeId: 'emp-eko',
        supervisorNameDisplay: 'Eko Prasetyo',
        validFrom: '2026-01-05T00:00:00+07:00',
        validUntil: '2026-02-01T00:00:00+07:00',
        handoverNote: 'Resign',
      },
      {
        supervisorEmployeeId: 'emp-rina-amelia',
        supervisorNameDisplay: 'Rina Amelia',
        validFrom: '2026-02-01T00:00:00+07:00',
        validUntil: null,
        handoverNote: null,
      },
    ],
    rounds: [
      {
        id: 'ar-0002-1',
        cycleNo: 1,
        roundNo: 1,
        approver: RINA,
        outcome: 'APPROVED',
        decisionReason: null,
        decidedAt: '2026-07-05T11:00:00+07:00',
        createdAt: '2026-06-28T16:00:00+07:00',
      },
    ],
  },
  {
    id: 'rs-0003',
    employeeId: 'emp-rina-amelia',
    employeeNameDisplay: 'Rina Amelia',
    reviewPeriodId: 'rp-2026-s1',
    status: 'RETURNED_TO_ASSESSOR',
    assessorId: 'emp-hesti',
    hasRevision: true,
    processInstanceId: '8c000000-0000-7000-8000-000000000bcd',
    createdAt: '2026-01-05T08:00:00+07:00',
    selfAssessment: {
      content: 'Fokus saya semester ini adalah menstabilkan proses persetujuan lintas tim.',
      submittedAt: '2026-03-11T14:40:00+07:00',
    },
    items: [
      line({
        id: 'rsi-0003-1',
        origin: 'MASTER',
        masterItemId: KPI.timeliness,
        itemNameSnapshot: 'Ketepatan waktu penyelesaian',
        targetTypeSnapshot: 'NUMERIC',
        rawWeight: 20,
        frozenWeightRatio: 100,
        target: '95% tepat waktu',
        initialValue: '92%',
        initialValueRecordedAt: '2026-03-15T09:00:00+07:00',
        submittedValue: '93%',
      }),
    ],
    history: [
      {
        supervisorEmployeeId: 'emp-hesti',
        supervisorNameDisplay: 'Hesti Wulandari',
        validFrom: '2026-01-05T00:00:00+07:00',
        validUntil: null,
        handoverNote: null,
      },
    ],
    rounds: [
      {
        id: 'ar-0003-1',
        cycleNo: 1,
        roundNo: 1,
        approver: HESTI_NAMED,
        outcome: 'RETURNED',
        decisionReason: 'Mohon tambahkan bukti capaian kolaborasi lintas-divisi sebelum diajukan ulang.',
        decidedAt: '2026-03-22T10:00:00+07:00',
        createdAt: '2026-03-18T15:00:00+07:00',
      },
    ],
  },
  {
    id: 'rs-0004',
    employeeId: 'emp-yanti',
    employeeNameDisplay: 'Yanti Prasetya',
    reviewPeriodId: 'rp-2026-s1',
    status: 'REJECTED_FINAL',
    assessorId: 'emp-budi-dm',
    hasRevision: true,
    processInstanceId: '8c000000-0000-7000-8000-000000000abc',
    createdAt: '2026-01-05T08:00:00+07:00',
    selfAssessment: {
      content: 'Saya menyelesaikan migrasi data pelanggan lebih cepat dari rencana.',
      submittedAt: '2026-03-13T08:10:00+07:00',
    },
    items: [
      line({
        id: 'rsi-0004-1',
        origin: 'MASTER',
        masterItemId: KPI.teamwork,
        itemNameSnapshot: 'Kolaborasi tim',
        targetTypeSnapshot: 'NARRATIVE',
        rawWeight: 30,
        frozenWeightRatio: 100,
        target: 'Kolaborasi lintas divisi',
        employeeReadAt: '2026-03-22T09:00:00+07:00',
        initialValue: 'Baik',
        initialValueRecordedAt: '2026-03-20T09:00:00+07:00',
        submittedValue: 'Baik',
      }),
    ],
    history: [
      {
        supervisorEmployeeId: 'emp-budi-dm',
        supervisorNameDisplay: 'Budi Santoso',
        validFrom: '2026-01-05T00:00:00+07:00',
        validUntil: null,
        handoverNote: null,
      },
    ],
    rounds: [
      {
        id: 'ar-0004-1',
        cycleNo: 1,
        roundNo: 1,
        approver: RINA,
        outcome: 'RETURNED',
        decisionReason: "Item ADDITIONAL 'Dokumentasi SOP baru' belum jelas target ukurannya.",
        decidedAt: '2026-04-01T10:00:00+07:00',
        createdAt: '2026-03-25T09:00:00+07:00',
      },
      {
        id: 'ar-0004-2',
        cycleNo: 1,
        roundNo: 2,
        approver: RINA,
        outcome: 'REJECTED_FINAL',
        decisionReason: 'Target masih belum terukur setelah revisi, jatah pengembalian (return_quota=1) sudah habis.',
        decidedAt: '2026-04-15T13:00:00+07:00',
        createdAt: '2026-04-01T10:05:00+07:00',
      },
    ],
  },
];
