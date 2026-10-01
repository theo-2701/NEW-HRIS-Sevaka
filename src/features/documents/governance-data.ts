import { HESTI, RINA } from '@/features/documents/mock-data';
import { createLocalEmployeeSource } from '@/lib/employeeSource';
import type {
  AccessTrailRow,
  CategoryAdmin,
  DocActor,
  Letter,
  LetterBatch,
  LetterBatchItem,
  MalwareAlert,
  PersonSnapshot,
  TemplateDetail,
} from '@/features/documents/types';

/**
 * Dataset Letter Issuance · Pengaturan Kategori · Jejak Akses · Malware Alerts · Pemeriksaan Keaslian
 * (FSD-001-DOCUMENT-0.8 §5, §7–§9 · UIC-001-DOCUMENT-0.6 §4–§7). Skenario `BATCH-1`/`BATCH-2` dan surat
 * `001/HRD/VIII/2026` (kode periksa `K7M2-P4QX-9WTB`) mengikuti dataset dokumen.
 */
const at = (date: string, time = '09:00') => `${date}T${time}:00+07:00`;

export const DEDI_HR: PersonSnapshot = { employeeId: 'emp-dedi', nama: 'Dedi Kurniawan', nik: '20240117' };

/** Resolusi nama/NIK lapis tampilan (sumber nyata: employee-service). */
export const DOC_PEOPLE: PersonSnapshot[] = [
  HESTI,
  RINA,
  DEDI_HR,
  { employeeId: 'emp-yanti', nama: 'Yanti Prasetya', nik: '20190912' },
  { employeeId: 'emp-rina', nama: 'Rina Wulandari', nik: '20200415' },
  { employeeId: 'emp-budi', nama: 'Budi Santoso', nik: '20230204' },
  { employeeId: 'emp-wawan', nama: 'Wawan Setiadi', nik: '20180303' },
  { employeeId: 'emp-nurul', nama: 'Nurul Aini', nik: '20210822' },
  { employeeId: 'emp-prasetyo', nama: 'dr. Prasetyo Adi', nik: '20170519' },
  { employeeId: 'emp-sinta', nama: 'Sinta Marlina', nik: '20220614' },
];

/** Karyawan yang dapat menjadi pokok surat/penerima massal (PICKER → employee-service). */
export const LETTER_SUBJECTS = DOC_PEOPLE.filter((row) =>
  ['emp-yanti', 'emp-rina', 'emp-budi', 'emp-dedi', 'emp-nurul', 'emp-sinta'].includes(row.employeeId),
);

const toEmployeeOption = (row: PersonSnapshot) => ({ id: row.employeeId, name: row.nama, nik: row.nik });

/** Sumber `<EmployeeSelect>` modul Documents — dummy belum memuat unit, jadi baris berisi nama · NIK. */
export const DOC_PEOPLE_SOURCE = createLocalEmployeeSource('documents-people', () => DOC_PEOPLE.map(toEmployeeOption));
export const LETTER_SUBJECT_SOURCE = createLocalEmployeeSource('letter-subjects', () =>
  LETTER_SUBJECTS.map(toEmployeeOption),
);

export const BRANCHES = [
  { id: 'br-jkt', name: 'Kantor Pusat Jakarta' },
  { id: 'br-bdg', name: 'Cabang Bandung' },
];

