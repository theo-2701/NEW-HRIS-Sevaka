import type {
  ActivityType,
  CategoryMapping,
  PaidWorkGroup,
  SystemStopAcceptance,
  TimesheetPeriod,
  Worklog,
  WorklogChange,
} from '@/features/productivity/types';

/**
 * Dataset Timesheet — dataset skenario positif §3 (Juli 2026, rekap Dedi DISAHKAN + dikonfirmasi payroll: 240 + 60 +
 * 300 + 180 = 780 menit) ditambah baris Agustus/September supaya alur koreksi, penerimaan atasan, pengajuan, dan
 * pembukaan-kembali dapat dicoba di dalam jendela 7 hari.
 */
const TSK_1 = 'e2000000-0000-7000-8000-000000000001';
const TSK_3 = 'e2000000-0000-7000-8000-000000000003';
const TSK_4 = 'e2000000-0000-7000-8000-000000000004';

export const ACTIVITY_TYPE_SEED: ActivityType[] = [
  { id: 'e5000000-0000-7000-8000-000000000001', activityName: 'Mengerjakan', isActive: true },
  { id: 'e5000000-0000-7000-8000-000000000002', activityName: 'Rapat', isActive: true },
  { id: 'e5000000-0000-7000-8000-000000000003', activityName: 'Review', isActive: true },
  { id: 'e5000000-0000-7000-8000-000000000004', activityName: 'Dokumentasi', isActive: true },
  { id: 'e5000000-0000-7000-8000-000000000005', activityName: 'Dukungan', isActive: true },
  { id: 'e5000000-0000-7000-8000-000000000006', activityName: 'Lainnya', isActive: true },
];

export const PAID_GROUP_SEED: PaidWorkGroup[] = [
  {
    id: 'pwg10000-0000-7000-8000-000000000001',
    code: 'PWG-0001',
    groupName: 'Kelompok Berbayar — Teknis',
    isActive: true,
    createdAt: '2026-07-15T09:00:00+07:00',
  },
  {
    id: 'pwg10000-0000-7000-8000-000000000003',
    code: 'PWG-0003',
    groupName: 'Kelompok Berbayar — Proyek Khusus 2025',
    isActive: false,
    createdAt: '2025-12-01T09:00:00+07:00',
  },
];

export const MAPPING_SEED: Omit<CategoryMapping, 'taskCategoryName' | 'paidWorkGroupName'>[] = [
  {
    id: 'map10000-0000-7000-8000-000000000001',
    taskCategoryId: 'f3000000-0000-7000-8000-000000000001',
    paidWorkGroupId: 'pwg10000-0000-7000-8000-000000000001',
    isActive: true,
    deactivationReason: null,
    createdAt: '2026-07-15T09:10:00+07:00',
    deactivatedAt: null,
  },
  {
    id: 'map10000-0000-7000-8000-000000000002',
    taskCategoryId: 'f3000000-0000-7000-8000-000000000002',
    paidWorkGroupId: 'pwg10000-0000-7000-8000-000000000001',
    isActive: true,
    deactivationReason: null,
    createdAt: '2026-07-15T09:12:00+07:00',
    deactivatedAt: null,
  },
  {
    id: 'map10000-0000-7000-8000-000000000003',
    taskCategoryId: 'f3000000-0000-7000-8000-000000000005',
    paidWorkGroupId: 'pwg10000-0000-7000-8000-000000000003',
    isActive: false,
    deactivationReason: 'Proyek khusus 2025 selesai — kelompok ditutup.',
    createdAt: '2025-12-01T09:30:00+07:00',
    deactivatedAt: '2026-01-10T10:00:00+07:00',
  },
];

const PWG_1 = 'pwg10000-0000-7000-8000-000000000001';
const ACT_KERJA = 'e5000000-0000-7000-8000-000000000001';
const ACT_RAPAT = 'e5000000-0000-7000-8000-000000000002';

