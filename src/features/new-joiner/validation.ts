import * as Yup from 'yup';
import { newEmployeeSchema } from '@/features/new-joiner/newEmployee';

/**
 * Skema New Joiner (FSD-001-EMPLOYEE 0.46 §4 · UIC §4.1 & §1.7).
 *
 * Aturan kontrak yang ditegakkan di sini:
 *  • NJ-CREATE: Requisition → Posisi wajib; sumber Invite by email butuh email, From ATS butuh kandidat.
 *  • Ubah DRAFT — MbV: KTP wajib bila `nationality = CITIZEN`, paspor + visa bila `FOREIGNER`;
 *    keduanya tidak pernah muncul bersamaan. KTP tepat 16 digit; paspor 6–15 huruf/angka kapital.
 *  • Tanggal rencana masuk tidak boleh di masa lalu.
 */
const today = () => new Date().toISOString().slice(0, 10);

/**
 * Regex `candidate_phone` — diketatkan ke pola persis `phoneNumber` auth-service
 * (`TSD-EMPLOYEE 0.26` §8.3, `PROB-SERVICE-998`, audit 23 September 2026): `+62`/`0` diikuti
 * `8` lalu 7–12 digit. Diuji setelah `normalizePhone` menyeragamkan ke bentuk `+62…`.
 */
export const CANDIDATE_PHONE = /^(\+62|0)8[0-9]{7,12}$/;

/**
 * Regex `candidate_name` — subset pola `full_name` auth-service (`TSD-EMPLOYEE 0.26` §8.9,
 * dipisah dari §8.6 yang tetap untuk teks bebas lain seperti `position_title`). Huruf, spasi,
 * dan `'.,-` saja; diawali huruf, dan diakhiri huruf atau titik.
 */
export const CANDIDATE_NAME = /^[A-Za-z][A-Za-z\s'.,-]{1,148}[A-Za-z.]$/;

/** Seragamkan nomor calon ke `+62…` sebelum dikirim ke auth-service saat materialize (UIC §4.1). */
export function normalizePhone(value: string): string {
  const compact = value.replace(/[\s-]/g, '');
  if (compact.startsWith('+')) return compact;
  if (compact.startsWith('62')) return `+${compact}`;
  if (compact.startsWith('0')) return `+62${compact.slice(1)}`;
  return compact;
}

/** NJ-CREATE 0.46. */
export const inviteSchema = Yup.object({
  requisitionId: Yup.string().required('Choose a requisition.'),
  positionId: Yup.string().required('Choose a position.'),
  source: Yup.string().oneOf(['EMAIL', 'ATS']).required(),
  email: Yup.string().when('source', {
    is: 'EMAIL',
    then: (schema) => schema.trim().required('Enter the candidate email.').email('Enter a valid email address.'),
    otherwise: (schema) => schema,
  }),
  atsBridgeId: Yup.string().when('source', {
    is: 'ATS',
    then: (schema) => schema.required('Choose an ATS candidate.'),
    otherwise: (schema) => schema,
  }),
});

/**
 * Ubah DRAFT. `hasIdCard` = KTP sudah tersimpan (4 digit terakhir) — boleh dikosongkan supaya tetap
 * memakai yang lama, karena KTP transient tidak pernah dipulangkan ke form.
 */
export const candidateSchema = Yup.object({
  hasIdCard: Yup.boolean(),
  name: Yup.string()
    .trim()
    .required('Enter the candidate name.')
    .max(150, 'At most 150 characters.')
    .matches(CANDIDATE_NAME, "Only letters, spaces and '.,- — start with a letter."),
  nationality: Yup.string().oneOf(['CITIZEN', 'FOREIGNER'], 'Choose the nationality.').required('Choose the nationality.'),
  idCardNumber: Yup.string().when(['nationality', 'hasIdCard'], {
    is: (nationality: string, hasIdCard: boolean) => nationality === 'CITIZEN' && !hasIdCard,
    then: (schema) =>
      schema.required('Enter the ID card number.').matches(/^\d{16}$/, 'The ID card number must be exactly 16 digits.'),
    otherwise: (schema) => schema.matches(/^(\d{16})?$/, 'The ID card number must be exactly 16 digits.'),
  }),
  passportNumber: Yup.string().when('nationality', {
    is: 'FOREIGNER',
    then: (schema) =>
      schema
        .required('Enter the passport number.')
        .matches(/^[A-Z0-9]{6,15}$/, 'Passport: 6–15 characters, capital letters and digits only.'),
    otherwise: (schema) => schema,
  }),
  visaNumber: Yup.string().when('nationality', {
    is: 'FOREIGNER',
    then: (schema) =>
      schema
        .required('Enter the visa number.')
        .matches(/^[A-Z0-9]{6,20}$/, 'Visa: 6–20 characters, capital letters and digits only.'),
    otherwise: (schema) => schema,
  }),
  email: Yup.string().required('Enter the candidate email.').email('Enter a valid email address.'),
  phone: Yup.string()
    .trim()
    .required('Enter the candidate phone number.')
    .test('phone', 'Use a mobile number such as 0812… or +62812….', (value) => !value || CANDIDATE_PHONE.test(normalizePhone(value))),
  intendedJoinDate: Yup.string()
    .required('Choose the intended join date.')
    .test('not-past', 'The intended join date cannot be in the past.', (value) => !value || value >= today()),
});

/** Skema NJ-MATERIALIZE (FSD 0.83 §4.1): kontrak sudah ditandatangani + isian karyawan baru. */
export const materializeSchema = Yup.object({
  joinDate: Yup.string().required('Choose the start date.'),
  jobGradeId: Yup.string().required('Choose a class.'),
  contractFileName: Yup.string().required('Upload the signed contract.'),
  ...newEmployeeSchema,
});
