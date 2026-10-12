import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OtpInput } from '@/features/auth/components/OtpInput';
import { AuthFootLink, AuthHeading, AuthSubmit } from '@/features/auth/components/AuthScreen';
import { useCountdown, useVerifyOtp } from '@/features/auth/hooks/useAuth';
import { useAuthFlowStore } from '@/features/auth/store/authFlow.store';
import { formatCountdown } from '@/lib/format';
import { toast } from '@/store/ui.store';

/**
 * OTP — input 6 digit (WhatsApp 2FA, TTL 5 menit). FSD-AUTH 0.18 §2.5:
 *  • Tidak ada endpoint kirim-ulang; "Minta kode baru" = login ulang. Tombolnya DISEMBUNYIKAN
 *    (diganti teks hitung mundur) sampai 00:00, lalu mengalihkan ke L-WA tanpa membawa password.
 *  • Kode salah: enam kotak tidak dikosongkan; satu pesan seragam tanpa "sisa N percobaan".
 */
export function OtpPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const target = useAuthFlowStore((s) => s.maskedTarget) ?? '0812****7890';
  const expiresIn = useAuthFlowStore((s) => s.expiresInSeconds) || 300;

  const verify = useVerifyOtp();
  const { remaining } = useCountdown(expiresIn);
  const complete = code.replace(/\s/g, '').length === 6;

  const requestNew = () => {
    toast('Silakan login ulang untuk menerima kode baru', 'info');
    navigate('/auth/login/whatsapp');
  };

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
            Minta kode baru dalam <span className="font-bold text-fg-2">{formatCountdown(remaining)}</span>
          </span>
        ) : (
          <button
            type="button"
            onClick={requestNew}
            className="font-body text-[13px] font-bold text-secondary-600 hover:underline"
          >
            Minta kode baru
          </button>
        )}
      </div>

      <AuthFootLink to="/auth/login/whatsapp">← Kembali ke halaman masuk</AuthFootLink>
    </>
  );
}
