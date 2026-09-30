import type {
  ProdActor,
  ProdEmployee,
  Project,
  ProjectMember,
  Task,
  TaskCategory,
  TaskChange,
} from '@/features/productivity/types';

/**
 * Dataset contoh Productivity — mengikuti `ui-example/productivity/_dataset-skenario-positif.md` (dikutip UIC §1.6):
 * Dedi Kurniawan (pengerja), Rina Amelia (atasan berjenjang), Hesti Wulandari (HR), Fajar Setiawan. Company PTDIKA.
 */
export const PROD_EMPLOYEES: ProdEmployee[] = [
  {
    employeeId: 'emp-rina-amelia',
    name: 'Rina Amelia',
    nik: '20210715',
    positionId: 'pos-eng-mgr',
    positionName: 'Engineering Manager',
    supervisorId: null,
  },
  {
    employeeId: 'emp-dedi',
    name: 'Dedi Kurniawan',
    nik: '20200903',
    positionId: 'pos-swe',
    positionName: 'Software Engineer',
    supervisorId: 'emp-rina-amelia',
  },
  {
    employeeId: 'emp-fajar',
    name: 'Fajar Setiawan',
    nik: '20210418',
    positionId: 'pos-swe',
    positionName: 'Software Engineer',
    supervisorId: 'emp-rina-amelia',
  },
  {
    employeeId: 'emp-sinta',
    name: 'Sinta Maharani',
    nik: '20220107',
    positionId: 'pos-qa',
    positionName: 'QA Engineer',
    supervisorId: 'emp-rina-amelia',
  },
  {
    employeeId: 'emp-hesti',
    name: 'Hesti Wulandari',
    nik: '20220301',
    positionId: 'pos-hr-mgr',
    positionName: 'HR Manager',
    supervisorId: null,
  },
  {
    employeeId: 'emp-lukman',
    name: 'Lukman Hakim',
    nik: '20230215',
    positionId: 'pos-hr-staff',
    positionName: 'HR Staff',
    supervisorId: 'emp-hesti',
  },
];

export const PROD_ACTORS: ProdActor[] = [
  { employeeId: 'emp-dedi', role: 'ROLE_EMPLOYEE', label: 'Dedi Kurniawan — Employee' },
  {
    employeeId: 'emp-rina-amelia',
    role: 'ROLE_DEPT_MANAGER',
    label: 'Rina Amelia — Dept. Manager (Dedi’s supervisor)',
  },
  { employeeId: 'emp-hesti', role: 'ROLE_HR_MANAGER', label: 'Hesti Wulandari — HR Manager' },
  { employeeId: 'emp-lukman', role: 'ROLE_HR_STAFF', label: 'Lukman Hakim — HR Staff' },
  { employeeId: 'emp-fajar', role: 'ROLE_EMPLOYEE', label: 'Fajar Setiawan — Employee' },
];

type ProjectSeed = Omit<Project, 'memberCount' | 'openTaskCount'> & { deletedAt: string | null };

export const PROJECT_SEED: ProjectSeed[] = [
  {
    id: 'c1000000-0000-7000-8000-000000000001',
    code: 'PRJ-0001',
    projectName: 'Migrasi Server Q3',
    state: 'AKTIF',
    ownerEmployeeId: 'emp-dedi',
    archivedAt: null,
    archivedAtTimezone: null,
    createdAt: '2026-06-10T09:00:00+07:00',
    updatedAt: null,
    deletedAt: null,
  },
  {
    id: 'c1000000-0000-7000-8000-000000000002',
    code: 'PRJ-0002',
    projectName: 'Onboarding Portal 2025',
    state: 'ARSIP',
    ownerEmployeeId: 'emp-dedi',
    archivedAt: '2026-06-15T10:00:00+07:00',
    archivedAtTimezone: 'Asia/Jakarta',
    createdAt: '2025-11-03T09:00:00+07:00',
    updatedAt: '2026-06-15T10:00:00+07:00',
    deletedAt: null,
  },
  {
    id: 'c1000000-0000-7000-8000-000000000003',
    code: 'PRJ-0003',
    projectName: 'Audit Keamanan Aplikasi',
    state: 'AKTIF',
    ownerEmployeeId: 'emp-rina-amelia',
    archivedAt: null,
    archivedAtTimezone: null,
    createdAt: '2026-07-01T10:00:00+07:00',
    updatedAt: null,
    deletedAt: null,
  },
];

export const MEMBER_SEED: ProjectMember[] = [
  {
    projectId: 'c1000000-0000-7000-8000-000000000001',
    employeeId: 'emp-rina-amelia',
    isActive: true,
    createdAt: '2026-06-11T09:00:00+07:00',
  },
  {
    projectId: 'c1000000-0000-7000-8000-000000000003',
    employeeId: 'emp-fajar',
    isActive: true,
    createdAt: '2026-07-01T10:05:00+07:00',
  },
];

