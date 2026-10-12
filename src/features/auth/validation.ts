import * as Yup from 'yup';

/**
 * Kompleksitas password (FSD-AUTH 0.17 §2): dicek di klien pada tiga layar login, RP2, dan AA-1.
 * SATU pesan saja — aturan pertama yang gagal, urutan tetap: min 8 → kecil → kapital → angka → spesial.
 * Formik mengambil galat pertama per field, jadi urutan `.test` di bawah = urutan tampil.
 */
export const passwordRule = (requiredMessage = 'Password wajib diisi') =>
  Yup.string()
    .required(requiredMessage)
    .min(8, 'Minimal 8 karakter')
    .matches(/[a-z]/, 'Harus mengandung huruf kecil')
    .matches(/[A-Z]/, 'Harus mengandung huruf kapital')
    .matches(/\d/, 'Harus mengandung angka')
    .matches(/[^A-Za-z0-9]/, 'Harus mengandung karakter spesial');

export const loginEmailSchema = Yup.object({
  email: Yup.string().required('Email wajib diisi.').email('Format email tidak valid.'),
  password: passwordRule(),
  turnstileToken: Yup.string().required('Selesaikan verifikasi anti-bot terlebih dahulu.'),
});

export const loginUsernameSchema = Yup.object({
  username: Yup.string()
    .required('Username wajib diisi.')
    .matches(/^[a-z][a-z0-9._-]*$/, 'Huruf kecil, diawali huruf.'),
  password: passwordRule(),
  turnstileToken: Yup.string().required('Selesaikan verifikasi anti-bot terlebih dahulu.'),
});

export const loginWhatsappSchema = Yup.object({
  // Klien DILARANG menolak bentuk 08…/62…/+62… (KA-17) — hanya wajib isi; server yang menormalkan.
  phone: Yup.string().trim().required('Nomor handphone wajib diisi.'),
  password: passwordRule(),
  turnstileToken: Yup.string().required('Selesaikan verifikasi anti-bot terlebih dahulu.'),
});

export const forgotPasswordSchema = Yup.object({
  email: Yup.string().required('Email wajib diisi.').email('Format email tidak valid.'),
});

export const resetPasswordSchema = Yup.object({
  password: passwordRule('Password baru wajib diisi'),
  passwordConfirmation: Yup.string()
    .required('Konfirmasi password wajib diisi.')
    .oneOf([Yup.ref('password')], 'Password tidak cocok'),
});

/** Skor kekuatan password 0–4 untuk meter di layar RP2. */
export function passwordStrength(value: string): number {
  if (!value) return 0;
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  return score;
}

export const STRENGTH_LABELS = ['Lemah', 'Lemah', 'Sedang', 'Kuat', 'Sangat kuat'];
