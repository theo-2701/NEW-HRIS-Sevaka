import { useState } from 'react';
import { Form, Formik } from 'formik';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import { PasswordField } from '@/components/form/PasswordField';
import { AuthHeading, AuthSubmit } from '@/features/auth/components/AuthScreen';
import { PasswordStrengthMeter } from '@/features/auth/pages/ResetPasswordPage';
import { authService } from '@/features/auth/services/auth.service';
import { resetPasswordSchema } from '@/features/auth/validation';
import { ApiError } from '@/services/api';

/**
 * Aktivasi Akun (FSD-001-AUTH-0.14 §5 · UIC-001-AUTH-0.19 §5.1) — halaman publik dari tautan email
 * undangan `?aid=<otp_attempt_id>&token=<token>`, tanpa sesi dan tanpa baris menu.
 *
 * Tiga kelas galat dibedakan: `401` → AA-ERR (tautan tak berlaku, minta undangan baru); `422` → pesan
 * di field; `502`/`503`/`429` → pesan di tempat, tombol tetap aktif karena tautan MASIH bisa dipakai.
 */
export function ActivateAccountPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const aid = params.get('aid') ?? '';
  const token = params.get('token') ?? '';
  const [dead, setDead] = useState(!aid || !token);
  const [notice, setNotice] = useState<string | null>(null);

  const activate = useMutation({
    mutationFn: (values: { password: string; passwordConfirmation: string }) =>
      authService.activate({ aid, token, ...values }),
    onSuccess: () => navigate('/auth/activate/done'),
  });

  if (dead) {
    return (
      <>
        <div className="mb-6 flex justify-center">
          <span className="flex size-20 items-center justify-center rounded-full bg-error-100 text-error-700">
            <X className="size-9" strokeWidth={3} />
          </span>
        </div>
        <AuthHeading
          size="sm"
          center
          title="Tautan tidak dapat dipakai"
          lead="Tautan aktivasi ini sudah kedaluwarsa atau sudah pernah dipakai. Hubungi admin HR untuk meminta tautan aktivasi baru."
        />
        <div className="mt-7">
          <AuthSubmit type="button" onClick={() => navigate('/auth/login')}>
            Kembali ke Login
          </AuthSubmit>
        </div>
      </>
    );
  }

  return (
    <>
      <AuthHeading
        size="sm"
        title="Aktivasi Akun"
        lead="Atur password pertama Anda. Minimal 8 karakter dengan huruf besar, huruf kecil, angka, dan simbol."
      />

      <Formik
        initialValues={{ password: '', passwordConfirmation: '' }}
        validationSchema={resetPasswordSchema}
        onSubmit={(values, helpers) => {
          setNotice(null);
          activate.mutate(values, {
            onError: (error) => {
              const status = error instanceof ApiError ? error.status : 0;
              if (status === 401) return setDead(true);
              if (status === 422) {
                helpers.setFieldError('passwordConfirmation', 'Masukan Anda belum benar — periksa kembali password.');
                return;
              }
              if (status === 429) return setNotice('Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.');
              setNotice('Ada gangguan sistem — silakan coba lagi. Tautan Anda masih bisa dipakai.');
            },
          });
        }}
      >
        <Form className="mt-7 flex flex-col gap-3.5">
          <PasswordField name="password" label="Password Baru" placeholder="Masukkan password baru" autoComplete="new-password" />
          <PasswordStrengthMeter />
          <PasswordField
            name="passwordConfirmation"
            label="Konfirmasi Password"
            placeholder="Ulangi password baru"
            autoComplete="new-password"
          />
          {notice && (
            <p className="m-0 rounded-md border border-warning-200 bg-warning-50 px-3.5 py-2.5 font-body text-xs font-medium text-warning-800">
              {notice}
            </p>
          )}
          <AuthSubmit type="submit" disabled={activate.isPending}>
            {activate.isPending ? 'Mengaktifkan…' : 'Aktifkan Akun'}
          </AuthSubmit>
        </Form>
      </Formik>
    </>
  );
}

/** AA-DONE — akun aktif. */
export function ActivateAccountDonePage() {
  const navigate = useNavigate();
  return (
    <>
      <div className="mb-6 flex justify-center">
        <span className="flex size-20 items-center justify-center rounded-full bg-success-100 text-success-700">
          <Check className="size-9" strokeWidth={3} />
        </span>
      </div>
      <AuthHeading size="sm" center title="Akun sudah aktif" lead="Akun Anda sudah aktif dan siap digunakan." />
      <div className="mt-7">
        <AuthSubmit type="button" onClick={() => navigate('/auth/login')}>
          Login Sekarang
        </AuthSubmit>
      </div>
    </>
  );
}
