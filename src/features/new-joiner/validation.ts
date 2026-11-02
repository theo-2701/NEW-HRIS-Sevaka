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

export const candidateSchema = Yup.object({
  positionId: Yup.string().required('Posisi wajib dipilih.'),
  requisitionId: Yup.string(),
  name: Yup.string()
    .trim()
    .required('Nama kandidat wajib diisi.')
    .max(150, 'Maksimal 150 karakter.')
    .matches(CANDIDATE_NAME, 'Hanya huruf, spasi, dan tanda \'.,- ; wajib diawali huruf.'),
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
  joinDate: Yup.string().required('Join date is required.'),
  jobGradeId: Yup.string().required('Grade is required.'),
  contractFileName: Yup.string().required('Upload the signed contract.'),
  nik: Yup.string().trim().required('NIK is required.'),
  username: Yup.string()
    .trim()
    .required('Username is required.')
    .matches(/^[a-z0-9.]+$/, 'Lowercase letters, digits, and dots only.'),
  companyEmail: Yup.string().trim().required('Company email is required.').email('Enter a valid email address.'),
  workArrangement: Yup.string().oneOf(['WFO', 'WFH']).required('Work arrangement is required.'),
});

/** Add Candidate (TSD §7.4.1): email ATAU kandidat ATS, keduanya tidak bersamaan. */
export const inviteSchema = Yup.object({
  requisitionId: Yup.string().required('Requisition is required.'),
  positionId: Yup.string().required('Position is required.'),
  email: Yup.string().when('source', {
    is: 'INVITE',
    then: (schema) => schema.trim().required('Candidate email is required.').email('Enter a valid email address.'),
    otherwise: (schema) => schema,
  }),
  atsBridgeId: Yup.string().when('source', {
    is: 'ATS',
    then: (schema) => schema.required('Pick an ATS candidate.'),
    otherwise: (schema) => schema,
  }),
});

/** Portal kandidat (§7.4.11) — isian diri kandidat sendiri; teks layar Inggris. */
export const portalSchema = Yup.object({
  name: Yup.string()
    .trim()
    .required('Full name is required.')
    .max(150, 'At most 150 characters.')
    .matches(CANDIDATE_NAME, "Letters, spaces, and . , ' - only; start with a letter."),
  nationality: Yup.string().oneOf(['CITIZEN', 'FOREIGNER']).required(),
  idCardNumber: Yup.string().when('nationality', {
    is: 'CITIZEN',
    then: (schema) => schema.required('ID card number is required.').matches(/^\d{16}$/, 'Exactly 16 digits.'),
    otherwise: (schema) => schema,
  }),
  passportNumber: Yup.string().when('nationality', {
    is: 'FOREIGNER',
    then: (schema) => schema.required('Passport number is required.').matches(/^[A-Z0-9]{6,15}$/, '6–15 capital letters or digits.'),
    otherwise: (schema) => schema,
  }),
  phone: Yup.string()
    .trim()
    .required('Phone number is required.')
    .test('phone', 'Start with 08 or +628.', (value) => !value || CANDIDATE_PHONE.test(normalizePhone(value))),
  intendedJoinDate: Yup.string()
    .required('Available start date is required.')
    .test('not-past', 'Cannot be in the past.', (value) => !value || value >= today()),
  cvFileName: Yup.string().required('Upload your CV (PDF).'),
  idPhotoFileName: Yup.string().required('Upload a photo of your ID (JPEG or PNG).'),
});
