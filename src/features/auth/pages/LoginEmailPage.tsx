import { Form, Formik } from 'formik';
import { TextField } from '@/components/form/TextField';
import { PasswordField } from '@/components/form/PasswordField';
import { TurnstileField } from '@/features/auth/components/TurnstileField';
import { AuthAltLink, AuthFootLink, AuthHeading, AuthOr, AuthSubmit } from '@/features/auth/components/AuthScreen';
import { useLoginEmail } from '@/features/auth/hooks/useAuth';
import { loginEmailSchema } from '@/features/auth/validation';

/** L-EMAIL — Login Email (magic link 2FA). */
export function LoginEmailPage() {
  const login = useLoginEmail();

  return (
    <>
      <AuthHeading title="Masuk" lead="Gunakan email terdaftar Anda untuk masuk ke SEVAKA." />

      <Formik
        initialValues={{ email: '', password: '', turnstileToken: '' }}
        validationSchema={loginEmailSchema}
        onSubmit={(values) => login.mutate(values)}
      >
        <Form className="mt-7 flex flex-col gap-3.5">
          <TextField name="email" type="email" label="Email" placeholder="Masukkan email Anda" autoComplete="email" />
          <PasswordField name="password" label="Password" placeholder="Masukkan password" autoComplete="current-password" />
          <TurnstileField />
          <AuthSubmit type="submit" disabled={login.isPending}>
            {login.isPending ? 'Memproses…' : 'Masuk'}
          </AuthSubmit>
        </Form>
      </Formik>

      <AuthOr>atau masuk dengan</AuthOr>
      <div className="flex flex-col gap-3">
        <AuthAltLink to="/auth/login/username">Username</AuthAltLink>
        <AuthAltLink to="/auth/login/whatsapp">WhatsApp</AuthAltLink>
      </div>

      <AuthFootLink to="/auth/forgot-password">Lupa Password?</AuthFootLink>
    </>
  );
}