export const WORKLOG_SEED: Worklog[] = [
  {
    id: 'c1000000-0000-7000-8000-000000000001',
    code: 'WLG-0001',
    employeeId: 'emp-dedi',
    taskId: TSK_1,
    activityTypeId: ACT_KERJA,
    origin: 'DIUKUR_MESIN',
    startedAt: '2026-07-20T09:00:00+07:00',
    stoppedAt: '2026-07-20T13:00:00+07:00',
    workDate: '2026-07-20',
    durationMinutes: 240,
    notes: null,
    isCorrected: false,
    correctionMode: null,
    paidWorkGroupIdSnapshot: PWG_1,
    createdAt: '2026-07-20T09:00:00+07:00',
  },
  {
    id: 'c1000000-0000-7000-8000-000000000002',
    code: 'WLG-0002',
    employeeId: 'emp-dedi',
    taskId: TSK_3,
    activityTypeId: ACT_RAPAT,
    origin: 'DIKETIK_MANUSIA',
    startedAt: null,
    stoppedAt: null,
    workDate: '2026-07-21',
    durationMinutes: 60,
    notes: null,
    isCorrected: false,
    correctionMode: null,
    paidWorkGroupIdSnapshot: null,
    createdAt: '2026-07-21T17:00:00+07:00',
  },
  {
    id: 'c1000000-0000-7000-8000-000000000003',
    code: 'WLG-0003',
    employeeId: 'emp-dedi',
    taskId: TSK_1,
    activityTypeId: ACT_KERJA,
    origin: 'DIHENTIKAN_SISTEM',
    startedAt: '2026-07-22T15:00:00+07:00',
    stoppedAt: '2026-07-22T23:59:59+07:00',
    workDate: '2026-07-22',
    durationMinutes: 300,
    notes: null,
    isCorrected: true,
    correctionMode: 'DIKOREKSI_PEMILIK',
    paidWorkGroupIdSnapshot: PWG_1,
    createdAt: '2026-07-22T15:00:00+07:00',
  },
  {
    id: 'c1000000-0000-7000-8000-000000000004',
    code: 'WLG-0004',
    employeeId: 'emp-dedi',
    taskId: TSK_1,
    activityTypeId: ACT_KERJA,
    origin: 'DIHENTIKAN_SISTEM',
    startedAt: '2026-07-23T21:00:00+07:00',
    stoppedAt: '2026-07-23T23:59:59+07:00',
    workDate: '2026-07-23',
    durationMinutes: 180,
    notes: null,
    isCorrected: false,
    correctionMode: 'DITERIMA_ATASAN',
    paidWorkGroupIdSnapshot: PWG_1,
    createdAt: '2026-07-23T21:00:00+07:00',
  },
  {
    id: 'c1000000-0000-7000-8000-000000000005',
    code: 'WLG-0005',
    employeeId: 'emp-dedi',
    taskId: TSK_1,
    activityTypeId: ACT_KERJA,
    origin: 'DIKETIK_MANUSIA',
    startedAt: null,
    stoppedAt: null,
    workDate: '2026-08-05',
    durationMinutes: 300,
    notes: 'Investigasi log vendor',
    isCorrected: false,
    correctionMode: null,
    paidWorkGroupIdSnapshot: PWG_1,
    createdAt: '2026-08-05T18:00:00+07:00',
  },
  {
    id: 'c1000000-0000-7000-8000-000000000006',
    code: 'WLG-0006',
    employeeId: 'emp-dedi',
    taskId: TSK_1,
    activityTypeId: ACT_KERJA,
    origin: 'DIUKUR_MESIN',
    startedAt: '2026-09-28T09:00:00+07:00',
    stoppedAt: '2026-09-28T12:30:00+07:00',
    workDate: '2026-09-28',
    durationMinutes: 210,
    notes: null,
    isCorrected: false,
    correctionMode: null,
    paidWorkGroupIdSnapshot: PWG_1,
    createdAt: '2026-09-28T09:00:00+07:00',
  },
  {
    id: 'c1000000-0000-7000-8000-000000000007',
    code: 'WLG-0007',
    employeeId: 'emp-dedi',
    taskId: TSK_1,
    activityTypeId: ACT_KERJA,
    origin: 'DIHENTIKAN_SISTEM',
    startedAt: '2026-09-29T14:00:00+07:00',
    stoppedAt: '2026-09-29T23:59:59+07:00',
    workDate: '2026-09-29',
    durationMinutes: 600,
    notes: null,
    isCorrected: false,
    correctionMode: null,
    paidWorkGroupIdSnapshot: PWG_1,
    createdAt: '2026-09-29T14:00:00+07:00',
  },
  {
    id: 'c1000000-0000-7000-8000-000000000008',
    code: 'WLG-0008',
    employeeId: 'emp-fajar',
    taskId: TSK_4,
    activityTypeId: 'e5000000-0000-7000-8000-000000000003',
    origin: 'DIKETIK_MANUSIA',
    startedAt: null,
    stoppedAt: null,
    workDate: '2026-09-24',
    durationMinutes: 120,
    notes: null,
    isCorrected: false,
    correctionMode: null,
    paidWorkGroupIdSnapshot: PWG_1,
    createdAt: '2026-09-24T16:00:00+07:00',
  },
];

