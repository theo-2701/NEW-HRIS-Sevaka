import { useState } from 'react';
import { OtpInput } from '@/features/auth/components/OtpInput';
import { AuthFootLink, AuthHeading, AuthSubmit } from '@/features/auth/components/AuthScreen';
import { useCountdown, useResendOtp, useVerifyOtp } from '@/features/auth/hooks/useAuth';
import { MAX_OTP_REQUESTS, useAuthFlowStore } from '@/features/auth/store/authFlow.store';
import { formatCountdown } from '@/lib/format';

/** OTP — input 6 digit (WhatsApp 2FA, TTL 5 menit, maks. 3 permintaan / 15 menit). */
export function OtpPage() {
  const [code, setCode] = useState('');
  const target = useAuthFlowStore((s) => s.maskedTarget) ?? '0812****7890';
  const expiresIn = useAuthFlowStore((s) => s.expiresInSeconds) || 300;
  const requestCount = useAuthFlowStore((s) => s.otpRequestCount);

  const verify = useVerifyOtp();
  const resend = useResendOtp();
  const { remaining, restart } = useCountdown(expiresIn);

  const complete = code.replace(/\s/g, '').length === 6;
  const canResend = remaining === 0 && requestCount < MAX_OTP_REQUESTS;

  return (
    <>
      <AuthHeading
        size="sm"
        title="Masukkan kode OTP"
        lead={
          <>
            Kami mengirim kode 6 digit ke WhatsApp <b>{target}</b>. Kode berlaku 5 menit.
          </>
        }
      />

      <div className="mt-7 flex flex-col gap-5">
        <OtpInput value={code} onChange={setCode} />
        <AuthSubmit
          type="button"
          disabled={!complete || verify.isPending}
          onClick={() => verify.mutate(code.replace(/\s/g, ''))}
        >
          {verify.isPending ? 'Memverifikasi…' : 'Verifikasi'}
        </AuthSubmit>
      </div>

      <div className="mt-5 text-center">
        {remaining > 0 ? (
          <span className="font-body text-[13px] font-medium text-fg-3">
            Kirim ulang dalam <span className="font-bold text-fg-2">{formatCountdown(remaining)}</span>
          </span>
        ) : (
          <button
            type="button"
            disabled={!canResend || resend.isPending}
            onClick={() =>
              resend.mutate(undefined, {
                onSuccess: (res) => restart(res.expiresInSeconds),
              })
            }
            className="font-body text-[13px] font-bold text-secondary-600 hover:underline disabled:cursor-not-allowed disabled:text-fg-4 disabled:no-underline"
          >
            Kirim ulang OTP
          </button>
        )}
        <p className="mt-1.5 font-body text-[11px] font-medium text-fg-4">
          Maksimal {MAX_OTP_REQUESTS} permintaan per 15 menit.
        </p>
      </div>

      <AuthFootLink to="/auth/login/whatsapp">← Kembali ke halaman masuk</AuthFootLink>
    </>
  );
}
