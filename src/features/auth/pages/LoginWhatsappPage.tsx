import { Form, Formik, useField } from 'formik';
import { PasswordField } from '@/components/form/PasswordField';
import { FormField } from '@/components/form/FormField';
import { Input } from '@/components/ui/input';
import { TurnstileField } from '@/features/auth/components/TurnstileField';
import { AuthAltLink, AuthFootLink, AuthHeading, AuthOr, AuthSubmit } from '@/features/auth/components/AuthScreen';
import { useLoginWhatsapp } from '@/features/auth/hooks/useAuth';
import { loginWhatsappSchema } from '@/features/auth/validation';

/**
 * Satu field nomor bebas (FSD-AUTH 0.12 §2.3, `KA-17`): `081…`, `62…`, maupun `+62…` diterima dan
 * dikirim apa adanya — server yang menormalkan ke `+62…`. Prefiks statis "+62" dicabut.
 */
function PhoneField() {
  const [field, meta] = useField('phone');
  const error = meta.touched && meta.error ? meta.error : undefined;

  return (
    <FormField name="phone" label="Nomor Handphone" error={error}>
      <Input
        id="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="081234567890"
        aria-invalid={Boolean(error)}
        {...field}
      />
    </FormField>
  );
}

/** L-WA — Login WhatsApp (OTP 6 digit 2FA). */
export function LoginWhatsappPage() {
  const login = useLoginWhatsapp();

  return (
    <>
      <AuthHeading title="Masuk dengan WhatsApp" lead="Kode verifikasi 6 digit akan dikirim ke WhatsApp Anda." />

      <Formik
        initialValues={{ phone: '', password: '', turnstileToken: '' }}
        validationSchema={loginWhatsappSchema}
        onSubmit={(values) => login.mutate(values)}
      >
        <Form className="mt-7 flex flex-col gap-3.5">
          <PhoneField />
          <PasswordField name="password" label="Password" placeholder="Masukkan password" autoComplete="current-password" />
          <TurnstileField />
          <AuthSubmit type="submit" disabled={login.isPending}>
            {login.isPending ? 'Memproses…' : 'Masuk'}
          </AuthSubmit>
        </Form>
      </Formik>

      <AuthOr>atau masuk dengan</AuthOr>
      <div className="flex flex-col gap-3">
        <AuthAltLink to="/auth/login">Email</AuthAltLink>
        <AuthAltLink to="/auth/login/username">Username</AuthAltLink>
      </div>

      <AuthFootLink to="/auth/forgot-password">Lupa Password?</AuthFootLink>
    </>
  );
}
