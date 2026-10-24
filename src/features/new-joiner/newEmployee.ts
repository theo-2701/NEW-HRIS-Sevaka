import * as Yup from 'yup';
import { assertGrantable } from '@/features/role-grant/services/role-grant.service';

/**
 * Isian akun & data kerja karyawan baru — sama di NJ-MATERIALIZE (FSD-001-EMPLOYEE 0.83 §4.1) dan
 * ATS-MATERIALIZE "Create Employee" (§4A.1), TSD 0.192 §7.4.4 / §7.4.12.
 */
export interface NewEmployeeFields {
  /** Wajib, ≤ 50, bebas format; kembar hanya peringatan. */
  nik: string;
  /** Wajib sejak 0.62: `a-z0-9._`, diawali huruf, 4–100; bentrok 409. */
  username: string;
  /** Wajib sejak 0.62; HRIS tidak membuat kotak surat. */
  companyEmail: string;
  /** Kosong = Employee; hanya peran dalam Role Grant Rules pemanggil. */
  roleCode: string;
  /** Opsional — Employment Type dari master Work Status. */
  workStatusId: string;
  /** Opsional; rekening dan nama pemilik wajib berbank. */
  bankCode: string;
  accountNumber: string;
  accountHolderName: string;
}

export const USERNAME = /^[a-z][a-z0-9._]{3,99}$/;

/** Usulan username dari email pribadi: bagian lokal, huruf kecil, hanya `a-z0-9._`. */
export function suggestUsername(email: string): string {
  const local = email.split('@')[0].toLowerCase().replace(/[^a-z0-9._]/g, '');
  return /^[a-z]/.test(local) ? local : `u${local}`;
}

export const emptyNewEmployee = (patch: Partial<NewEmployeeFields> = {}): NewEmployeeFields => ({
  nik: '',
  username: '',
  companyEmail: '',
  roleCode: 'ROLE_EMPLOYEE',
  workStatusId: '',
  bankCode: '',
  accountNumber: '',
  accountHolderName: '',
  ...patch,
});

const needsBank = (message: string) =>
  Yup.string()
    .trim()
    .test('needs-bank', message, function (value) {
      return !value || Boolean((this.parent as NewEmployeeFields).bankCode);
    });

export const newEmployeeSchema = {
  nik: Yup.string().trim().required('Enter the NIK.').max(50, 'At most 50 characters.'),
  username: Yup.string()
    .trim()
    .required('Enter the username.')
    .matches(USERNAME, 'Start with a letter; lower-case letters, digits, dots and underscores, 4–100 characters.'),
  companyEmail: Yup.string().trim().required('Enter the company email.').email('Enter a valid email address.'),
  roleCode: Yup.string(),
  workStatusId: Yup.string(),
  bankCode: Yup.string(),
  accountNumber: needsBank('Choose the bank first.').matches(/^\d{6,20}$/, { message: '6–20 digits.', excludeEmptyString: true }),
  accountHolderName: needsBank('Choose the bank first.').max(100, 'At most 100 characters.'),
};

/** Mode dummy: username yang sudah dipakai akun lain (bentrok = 409). */
const takenUsernames = new Set(['tony.stark', 'rina.hartono', 'sari.kartika']);

/** Penjaga server bersama (dipanggil sebelum identitas dibuat; gagal = nol karyawan lahir). */
export function assertNewEmployee(input: NewEmployeeFields) {
  const nik = input.nik.trim();
  if (!nik || nik.length > 50) throw new Error('422 — nik is required, at most 50 characters.');
  if (!USERNAME.test(input.username.trim())) throw new Error('422 — username: start with a letter; a-z, 0-9, dots and underscores, 4–100 characters.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.companyEmail.trim())) throw new Error('422 — company_email is required.');
  if ((input.accountNumber || input.accountHolderName) && !input.bankCode) {
    throw new Error('422 — Choose the bank for the account number and holder name.');
  }
  assertGrantable(input.roleCode || 'ROLE_EMPLOYEE');
  if (takenUsernames.has(input.username.trim())) {
    throw new Error(`409 — The username ${input.username.trim()} is already taken. Choose another one.`);
  }
}

/** Dipanggil sesudah karyawan lahir. */
export function claimUsername(username: string) {
  takenUsernames.add(username.trim());
}