export const GOV_VIEWERS: Record<'letters' | 'categories' | 'trail' | 'malware', DocActor[]> = {
  letters: [
    { employeeId: 'emp-dedi', label: 'Dedi Kurniawan — HR Staff', role: 'ROLE_HR_STAFF' },
    { employeeId: 'emp-hesti', label: 'Hesti Wulandari — HR Manager', role: 'ROLE_HR_MANAGER' },
    { employeeId: 'emp-rina-amelia', label: 'Rina Amelia — Super Admin (backup approver)', role: 'ROLE_SUPER_ADMIN' },
  ],
  categories: [
    { employeeId: 'emp-hesti', label: 'Hesti Wulandari — HR Manager', role: 'ROLE_HR_MANAGER' },
    { employeeId: 'emp-rina-amelia', label: 'Rina Amelia — Super Admin (second person)', role: 'ROLE_SUPER_ADMIN' },
    { employeeId: 'emp-dedi', label: 'Dedi Kurniawan — HR Staff (no access)', role: 'ROLE_HR_STAFF' },
  ],
  trail: [
    { employeeId: 'emp-hesti', label: 'Hesti Wulandari — HR Manager', role: 'ROLE_HR_MANAGER' },
    { employeeId: 'emp-rina-amelia', label: 'Rina Amelia — Super Admin', role: 'ROLE_SUPER_ADMIN' },
    {
      employeeId: 'emp-prasetyo',
      label: 'dr. Prasetyo Adi — Health Data Officer (no access)',
      role: 'ROLE_HEALTH_DATA_OFFICER',
    },
  ],
  malware: [
    { employeeId: 'emp-hesti', label: 'Hesti Wulandari — HR Manager', role: 'ROLE_HR_MANAGER' },
    { employeeId: 'emp-rina-amelia', label: 'Rina Amelia — Super Admin', role: 'ROLE_SUPER_ADMIN' },
    { employeeId: 'emp-budi', label: 'Budi Santoso — Employee, uploader (no access)', role: 'ROLE_EMPLOYEE' },
  ],
};

/** Dua templat tambahan agar kedua cabang gerbang & surat edaran dapat dicoba (tidak dapat diminta mandiri). */
export const EXTRA_TEMPLATE_SEED: TemplateDetail[] = [
  {
    id: 'tpl-tugas',
    templateName: 'Surat Tugas Dinas',
    categoryId: 'cat-skk',
    categoryName: 'Surat Keterangan Kerja',
    categoryRetentionRegime: 'TEMPORARY',
    letterTarget: 'PERORANGAN',
    signerScope: 'CABANG',
    isSelfRequestable: false,
    requiresApproval: true,
    isActive: true,
    activeVersionId: 'tv-tugas-1',
    activeVersionNo: 1,
    createdAt: at('2026-08-10'),
    versions: [
      {
        versionId: 'tv-tugas-1',
        versionNo: 1,
        templateVersionState: 'DISETUJUI',
        isActiveVersion: true,
        body: 'SURAT TUGAS\nNomor: %%nomor_surat%%\n\nMenugaskan %%nama_karyawan%% (NIK %%nik%%) untuk perjalanan dinas.',
        createdBy: HESTI,
        createdAt: at('2026-08-10'),
        approvedBy: RINA,
        approvedAt: at('2026-08-10', '13:00'),
      },
    ],
  },
  {
    id: 'tpl-edaran',
    templateName: 'Surat Edaran Libur Nasional',
    categoryId: 'cat-kebijakan',
    categoryName: 'Peraturan & Kebijakan',
    categoryRetentionRegime: 'PERMANENT',
    letterTarget: 'EDARAN',
    signerScope: 'KANTOR_PUSAT',
    isSelfRequestable: false,
    requiresApproval: false,
    isActive: true,
    activeVersionId: 'tv-edaran-1',
    activeVersionNo: 1,
    createdAt: at('2026-08-12'),
    versions: [
      {
        versionId: 'tv-edaran-1',
        versionNo: 1,
        templateVersionState: 'DISETUJUI',
        isActiveVersion: true,
        body: 'SURAT EDARAN\nNomor: %%nomor_surat%%\n\nDiberitahukan kepada seluruh karyawan %%nama_cabang%% mengenai jadwal libur nasional.',
        createdBy: HESTI,
        createdAt: at('2026-08-12'),
        approvedBy: RINA,
        approvedAt: at('2026-08-12', '15:00'),
      },
    ],
  },
];

/** Atribut kelola (`A6a`) per kategori — melengkapi CATEGORY_SEED (`A16` hanya id + nama). */
export const CATEGORY_ADMIN_SEED: Record<
  string,
  Pick<
    CategoryAdmin,
    | 'categoryCode'
    | 'categoryOrigin'
    | 'retentionDays'
    | 'maxFileSizeBytes'
    | 'allowedMimeTypes'
    | 'isReplaceable'
    | 'isRegenerable'
    | 'readerRoles'
  >
