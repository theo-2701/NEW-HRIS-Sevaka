import { Form, Formik } from 'formik';
import { useNavigate } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { TextField } from '@/components/form/TextField';
import { AuthFootLink, AuthHeading, AuthSubmit } from '@/features/auth/components/AuthScreen';
import { useForgotPassword } from '@/features/auth/hooks/useAuth';
import { forgotPasswordSchema } from '@/features/auth/validation';

/** RP1 — Lupa Password (input email). */
export function ForgotPasswordPage() {
  const forgot = useForgotPassword();

  return (
    <>
      <AuthHeading
        size="sm"
        title="Lupa Password"
        lead="Masukkan email terdaftar Anda. Kami akan mengirim tautan untuk mengatur ulang password."
      />

      <Formik
        initialValues={{ email: '' }}
        validationSchema={forgotPasswordSchema}
        onSubmit={(values) => forgot.mutate(values.email)}
      >
        <Form className="mt-7 flex flex-col gap-3.5">
          <TextField name="email" type="email" label="Email" placeholder="Masukkan email Anda" autoComplete="email" />
          <AuthSubmit type="submit" disabled={forgot.isPending}>
            {forgot.isPending ? 'Mengirim…' : 'Kirim Tautan Reset'}
          </AuthSubmit>
        </Form>
      </Formik>

      <AuthFootLink to="/auth/login">← Kembali ke halaman masuk</AuthFootLink>
    </>
  );
}

/**
 * RP-SENT — konfirmasi generik.
 * Pesan sengaja tidak membocorkan apakah email terdaftar.
 */
export function ForgotPasswordSentPage() {
  const navigate = useNavigate();

  return (
    <>
      <div className="mb-6 flex justify-center">
        <span className="flex size-20 items-center justify-center rounded-full bg-primary-100 text-secondary-500">
          <MailCheck className="size-9" />
        </span>
      </div>

      <AuthHeading
        size="sm"
        center
        title="Cek email Anda"
        lead="Bila email terdaftar, tautan reset (berlaku 15 menit) telah dikirim. Semua sesi aktif Anda akan keluar setelah password diubah."
      />

      {/* Simulasi klik tautan reset — hapus setelah backend siap. */}
      <div className="mt-7">
        <AuthSubmit type="button" onClick={() => navigate('/auth/reset-password')}>
          Simulasikan klik tautan
        </AuthSubmit>
      </div>

      <AuthFootLink to="/auth/login">← Kembali ke halaman masuk</AuthFootLink>
    </>
  );
}
