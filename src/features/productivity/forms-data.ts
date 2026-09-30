import type { Form, FormSubmission, FormWindowGrant } from '@/features/productivity/types';

/**
 * Dataset Forms & Survey — dataset skenario positif §5 (Form A/B/C). Form D (sensitif) adalah contoh HIPOTETIS
 * bertanda eksplisit: dataset positif sengaja tidak memuat formulir `is_sensitive=true` (UIC §5.1), tetapi gerbang
 * sensitivitas perlu dapat dicoba di layar.
 */
type FormSeed = Omit<Form, 'submissionCount' | 'attributesLocked'>;

const q = (
  id: string,
  order: number,
  questionType: Form['questions'][number]['questionType'],
  questionText: string,
  choices?: string[],
) => ({ id, questionType, questionText, questionChoices: choices ?? null, questionOrder: order });

export const FORM_SEED: FormSeed[] = [
  {
    id: 'f4000000-0000-7000-8000-000000000001',
    code: 'FRM-0001',
    formTitle: 'Survei Kepuasan Kerja Q3',
    identityMode: 'BER_IDENTITAS',
    obligation: 'SUKARELA',
    audienceScope: 'SELURUH_KARYAWAN',
    audiencePositionIds: [],
    isSensitive: false,
    responseDueDate: null,
    retentionMonths: null,
    state: 'TERBUKA',
    questions: [
      q('fq-0001', 1, 'PILIHAN_SATU', 'Seberapa puas Anda bekerja bulan ini? (1-5)', ['1', '2', '3', '4', '5']),
      q('fq-0002', 2, 'ISIAN_TEKS', 'Saran perbaikan?'),
    ],
    createdAt: '2026-07-20T09:00:00+07:00',
  },
  {
    id: 'f4000000-0000-7000-8000-000000000002',
    code: 'FRM-0002',
    formTitle: 'Update Data Kontak Darurat',
    identityMode: 'BER_IDENTITAS',
    obligation: 'WAJIB',
    audienceScope: 'PER_BAGIAN',
    audiencePositionIds: ['pos-swe', 'pos-qa'],
    isSensitive: false,
    responseDueDate: '2026-10-15',
    retentionMonths: null,
    state: 'TERBUKA',
    questions: [
      q('fq-0003', 1, 'ISIAN_TEKS', 'Nama kontak darurat'),
      q('fq-0004', 2, 'ISIAN_TEKS', 'Nomor telepon kontak darurat'),
      q('fq-0005', 3, 'PILIHAN_SATU', 'Hubungan dengan Anda', ['Orang tua', 'Pasangan', 'Saudara', 'Lainnya']),
    ],
    createdAt: '2026-07-22T09:00:00+07:00',
  },
  {
    id: 'f4000000-0000-7000-8000-000000000003',
    code: 'FRM-0003',
    formTitle: 'Survei Anonim Kepuasan Fasilitas Kantor',
    identityMode: 'ANONIM',
    obligation: 'SUKARELA',
    audienceScope: 'SELURUH_KARYAWAN',
    audiencePositionIds: [],
    isSensitive: false,
    responseDueDate: null,
    retentionMonths: null,
    state: 'TERBUKA',
    questions: [
      q('fq-0006', 1, 'PILIHAN_SATU', 'Nilai kenyamanan ruang kerja (1-5)', ['1', '2', '3', '4', '5']),
      q('fq-0007', 2, 'PILIHAN_BANYAK', 'Fasilitas yang perlu diperbaiki', [
        'Pendingin ruangan',
        'Pantry',
        'Ruang rapat',
        'Parkir',
      ]),
      q('fq-0008', 3, 'ISIAN_TEKS', 'Masukan lain'),
    ],
    createdAt: '2026-08-01T09:00:00+07:00',
  },
  {
    id: 'f4000000-0000-7000-8000-000000000004',
    code: 'FRM-0004',
    formTitle: 'Skrining Kesehatan Kerja 2026 (contoh sensitif)',
    identityMode: 'BER_IDENTITAS',
    obligation: 'WAJIB',
    audienceScope: 'SELURUH_KARYAWAN',
    audiencePositionIds: [],
    isSensitive: true,
    responseDueDate: '2026-10-31',
    retentionMonths: 24,
    state: 'TERBUKA',
    questions: [
      q('fq-0009', 1, 'PILIHAN_SATU', 'Apakah Anda memiliki keluhan kesehatan kronis?', ['Ya', 'Tidak']),
      q('fq-0010', 2, 'TANGGAL', 'Tanggal pemeriksaan kesehatan terakhir'),
      q('fq-0011', 3, 'ANGKA', 'Rata-rata jam tidur per malam'),
    ],
    createdAt: '2026-09-01T09:00:00+07:00',
  },
];

