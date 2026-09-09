import { Form, Formik } from 'formik';
import { TextField } from '@/components/form/TextField';
import { PasswordField } from '@/components/form/PasswordField';
import { TurnstileField } from '@/features/auth/components/TurnstileField';
import { AuthAltLink, AuthFootLink, AuthHeading, AuthOr, AuthSubmit } from '@/features/auth/components/AuthScreen';
import { useLoginUsername } from '@/features/auth/hooks/useAuth';
import { loginUsernameSchema } from '@/features/auth/validation';

/** L-USER — Login Username (magic link 2FA, jalur cadangan). */
export function LoginUsernamePage() {
  const login = useLoginUsername();

  return (
    <>
      <AuthHeading title="Masuk dengan Username" lead="Tautan masuk akan dikirim ke email terdaftar akun Anda." />

      <Formik
        initialValues={{ username: '', password: '', turnstileToken: '' }}
        validationSchema={loginUsernameSchema}
        onSubmit={(values) => login.mutate(values)}
      >
        <Form className="mt-7 flex flex-col gap-3.5">
          <TextField
            name="username"
            label="Username"
            placeholder="Masukkan username"
            autoComplete="username"
            hint="Huruf kecil, diawali huruf."
          />
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
        <AuthAltLink to="/auth/login/whatsapp">WhatsApp</AuthAltLink>
      </div>

      <AuthFootLink to="/auth/forgot-password">Lupa Password?</AuthFootLink>
    </>
  );
}