> = {
  'cat-skk': {
    categoryCode: 'employment_certificate',
    categoryOrigin: 'INDUK',
    retentionDays: 1095,
    maxFileSizeBytes: 5_242_880,
    allowedMimeTypes: ['application/pdf'],
    isReplaceable: true,
    isRegenerable: true,
    readerRoles: ['ROLE_HR_MANAGER', 'ROLE_HR_STAFF', 'ROLE_DEPARTMENT_MANAGER'],
  },
  'cat-dokter': {
    categoryCode: 'doctor_note',
    categoryOrigin: 'INDUK',
    retentionDays: null,
    maxFileSizeBytes: 10_485_760,
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    isReplaceable: false,
    isRegenerable: false,
    readerRoles: ['ROLE_HR_MANAGER', 'ROLE_HEALTH_DATA_OFFICER'],
  },
  'cat-vendor': {
    categoryCode: 'vendor_contract',
    categoryOrigin: 'INDUK',
    retentionDays: null,
    maxFileSizeBytes: 10_485_760,
    allowedMimeTypes: ['application/pdf'],
    isReplaceable: true,
    isRegenerable: false,
    readerRoles: ['ROLE_GA_STAFF', 'ROLE_SUPER_ADMIN'],
  },
  'cat-aset': {
    categoryCode: 'berkas_serah_terima_aset',
    categoryOrigin: 'PERUSAHAAN',
    retentionDays: 730,
    maxFileSizeBytes: 5_242_880,
    allowedMimeTypes: ['application/pdf'],
    isReplaceable: false,
    isRegenerable: false,
    readerRoles: ['ROLE_GA_STAFF', 'ROLE_SUPER_ADMIN'],
  },
  'cat-kebijakan': {
    categoryCode: 'company_policy',
    categoryOrigin: 'INDUK',
    retentionDays: null,
    maxFileSizeBytes: 26_214_400,
    allowedMimeTypes: [
      'application/pdf',
      'image/png',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    isReplaceable: true,
    isRegenerable: false,
    readerRoles: ['ROLE_SYSTEM_ADMIN', 'ROLE_HR_MANAGER', 'ROLE_SUPER_ADMIN'],
  },
  'cat-peringatan': {
    categoryCode: 'warning_letter',
    categoryOrigin: 'INDUK',
    retentionDays: null,
    maxFileSizeBytes: 5_242_880,
    allowedMimeTypes: ['application/pdf'],
    isReplaceable: false,
    isRegenerable: true,
    readerRoles: ['ROLE_HR_MANAGER', 'ROLE_HR_STAFF'],
  },
};

export const LETTER_SEED: Letter[] = [
  {
    letterId: 'let-1',
    templateId: 'tpl-skk',
    templateName: 'Surat Keterangan Kerja',
    templateVersionNo: 2,
    categoryId: 'cat-skk',
    letterTarget: 'PERORANGAN',
    letterIssuanceState: 'TERBIT',
    letterState: 'BERLAKU',
    subjectEmployeeId: 'emp-yanti',
    branchId: null,
    letterNo: '001/HRD/VIII/2026',
    verificationCode: 'K7M2-P4QX-9WTB',
    issuedAt: at('2026-08-05', '14:22'),
    documentId: 'dok-4',
    cancelledAt: null,
    cancelReason: null,
    createdBy: DEDI_HR,
    createdAt: at('2026-08-05', '14:22'),
  },
  {
    letterId: 'let-2',
    templateId: 'tpl-skk',
    templateName: 'Surat Keterangan Kerja',
    templateVersionNo: 1,
    categoryId: 'cat-skk',
    letterTarget: 'PERORANGAN',
    letterIssuanceState: 'TERBIT',
    letterState: 'DIBATALKAN',
    subjectEmployeeId: 'emp-rina',
    branchId: null,
    letterNo: '002/HRD/VI/2026',
    verificationCode: 'Q9D3-HT6L-2VZR',
    issuedAt: at('2026-06-12', '10:05'),
    documentId: 'dok-5',
    cancelledAt: at('2026-08-06', '09:40'),
    cancelReason: 'Penerima keliru, terbit atas nama yang salah',
    createdBy: DEDI_HR,
    createdAt: at('2026-06-12', '10:05'),
  },
  {
    letterId: 'let-3',
    templateId: 'tpl-tugas',
    templateName: 'Surat Tugas Dinas',
    templateVersionNo: 1,
    categoryId: 'cat-skk',
    letterTarget: 'PERORANGAN',
    letterIssuanceState: 'MENUNGGU_PERSETUJUAN',
    letterState: null,
    subjectEmployeeId: 'emp-nurul',
    branchId: null,
    letterNo: null,
    verificationCode: null,
    issuedAt: null,
    documentId: null,
    cancelledAt: null,
    cancelReason: null,
    createdBy: DEDI_HR,
    createdAt: at('2026-09-25', '11:10'),
  },
];

type BatchSeed = LetterBatch & { items: LetterBatchItem[] };

const item = (
  subjectEmployeeId: string,
  batchItemState: LetterBatchItem['batchItemState'],
  failureReason: string | null = null,
) => ({ subjectEmployeeId, batchItemState, letterId: null, failureReason });

export const BATCH_SEED: BatchSeed[] = [
  {
    id: 'batch-1',
    code: 'BATCH-1',
    templateId: 'tpl-skk',
    templateName: 'Surat Keterangan Kerja',
    templateVersionNo: 2,
    batchState: 'SELESAI',
    recipientCount: 3,
    submittedAt: at('2026-08-06', '10:15'),
    createdBy: DEDI_HR,
    approvedAt: at('2026-08-06', '10:40'),
    approvedBy: HESTI,
    finishedAt: at('2026-08-06', '10:47'),
    items: [
      item('emp-yanti', 'BERHASIL'),
      item('emp-dedi', 'BERHASIL'),
      item('emp-budi', 'GAGAL', 'Data pengisi surat tidak lengkap: jabatan formal belum ditetapkan'),
    ],
  },
  {
    id: 'batch-2',
    code: 'BATCH-2',
    templateId: 'tpl-skk',
    templateName: 'Surat Keterangan Kerja',
    templateVersionNo: 2,
    batchState: 'DITOLAK',
    recipientCount: 5,
    submittedAt: at('2026-08-04', '16:20'),
    createdBy: DEDI_HR,
    approvedAt: at('2026-08-04', '17:05'),
    approvedBy: HESTI,
    finishedAt: null,
    items: ['emp-yanti', 'emp-rina', 'emp-budi', 'emp-nurul', 'emp-sinta'].map((id) => item(id, 'MENUNGGU')),
  },
  {
    id: 'batch-3',
    code: 'BATCH-3',
    templateId: 'tpl-tugas',
    templateName: 'Surat Tugas Dinas',
    templateVersionNo: 1,
    batchState: 'MENUNGGU_PERSETUJUAN',
    recipientCount: 2,
    submittedAt: at('2026-09-26', '08:30'),
    createdBy: DEDI_HR,
    approvedAt: null,
    approvedBy: null,
    finishedAt: null,
    items: ['emp-nurul', 'emp-sinta'].map((id) => item(id, 'MENUNGGU')),
  },
];

const person = (id: string) => DOC_PEOPLE.find((row) => row.employeeId === id)!;

/** Enam baris dataset jejak akses — dua bentuk baris, satu bertanda tak wajar, satu dokumen sudah tersapu. */
export const ACCESS_TRAIL_SEED: AccessTrailRow[] = [
  {
    id: 'ja-1',
    accessGranularity: 'PER_PEMBUKAAN',
    documentId: 'dok-2',
    versionId: 'ver-22',
    documentIds: [],
    documentCount: 1,
    accessedAt: at('2026-08-01', '10:15'),
    accessedAtTimezone: 'Asia/Jakarta',
    sourceIp: '10.0.3.134',
    flaggedUnreasonable: false,
    accessedBy: person('emp-hesti'),
  },
  {
    id: 'ja-2',
    accessGranularity: 'PER_PEMBUKAAN',
    documentId: 'dok-4',
    versionId: 'ver-41',
    documentIds: [],
    documentCount: 1,
    accessedAt: at('2026-08-05', '15:00'),
    accessedAtTimezone: 'Asia/Jakarta',
    sourceIp: '10.0.3.134',
    flaggedUnreasonable: false,
    accessedBy: person('emp-yanti'),
  },
  {
    id: 'ja-3',
    accessGranularity: 'PER_PERMINTAAN',
    documentId: null,
    versionId: null,
    documentIds: [
      { documentId: 'dok-2', versionId: 'ver-22' },
      { documentId: 'dok-4', versionId: 'ver-41' },
    ],
    documentCount: 214,
    accessedAt: at('2026-08-06', '13:48'),
    accessedAtTimezone: 'Asia/Jakarta',
    sourceIp: '10.0.3.134',
    flaggedUnreasonable: true,
    accessedBy: DEDI_HR,
  },
  {
    id: 'ja-4',
    accessGranularity: 'PER_PERMINTAAN',
    documentId: null,
    versionId: null,
    documentIds: [
      { documentId: 'dok-4', versionId: 'ver-41' },
      { documentId: 'dok-5', versionId: 'ver-51' },
      { documentId: 'dok-6', versionId: 'ver-61' },
    ],
    documentCount: 3,
    accessedAt: at('2026-08-07', '09:20'),
    accessedAtTimezone: 'Asia/Jakarta',
    sourceIp: '10.0.3.134',
    flaggedUnreasonable: false,
    accessedBy: person('emp-sinta'),
  },
  {
    id: 'ja-5',
    accessGranularity: 'PER_PEMBUKAAN',
    documentId: null,
    versionId: null,
    documentIds: [],
    documentCount: 1,
    accessedAt: at('2026-03-02', '14:05'),
    accessedAtTimezone: 'Asia/Jakarta',
    sourceIp: '10.0.3.134',
    flaggedUnreasonable: false,
    accessedBy: RINA,
  },
  {
    id: 'ja-6',
    accessGranularity: 'PER_PEMBUKAAN',
    documentId: 'dok-2',
    versionId: 'ver-21',
    documentIds: [],
    documentCount: 1,
    accessedAt: at('2026-09-03', '11:30'),
    accessedAtTimezone: 'Asia/Jakarta',
    sourceIp: '10.0.3.134',
    flaggedUnreasonable: false,
    accessedBy: person('emp-prasetyo'),
  },
];

export const MALWARE_SEED: MalwareAlert[] = [
  {
    id: 'mw-0001',
    documentId: 'dok-6',
    versionId: 'ver-62',
    uploaderEmployeeId: 'emp-budi',
    detectedAt: at('2026-09-03', '09:12'),
    detectedAtTimezone: 'Asia/Jakarta',
    malwareAlertState: 'AKTIF',
    handledAt: null,
    handlingNote: null,
    handledBy: null,
  },
  {
    id: 'mw-0002',
    documentId: 'dok-2',
    versionId: 'ver-23',
    uploaderEmployeeId: 'emp-yanti',
    detectedAt: at('2026-09-18', '16:40'),
    detectedAtTimezone: 'Asia/Jakarta',
    malwareAlertState: 'AKTIF',
    handledAt: null,
    handlingNote: null,
    handledBy: null,
  },
  {
    id: 'mw-0003',
    documentId: 'dok-7',
    versionId: null,
    uploaderEmployeeId: 'emp-nurul',
    detectedAt: at('2026-07-11', '08:05'),
    detectedAtTimezone: 'Asia/Jakarta',
    malwareAlertState: 'DITANGANI',
    handledAt: at('2026-07-11', '13:20'),
    handlingNote: 'Perangkat pengunggah dibersihkan TI; berkas BAST diunggah ulang dari pindaian kantor.',
    handledBy: RINA,
  },
];
