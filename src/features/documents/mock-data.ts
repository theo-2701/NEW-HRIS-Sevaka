import type { DocActor, DocCategory, DocumentDetail, DocVersion, TemplateDetail } from '@/features/documents/types';

/**
 * Dataset contoh Document Service (UIC-DOCUMENT §2–§4). `DOK-1..4` mengikuti dataset dokumen;
 * lima berkas perusahaan lain memakai `documentId` yang sama dengan lampiran Announcement, dan
 * berkas objek memakai id aset/vendor/cabang milik fitur `assets`/`company`.
 */
const at = (date: string, time = '09:00') => `${date}T${time}:00+07:00`;

export const HESTI = { employeeId: 'emp-hesti', nama: 'Hesti Wulandari', nik: '20220301' };
export const RINA = { employeeId: 'emp-rina-amelia', nama: 'Rina Amelia', nik: '20210715' };

export const CATEGORY_SEED: DocCategory[] = [
  {
    id: 'cat-skk',
    categoryName: 'Surat Keterangan Kerja',
    confidentialityClass: 'BIASA',
    retentionRegime: 'TEMPORARY',
    isActive: true,
    shownInSelfService: true,
  },
  {
    id: 'cat-dokter',
    categoryName: 'Surat Dokter',
    confidentialityClass: 'SENSITIF',
    retentionRegime: 'PERMANENT',
    isActive: true,
    shownInSelfService: true,
  },
  {
    id: 'cat-vendor',
    categoryName: 'Kontrak Vendor',
    confidentialityClass: 'BIASA',
    retentionRegime: 'PERMANENT',
    isActive: true,
    shownInSelfService: false,
  },
  {
    id: 'cat-aset',
    categoryName: 'Berkas Serah Terima Aset',
    confidentialityClass: 'BIASA',
    retentionRegime: 'TEMPORARY',
    isActive: true,
    shownInSelfService: false,
  },
  {
    id: 'cat-kebijakan',
    categoryName: 'Peraturan & Kebijakan',
    confidentialityClass: 'BIASA',
    retentionRegime: 'PERMANENT',
    isActive: true,
    shownInSelfService: false,
  },
  {
    id: 'cat-peringatan',
    categoryName: 'Surat Peringatan',
    confidentialityClass: 'BIASA',
    retentionRegime: 'PERMANENT',
    isActive: true,
    shownInSelfService: true,
  },
];

/** Karyawan yang bisa dipilih di Employee Files (sumber nyata: employee-service directory). */
export const EMPLOYEE_PICKER = [
  { employeeId: 'emp-yanti', nama: 'Yanti Prasetya', nik: '20190912', department: 'Operations' },
  { employeeId: 'emp-rina', nama: 'Rina Wulandari', nik: '20200415', department: 'Finance' },
  { employeeId: 'emp-budi', nama: 'Budi Santoso', nik: '20230204', department: 'Operations' },
];

const v = (
  id: string,
  no: number,
  filename: string,
  size: number,
  date: string,
  extra: Partial<DocVersion> = {},
): DocVersion => ({
  versionId: id,
  versionNo: no,
  originalFilename: filename,
  sizeBytes: size,
  detectedMime: filename.endsWith('.png')
    ? 'image/png'
    : filename.endsWith('.docx')
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : 'application/pdf',
  scanState: 'BERSIH',
  storageTier: 'PANAS',
  scannedAt: at(date, '09:01'),
  createdAt: at(date),
  ...extra,
});

type Seed = Omit<DocumentDetail, 'activeVersionId' | 'categoryName' | 'confidentialityClassEffective' | 'updatedAt'>;

const company = (id: string, categoryId: string, version: DocVersion): Seed => ({
  documentId: id,
  categoryId,
  origin: 'DIUNGGAH',
  ownerType: 'PERUSAHAAN',
  ownerObjectKind: null,
  ownerId: null,
  createdAt: version.createdAt,
  versions: [version],
  letter: null,
});