export const WORKLOG_CHANGE_SEED: WorklogChange[] = [
  {
    id: 'wc-0001',
    worklogId: 'c1000000-0000-7000-8000-000000000003',
    changedField: 'duration_minutes',
    oldValue: '480',
    newValue: '300',
    activity: 'U',
    createdBy: { employeeId: 'emp-dedi', name: 'Dedi Kurniawan' },
    createdAt: '2026-07-24T08:10:00+07:00',
  },
];

export const ACCEPTANCE_SEED: SystemStopAcceptance[] = [
  {
    id: 'h4000000-0000-7000-8000-000000000001',
    worklogId: 'c1000000-0000-7000-8000-000000000004',
    createdBy: { employeeId: 'emp-rina-amelia', name: 'Rina Amelia' },
    createdAt: '2026-07-24T08:30:00+07:00',
  },
];

type PeriodSeed = Pick<
  TimesheetPeriod,
  | 'id'
  | 'employeeId'
  | 'periodStart'
  | 'periodEnd'
  | 'state'
  | 'submittedAt'
  | 'approvedAt'
  | 'payrollConfirmedAt'
  | 'reopenReason'
>;

export const PERIOD_SEED: PeriodSeed[] = [
  {
    id: 'd2000000-0000-7000-8000-000000000001',
    employeeId: 'emp-dedi',
    periodStart: '2026-07-01',
    periodEnd: '2026-07-31',
    state: 'DISAHKAN',
    submittedAt: '2026-08-01T17:00:00+07:00',
    approvedAt: '2026-08-01T19:00:00+07:00',
    payrollConfirmedAt: '2026-08-02T06:00:00+07:00',
    reopenReason: null,
  },
  {
    id: 'd2000000-0000-7000-8000-000000000002',
    employeeId: 'emp-dedi',
    periodStart: '2026-08-01',
    periodEnd: '2026-08-31',
    state: 'DISAHKAN',
    submittedAt: '2026-09-01T17:00:00+07:00',
    approvedAt: '2026-09-02T10:00:00+07:00',
    payrollConfirmedAt: null,
    reopenReason: null,
  },
  {
    id: 'd2000000-0000-7000-8000-000000000003',
    employeeId: 'emp-dedi',
    periodStart: '2026-09-01',
    periodEnd: '2026-09-30',
    state: 'BELUM_DIAJUKAN',
    submittedAt: null,
    approvedAt: null,
    payrollConfirmedAt: null,
    reopenReason: null,
  },
  {
    id: 'd2000000-0000-7000-8000-000000000004',
    employeeId: 'emp-fajar',
    periodStart: '2026-09-01',
    periodEnd: '2026-09-30',
    state: 'BELUM_DIAJUKAN',
    submittedAt: null,
    approvedAt: null,
    payrollConfirmedAt: null,
    reopenReason: null,
  },
];