const answer = (questionId: string, form: FormSeed, value: string[]) => {
  const question = form.questions.find((row) => row.id === questionId)!;
  return {
    questionId,
    questionTypeSnapshot: question.questionType,
    questionTextSnapshot: question.questionText,
    questionChoicesSnapshot: question.questionChoices,
    answerValue: value,
  };
};
const [A, B, C, D] = FORM_SEED;

/** Form A — lima responden (ambang interim 5, PROB-SECURITY-076): skor 3×1, 4×3, 5×1. */
export const SUBMISSION_SEED: FormSubmission[] = [
  ...[
    ['emp-dedi', '4', 'Perbanyak sesi berbagi pengetahuan.'],
    ['emp-fajar', '4', 'Jadwal rapat lebih ringkas.'],
    ['emp-sinta', '5', 'Sudah baik.'],
    ['emp-rina-amelia', '3', 'Beban kerja kuartal ini tinggi.'],
    ['emp-lukman', '4', 'Pelatihan tambahan.'],
  ].map(([employeeId, score, text], index) => ({
    id: `5b000000-0000-7000-8000-00000000000${index + 1}`,
    formId: A.id,
    respondentEmployeeId: employeeId,
    submittedAt: `2026-07-${25 + index}T14:00:00+07:00`,
    items: [answer('fq-0001', A, [score]), answer('fq-0002', A, [text])],
  })),
  {
    id: '5b000000-0000-7000-8000-000000000006',
    formId: B.id,
    respondentEmployeeId: 'emp-dedi',
    submittedAt: '2026-07-26T10:00:00+07:00',
    items: [
      answer('fq-0003', B, ['Sri Kurniawati']),
      answer('fq-0004', B, ['0812-3456-7788']),
      answer('fq-0005', B, ['Orang tua']),
    ],
  },
  {
    id: '5b000000-0000-7000-8000-000000000007',
    formId: C.id,
    respondentEmployeeId: null,
    submittedAt: '2026-08-03T11:00:00+07:00',
    items: [
      answer('fq-0006', C, ['3']),
      answer('fq-0007', C, ['Pendingin ruangan', 'Parkir']),
      answer('fq-0008', C, ['AC lantai 3 sering mati.']),
    ],
  },
  {
    id: '5b000000-0000-7000-8000-000000000008',
    formId: C.id,
    respondentEmployeeId: null,
    submittedAt: '2026-08-04T16:00:00+07:00',
    items: [answer('fq-0006', C, ['4']), answer('fq-0007', C, ['Pantry']), answer('fq-0008', C, [''])],
  },
  {
    id: '5b000000-0000-7000-8000-000000000009',
    formId: D.id,
    respondentEmployeeId: 'emp-sinta',
    submittedAt: '2026-09-05T08:30:00+07:00',
    items: [answer('fq-0009', D, ['Tidak']), answer('fq-0010', D, ['2026-03-12']), answer('fq-0011', D, ['7'])],
  },
];

export const FORM_GRANT_SEED: FormWindowGrant[] = [
  {
    id: 'fg-0001',
    formId: B.id,
    targetEmployeeId: 'emp-fajar',
    grantReason: 'Fajar dinas luar saat formulir dibuka — diberi kesempatan mengisi.',
    grantedBy: { employeeId: 'emp-hesti', name: 'Hesti Wulandari' },
    grantedAt: '2026-08-10T09:00:00+07:00',
  },
];

/** Ambang minimum responden agregat — NILAI INTERIM, menunggu keputusan USER (PROB-SECURITY-076). */
export const AGGREGATE_THRESHOLD = 5;