export const DOCUMENT_SEED: Seed[] = [
  company('dok-1', 'cat-kebijakan', v('ver-1', 1, 'peraturan-perusahaan-2026.pdf', 842013, '2026-03-11')),
  company('doc-sk-libur-2027', 'cat-kebijakan', v('ver-11', 1, 'SK Libur Idulfitri 2027.pdf', 482113, '2026-09-10')),
  company(
    'doc-kebijakan-wfh',
    'cat-kebijakan',
    v('ver-12', 1, 'Kebijakan Kerja dari Rumah v2.pdf', 1204551, '2026-08-20'),
  ),
  company(
    'doc-agenda-townhall',
    'cat-kebijakan',
    v('ver-13', 1, 'Agenda Town Hall Q3.pdf', 215902, '2026-09-01', { storageTier: 'DINGIN' }),
  ),
  company(
    'doc-prosedur-klaim',
    'cat-kebijakan',
    v('ver-14', 1, 'Prosedur Klaim Reimbursement 2026.docx', 96340, '2026-08-25'),
  ),
  company(
    'doc-denah-kantor',
    'cat-kebijakan',
    v('ver-15', 1, 'Denah Kantor Pusat.png', 2310004, '2026-07-02', { scanState: 'TIDAK_DIPERIKSA', scannedAt: null }),
  ),
  {
    documentId: 'dok-2',
    categoryId: 'cat-dokter',
    origin: 'DIUNGGAH',
    ownerType: 'KARYAWAN',
    ownerObjectKind: null,
    ownerId: 'emp-yanti',
    createdAt: at('2026-07-28'),
    versions: [
      v('ver-21', 1, 'surat-dokter.pdf', 318400, '2026-07-28'),
      v('ver-22', 2, 'surat-dokter-revisi.pdf', 321990, '2026-07-30'),
    ],
    letter: null,
  },
  {
    documentId: 'dok-4',
    categoryId: 'cat-skk',
    origin: 'DILAHIRKAN_SISTEM',
    ownerType: 'KARYAWAN',
    ownerObjectKind: null,
    ownerId: 'emp-yanti',
    createdAt: at('2026-08-05', '14:22'),
    versions: [v('ver-41', 1, 'skk-yanti-prasetya.pdf', 128774, '2026-08-05')],
    letter: {
      letterId: 'let-1',
      letterNo: '001/HRD/VIII/2026',
      letterTarget: 'PERORANGAN',
      letterIssuanceState: 'TERBIT',
      letterState: 'BERLAKU',
      issuedAt: at('2026-08-05', '14:22'),
      templateId: 'tpl-skk',
      templateVersionId: 'tv-skk-2',
    },
  },
  {
    documentId: 'dok-5',
    categoryId: 'cat-skk',
    origin: 'DILAHIRKAN_SISTEM',
    ownerType: 'KARYAWAN',
    ownerObjectKind: null,
    ownerId: 'emp-rina',
    createdAt: at('2026-06-12', '10:05'),
    versions: [v('ver-51', 1, 'skk-rina-wulandari.pdf', 127310, '2026-06-12')],
    letter: null,
  },
  {
    documentId: 'dok-6',
    categoryId: 'cat-dokter',
    origin: 'DIUNGGAH',
    ownerType: 'KARYAWAN',
    ownerObjectKind: null,
    ownerId: 'emp-budi',
    createdAt: at('2026-09-02'),
    versions: [
      v('ver-61', 1, 'surat-dokter-budi.pdf', 290115, '2026-09-02', {
        scanState: 'MENUNGGU_PEMERIKSAAN',
        scannedAt: null,
      }),
    ],
    letter: null,
  },
  {
    documentId: 'dok-3',
    categoryId: 'cat-vendor',
    origin: 'DIUNGGAH',
    ownerType: 'OBJEK_LAIN',
    ownerObjectKind: 'VENDOR',
    ownerId: 'vd-mitra',
    createdAt: at('2026-06-02'),
    versions: [v('ver-31', 1, 'kontrak-cv-mitra-sejahtera.pdf', 456789, '2026-06-02')],
    letter: null,
  },
  {
    documentId: 'dok-7',
    categoryId: 'cat-aset',
    origin: 'DIUNGGAH',
    ownerType: 'OBJEK_LAIN',
    ownerObjectKind: 'ASET',
    ownerId: 'as-0001',
    createdAt: at('2026-01-12'),
    versions: [v('ver-71', 1, 'bast-laptop-thinkpad-t14.pdf', 201442, '2026-01-12')],
    letter: null,
  },
  {
    documentId: 'dok-8',
    categoryId: 'cat-kebijakan',
    origin: 'DIUNGGAH',
    ownerType: 'OBJEK_LAIN',
    ownerObjectKind: 'CABANG',
    ownerId: 'br-bdg',
    createdAt: at('2026-04-18'),
    versions: [v('ver-81', 1, 'izin-domisili-cabang-bandung.pdf', 350221, '2026-04-18')],
    letter: null,
  },
];