/** Enam kategori bawaan company (PD-94) — tiga pernah dipakai task, tiga belum. */
export const CATEGORY_SEED: Omit<TaskCategory, 'inUse'>[] = [
  {
    id: 'f3000000-0000-7000-8000-000000000001',
    categoryName: 'Pengembangan',
    isActive: true,
    createdAt: '2026-01-05T02:00:00+07:00',
  },
  {
    id: 'f3000000-0000-7000-8000-000000000002',
    categoryName: 'Pemeliharaan & Perbaikan',
    isActive: true,
    createdAt: '2026-01-05T02:00:00+07:00',
  },
  {
    id: 'f3000000-0000-7000-8000-000000000003',
    categoryName: 'Rapat & Koordinasi',
    isActive: true,
    createdAt: '2026-01-05T02:00:00+07:00',
  },
  {
    id: 'f3000000-0000-7000-8000-000000000004',
    categoryName: 'Dokumentasi',
    isActive: true,
    createdAt: '2026-01-05T02:00:00+07:00',
  },
  {
    id: 'f3000000-0000-7000-8000-000000000005',
    categoryName: 'Dukungan Pengguna',
    isActive: true,
    createdAt: '2026-01-05T02:00:00+07:00',
  },
  {
    id: 'f3000000-0000-7000-8000-000000000006',
    categoryName: 'Lain-lain',
    isActive: true,
    createdAt: '2026-01-05T02:00:00+07:00',
  },
];

export const TASK_SEED: Task[] = [
  {
    id: 'e2000000-0000-7000-8000-000000000001',
    code: 'TSK-0001',
    projectId: 'c1000000-0000-7000-8000-000000000001',
    taskCategoryId: 'f3000000-0000-7000-8000-000000000001',
    assigneeEmployeeId: 'emp-dedi',
    assignerEmployeeId: 'emp-rina-amelia',
    taskOrigin: 'DITUGASKAN',
    status: 'SEDANG_DIKERJAKAN',
    priority: 'TINGGI',
    dueDate: '2026-08-12',
    originalDueDate: '2026-08-10',
    taskTitle: 'Perbaikan bug checkout',
    description: 'Tombol bayar gagal saat vendor pembayaran pihak ke-3 lambat merespons.',
    createdAt: '2026-06-12T08:00:00+07:00',
    updatedAt: '2026-08-02T09:00:00+07:00',
    closedAt: null,
  },
  {
    id: 'e2000000-0000-7000-8000-000000000002',
    code: 'TSK-0002',
    projectId: null,
    taskCategoryId: 'f3000000-0000-7000-8000-000000000004',
    assigneeEmployeeId: 'emp-dedi',
    assignerEmployeeId: null,
    taskOrigin: 'DIBUAT_SENDIRI',
    status: 'SELESAI',
    priority: 'SEDANG',
    dueDate: '2026-07-20',
    originalDueDate: '2026-07-20',
    taskTitle: 'Update dokumentasi API',
    description: null,
    createdAt: '2026-07-01T08:30:00+07:00',
    updatedAt: '2026-07-18T16:00:00+07:00',
    closedAt: '2026-07-18T16:00:00+07:00',
  },
  {
    id: 'e2000000-0000-7000-8000-000000000003',
    code: 'TSK-0003',
    projectId: 'c1000000-0000-7000-8000-000000000001',
    taskCategoryId: 'f3000000-0000-7000-8000-000000000003',
    assigneeEmployeeId: 'emp-dedi',
    assignerEmployeeId: null,
    taskOrigin: 'DIBUAT_SENDIRI',
    status: 'TERTAHAN',
    priority: 'RENDAH',
    dueDate: '2026-10-30',
    originalDueDate: '2026-10-30',
    taskTitle: 'Rapat koordinasi mingguan',
    description: 'Sinkronisasi mingguan tim migrasi.',
    createdAt: '2026-07-06T08:00:00+07:00',
    updatedAt: '2026-07-25T10:00:00+07:00',
    closedAt: null,
  },
  {
    id: 'e2000000-0000-7000-8000-000000000004',
    code: 'TSK-0004',
    projectId: 'c1000000-0000-7000-8000-000000000003',
    taskCategoryId: 'f3000000-0000-7000-8000-000000000001',
    assigneeEmployeeId: 'emp-fajar',
    assignerEmployeeId: 'emp-rina-amelia',
    taskOrigin: 'DITUGASKAN',
    status: 'SELESAI',
    priority: 'SEDANG',
    dueDate: '2026-09-25',
    originalDueDate: '2026-09-25',
    taskTitle: 'Review hasil pemindaian dependensi',
    description: null,
    createdAt: '2026-07-02T09:00:00+07:00',
    updatedAt: '2026-09-24T15:00:00+07:00',
    closedAt: '2026-09-24T15:00:00+07:00',
  },
];

export const TASK_CHANGE_SEED: TaskChange[] = [
  {
    id: 'lg-0001',
    taskId: 'e2000000-0000-7000-8000-000000000001',
    changedField: 'DUE_DATE',
    oldValue: '2026-08-10',
    newValue: '2026-08-12',
    changeReason: 'Menunggu konfirmasi vendor pembayaran pihak ke-3',
    createdBy: { employeeId: 'emp-rina-amelia', name: 'Rina Amelia' },
    createdAt: '2026-08-02T09:00:00+07:00',
  },
  {
    id: 'lg-0002',
    taskId: 'e2000000-0000-7000-8000-000000000003',
    changedField: 'STATUS',
    oldValue: 'SEDANG_DIKERJAKAN',
    newValue: 'TERTAHAN',
    changeReason: null,
    createdBy: { employeeId: 'emp-dedi', name: 'Dedi Kurniawan' },
    createdAt: '2026-07-25T10:00:00+07:00',
  },
];
