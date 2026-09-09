import { Form, Formik, useFormikContext } from 'formik';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { PasswordField } from '@/components/form/PasswordField';
import { AuthHeading, AuthSubmit } from '@/features/auth/components/AuthScreen';
import { useResetPassword } from '@/features/auth/hooks/useAuth';
import { passwordStrength, resetPasswordSchema, STRENGTH_LABELS } from '@/features/auth/validation';
import { cn } from '@/lib/utils';

/** Meter kekuatan password — port `.pw-strength`. */
function PasswordStrengthMeter() {
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

/** RP2 — Atur Password Baru. */
export function ResetPasswordPage() {
  const reset = useResetPassword();

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