/** Nama objek pemilik untuk Other Files — id sama dengan fitur `assets`/`company`. */
export const OBJECT_OPTIONS: { kind: 'ASET' | 'VENDOR' | 'CABANG'; id: string; name: string }[] = [
  { kind: 'ASET', id: 'as-0001', name: 'AS-0001 · Laptop ThinkPad T14' },
  { kind: 'ASET', id: 'as-0003', name: 'AS-0003 · Toyota Avanza' },
  { kind: 'VENDOR', id: 'vd-sumber', name: 'PT Sumber Jaya' },
  { kind: 'VENDOR', id: 'vd-mitra', name: 'CV Mitra Sejahtera' },
  { kind: 'CABANG', id: 'br-jkt', name: 'Kantor Pusat Jakarta' },
  { kind: 'CABANG', id: 'br-bdg', name: 'Cabang Bandung' },
];

export const TEMPLATE_SEED: TemplateDetail[] = [
  {
    id: 'tpl-skk',
    templateName: 'Surat Keterangan Kerja',
    categoryId: 'cat-skk',
    categoryName: 'Surat Keterangan Kerja',
    categoryRetentionRegime: 'TEMPORARY',
    letterTarget: 'PERORANGAN',
    signerScope: 'CABANG',
    isSelfRequestable: true,
    requiresApproval: false,
    isActive: true,
    activeVersionId: 'tv-skk-2',
    activeVersionNo: 2,
    createdAt: at('2026-08-01'),
    versions: [
      {
        versionId: 'tv-skk-1',
        versionNo: 1,
        templateVersionState: 'DISETUJUI',
        isActiveVersion: false,
        body: 'SURAT KETERANGAN KERJA\n\nYang bertanda tangan di bawah ini menerangkan bahwa:\nNama: %%nama_karyawan%%\nNIK: %%nik%%\n\nadalah karyawan aktif perusahaan.',
        createdBy: HESTI,
        createdAt: at('2026-08-01'),
        approvedBy: RINA,
        approvedAt: at('2026-08-01', '11:00'),
      },
      {
        versionId: 'tv-skk-2',
        versionNo: 2,
        templateVersionState: 'DISETUJUI',
        isActiveVersion: true,
        body: 'SURAT KETERANGAN KERJA\nNomor: %%nomor_surat%%\n\nYang bertanda tangan di bawah ini menerangkan bahwa:\nNama: %%nama_karyawan%%\nNIK: %%nik%%\nJabatan: %%jabatan%%\n\nadalah karyawan aktif perusahaan sejak %%tanggal_bergabung%%.',
        createdBy: HESTI,
        createdAt: at('2026-08-04'),
        approvedBy: RINA,
        approvedAt: at('2026-08-04', '10:30'),
      },
      {
        versionId: 'tv-skk-3',
        versionNo: 3,
        templateVersionState: 'MENUNGGU_PERSETUJUAN',
        isActiveVersion: false,
        body: 'SURAT KETERANGAN KERJA\nNomor: %%nomor_surat%%\n\n(kop surat diperbarui)\nNama: %%nama_karyawan%%\nNIK: %%nik%%\nJabatan: %%jabatan%%',
        createdBy: HESTI,
        createdAt: at('2026-08-07', '08:30'),
        approvedBy: null,
        approvedAt: null,
      },
    ],
  },
  {
    id: 'tpl-sp',
    templateName: 'Surat Peringatan',
    categoryId: 'cat-peringatan',
    categoryName: 'Surat Peringatan',
    categoryRetentionRegime: 'PERMANENT',
    letterTarget: 'PERORANGAN',
    signerScope: 'KANTOR_PUSAT',
    isSelfRequestable: false,
    requiresApproval: true,
    isActive: true,
    activeVersionId: null,
    activeVersionNo: null,
    createdAt: at('2026-08-06'),
    versions: [
      {
        versionId: 'tv-sp-1',
        versionNo: 1,
        templateVersionState: 'MENUNGGU_PERSETUJUAN',
        isActiveVersion: false,
        body: 'SURAT PERINGATAN\nNomor: %%nomor_surat%%\n\nDitujukan kepada %%nama_karyawan%% (NIK %%nik%%) atas pelanggaran %%jenis_pelanggaran%%.',
        createdBy: HESTI,
        createdAt: at('2026-08-06', '13:00'),
        approvedBy: null,
        approvedAt: null,
      },
    ],
  },
];

