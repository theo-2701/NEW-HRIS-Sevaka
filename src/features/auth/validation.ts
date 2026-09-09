import * as Yup from 'yup';

/**
 * Skema validasi Yup untuk modul auth.
 * Aturan password mengikuti layar RP2: minimal 8 karakter dengan huruf besar,
 * huruf kecil, angka, dan simbol.
 */
export const passwordRule = Yup.string()
  .required('Password wajib diisi.')
  .min(8, 'Password minimal 8 karakter.')
  .matches(/[A-Z]/, 'Password harus memuat huruf besar.')
  .matches(/[a-z]/, 'Password harus memuat huruf kecil.')
  .matches(/\d/, 'Password harus memuat angka.')
  .matches(/[^A-Za-z0-9]/, 'Password harus memuat simbol.');

export const loginEmailSchema = Yup.object({
  email: Yup.string().required('Email wajib diisi.').email('Format email tidak valid.'),
  password: Yup.string().required('Password wajib diisi.'),
  turnstileToken: Yup.string().required('Selesaikan verifikasi anti-bot terlebih dahulu.'),
});

export const loginUsernameSchema = Yup.object({
  username: Yup.string()
    .required('Username wajib diisi.')
    .matches(/^[a-z][a-z0-9._-]*$/, 'Huruf kecil, diawali huruf.'),
  password: Yup.string().required('Password wajib diisi.'),
  turnstileToken: Yup.string().required('Selesaikan verifikasi anti-bot terlebih dahulu.'),
});

export const loginWhatsappSchema = Yup.object({
  phone: Yup.string()
    .required('Nomor handphone wajib diisi.')
    .matches(/^8\d{7,13}$/, 'Nomor diawali 8, tanpa +62 atau 0.'),
  password: Yup.string().required('Password wajib diisi.'),
  turnstileToken: Yup.string().required('Selesaikan verifikasi anti-bot terlebih dahulu.'),
});

export const forgotPasswordSchema = Yup.object({
  email: Yup.string().required('Email wajib diisi.').email('Format email tidak valid.'),
});

export const resetPasswordSchema = Yup.object({
  password: passwordRule,
  passwordConfirmation: Yup.string()
    .required('Konfirmasi password wajib diisi.')
    .oneOf([Yup.ref('password')], 'Password tidak cocok.'),
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
