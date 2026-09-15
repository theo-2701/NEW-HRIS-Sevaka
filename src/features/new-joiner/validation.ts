import * as Yup from 'yup';

/**
 * Skema NJ-CREATE (FSD §4.1 · UIC §4.1 & §1.7).
 *
 * Aturan kontrak yang ditegakkan di sini:
 *  • MbV — KTP wajib bila `nationality = CITIZEN`, paspor bila `FOREIGNER`;
 *    keduanya tidak pernah muncul bersamaan.
 *  • KTP tepat 16 digit angka; paspor 6–15 huruf/angka kapital.
 *  • Tanggal rencana masuk tidak boleh di masa lalu.
 */
const today = () => new Date().toISOString().slice(0, 10);

/** Regex `candidate_phone` (UIC-EMPLOYEE §9, TSD §8.3). */
export const CANDIDATE_PHONE = /^[0-9+][0-9]{6,19}$/;

/** Seragamkan nomor calon ke `+62…` sebelum dikirim ke auth-service saat materialize (UIC §4.1). */
export function normalizePhone(value: string): string {
  const compact = value.replace(/[\s-]/g, '');
  if (compact.startsWith('+')) return compact;
  if (compact.startsWith('62')) return `+${compact}`;
  if (compact.startsWith('0')) return `+62${compact.slice(1)}`;
  return compact;
}

export const candidateSchema = Yup.object({
  positionId: Yup.string().required('Posisi wajib dipilih.'),
  requisitionId: Yup.string(),
  name: Yup.string().trim().required('Nama kandidat wajib diisi.').max(150, 'Maksimal 150 karakter.'),
  nationality: Yup.string().oneOf(['CITIZEN', 'FOREIGNER']).required(),
  idCardNumber: Yup.string().when('nationality', {
    is: 'CITIZEN',
    then: (schema) =>
      schema
        .required('Nomor KTP wajib diisi untuk WNI.')
        .matches(/^\d{16}$/, 'Nomor KTP harus tepat 16 digit angka.'),
    otherwise: (schema) => schema,
  }),
  passportNumber: Yup.string().when('nationality', {
    is: 'FOREIGNER',
    then: (schema) =>
      schema
        .required('Nomor paspor wajib diisi untuk WNA.')
        .matches(/^[A-Z0-9]{6,15}$/, 'Paspor 6–15 karakter, hanya huruf dan angka.'),
    otherwise: (schema) => schema,
  }),
  email: Yup.string().required('Email kandidat wajib diisi.').email('Format email tidak valid.'),
  phone: Yup.string()
    .trim()
    .required('Nomor HP kandidat wajib diisi.')
    .test('phone', 'Format nomor HP tidak valid (mis. 0812… atau +62812…).', (value) => !value || CANDIDATE_PHONE.test(normalizePhone(value))),
  intendedJoinDate: Yup.string()
    .required('Tanggal rencana masuk wajib diisi.')
    .test('not-past', 'Tanggal rencana masuk tidak boleh di masa lalu.', (value) => !value || value >= today()),
});

/** Skema NJ-MATERIALIZE (FSD §4.3): kontrak sudah ditandatangani. */
export const materializeSchema = Yup.object({
  joinDate: Yup.string().required('Tanggal masuk wajib diisi.'),
  jobGradeId: Yup.string().required('Job grade wajib dipilih.'),
  contractFileName: Yup.string().required('Kontrak yang sudah ditandatangani wajib diunggah.'),
});