/** Identitas per layar — mengikuti aktor uji dokumen. */
export const VIEWERS: Record<'company' | 'employee' | 'other' | 'templates' | 'ess', DocActor[]> = {
  company: [
    { employeeId: 'emp-wawan', label: 'Wawan Setiadi — System Admin', role: 'ROLE_SYSTEM_ADMIN' },
    { employeeId: 'emp-hesti', label: 'Hesti Wulandari — HR Manager', role: 'ROLE_HR_MANAGER' },
    { employeeId: 'emp-rina-amelia', label: 'Rina Amelia — Super Admin', role: 'ROLE_SUPER_ADMIN' },
    { employeeId: 'emp-nurul', label: 'Nurul Aini — GA Staff (no access)', role: 'ROLE_GA_STAFF' },
  ],
  employee: [
    { employeeId: 'emp-hesti', label: 'Hesti Wulandari — HR Manager', role: 'ROLE_HR_MANAGER' },
    { employeeId: 'emp-dedi', label: 'Dedi Kurniawan — HR Staff', role: 'ROLE_HR_STAFF' },
    { employeeId: 'emp-rina-amelia', label: 'Rina Amelia — Super Admin', role: 'ROLE_SUPER_ADMIN' },
    {
      employeeId: 'emp-budi',
      label: 'Budi Santoso — Dept Manager (Operations)',
      role: 'ROLE_DEPARTMENT_MANAGER',
      unit: 'Operations',
    },
    { employeeId: 'emp-prasetyo', label: 'dr. Prasetyo Adi — Health Data Officer', role: 'ROLE_HEALTH_DATA_OFFICER' },
    { employeeId: 'emp-sinta', label: 'Sinta Marlina — Finance Officer', role: 'ROLE_FINANCE_OFFICER' },
  ],
  other: [
    { employeeId: 'emp-nurul', label: 'Nurul Aini — GA Staff', role: 'ROLE_GA_STAFF' },
    { employeeId: 'emp-rina-amelia', label: 'Rina Amelia — Super Admin', role: 'ROLE_SUPER_ADMIN' },
  ],
  templates: [
    { employeeId: 'emp-hesti', label: 'Hesti Wulandari — HR Manager', role: 'ROLE_HR_MANAGER' },
    { employeeId: 'emp-rina-amelia', label: 'Rina Amelia — Super Admin (second hand)', role: 'ROLE_SUPER_ADMIN' },
    { employeeId: 'emp-dedi', label: 'Dedi Kurniawan — HR Staff (no access)', role: 'ROLE_HR_STAFF' },
  ],
  ess: [
    { employeeId: 'emp-yanti', label: 'Yanti Prasetya', role: 'ROLE_EMPLOYEE' },
    { employeeId: 'emp-rina', label: 'Rina Wulandari', role: 'ROLE_EMPLOYEE' },
  ],
};
