import { Form, Formik, useField } from 'formik';
import { PasswordField } from '@/components/form/PasswordField';
import { FormField } from '@/components/form/FormField';
import { Input } from '@/components/ui/input';
import { TurnstileField } from '@/features/auth/components/TurnstileField';
import { AuthAltLink, AuthFootLink, AuthHeading, AuthOr, AuthSubmit } from '@/features/auth/components/AuthScreen';
import { useLoginWhatsapp } from '@/features/auth/hooks/useAuth';
import { loginWhatsappSchema } from '@/features/auth/validation';

/** Field nomor HP dengan prefiks +62 — port `.field--phone`. */
function PhoneField() {
  const [field, meta] = useField('phone');
  const error = meta.touched && meta.error ? meta.error : undefined;

  return (
    <FormField name="phone" label="Nomor Handphone" error={error}>
      <div className="flex items-stretch gap-2">
        <span className="inline-flex h-9 items-center rounded-md border border-silver bg-vapor px-3 font-body text-xs font-bold text-fg-2">
          +62
        </span>
        <Input
          id="phone"
          type="tel"
          inputMode="numeric"
          placeholder="81234567890"
          aria-invalid={Boolean(error)}
          {...field}
        />
      </div>
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
