import { Form, Formik, useFormikContext } from 'formik';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, CircleX } from 'lucide-react';
import { ApiError } from '@/services/api';
import { LINK_DEAD } from '@/features/auth/services/auth.service';
import { PasswordField } from '@/components/form/PasswordField';
import { AuthHeading, AuthSubmit } from '@/features/auth/components/AuthScreen';
import { useResetPassword } from '@/features/auth/hooks/useAuth';
import { passwordStrength, resetPasswordSchema, STRENGTH_LABELS } from '@/features/auth/validation';
import { cn } from '@/lib/utils';

/** Meter kekuatan password — port `.pw-strength`. */
export function PasswordStrengthMeter() {
  const { values } = useFormikContext<{ password: string }>();
  const score = passwordStrength(values.password);

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-1 gap-1.5">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={cn(
              'h-1.5 flex-1 rounded-pill transition-colors duration-200 ease-standard',
              i <= score
                ? score <= 1
                  ? 'bg-error-500'
                  : score === 2
                    ? 'bg-warning-500'
                    : 'bg-success-500'
                : 'bg-vapor',
            )}
          />
        ))}
      </div>
      <span className="font-body text-xs font-semibold text-fg-3">{STRENGTH_LABELS[score]}</span>
    </div>
  );
}

/**
 * RP2 — Atur Password Baru. FSD-AUTH 0.18 §3.3: param `aid`/`token` hilang (saat dibuka) atau `401`
 * (sesudah Simpan) ⇒ form diganti kartu "Link Tidak Valid"; galat lain ⇒ isi kedua field dipertahankan.
 */
export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token');
  const reset = useResetPassword(token ?? '');
  const dead = !params.get('aid') || !token || (reset.error instanceof ApiError && reset.error.status === 401);

  if (dead) {
    return (
      <div className="flex flex-col items-center gap-6 py-4">
        <span className="flex size-16 items-center justify-center rounded-full bg-error-100 text-error-700">
          <CircleX className="size-8" />
        </span>
        <AuthHeading size="sm" center title="Link Tidak Valid" lead={LINK_DEAD} />
        <AuthSubmit type="button" onClick={() => navigate('/auth/forgot-password')}>
          Minta Link Baru
        </AuthSubmit>
      </div>
    );
  }

  return (
    <>
      <AuthHeading
        size="sm"
        title="Atur Password Baru"
        lead="Password minimal 8 karakter dengan huruf besar, huruf kecil, angka, dan simbol."
      />

      <Formik
        initialValues={{ password: '', passwordConfirmation: '' }}
        validationSchema={resetPasswordSchema}
        onSubmit={(values) => reset.mutate(values)}
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
          <AuthSubmit type="submit" disabled={reset.isPending}>
            {reset.isPending ? 'Menyimpan…' : 'Simpan'}
          </AuthSubmit>
        </Form>
      </Formik>
    </>
  );
}

/** RP-DONE — sukses; seluruh sesi lama dicabut. */
export function ResetPasswordDonePage() {
  const navigate = useNavigate();

  return (
    <>
      <div className="mb-6 flex justify-center">
        <span className="flex size-20 items-center justify-center rounded-full bg-success-100 text-success-700">
          <Check className="size-9" strokeWidth={3} />
        </span>
      </div>

      <AuthHeading
        size="sm"
        center
        title="Password berhasil diubah"
        lead="Semua sesi Anda telah keluar. Silakan masuk kembali dengan password baru."
      />

      <div className="mt-7">
        <AuthSubmit type="button" onClick={() => navigate('/auth/login')}>
          Ke Halaman Masuk
        </AuthSubmit>
      </div>
    </>
  );
}
