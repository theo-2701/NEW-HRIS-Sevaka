import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CircleX } from 'lucide-react';
import { AuthHeading, AuthSubmit } from '@/features/auth/components/AuthScreen';
import { useVerifyMagicLink } from '@/features/auth/hooks/useAuth';
import { LINK_DEAD } from '@/features/auth/services/auth.service';
import { ApiError } from '@/services/api';
import { toast } from '@/store/ui.store';

/**
 * AV — Auto-verify magic link `?aid=…&token=…` (FSD-AUTH 0.18 §2.4):
 *  • param hilang → nol panggilan, toast lalu kembali ke L-EMAIL;
 *  • server gagal → spinner diganti kartu "Verifikasi Gagal" (401 seragam; 502/503 = gangguan sistem).
 * `verify-otp` dipanggil sekali per pembukaan halaman.
 */
export function VerifyMagicLinkPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const verify = useVerifyMagicLink();
  const fired = useRef(false);
  const aid = params.get('aid');
  const token = params.get('token');

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    if (!aid || !token) {
      toast(LINK_DEAD, 'danger');
      navigate('/auth/login', { replace: true });
      return;
    }
    verify.mutate(token);
  }, [aid, token, verify, navigate]);

  if (verify.isError) {
    const outage = verify.error instanceof ApiError && verify.error.status >= 502;
    return (
      <div className="flex flex-col items-center gap-6 py-4">
        <span className="flex size-16 items-center justify-center rounded-full bg-error-100 text-error-700">
          <CircleX className="size-8" />
        </span>
        <AuthHeading
          size="sm"
          center
          title="Verifikasi Gagal"
          lead={outage ? 'Ada gangguan sistem — silakan coba lagi.' : LINK_DEAD}
        />
        <AuthSubmit type="button" onClick={() => navigate('/auth/login')}>
          Kembali ke Login
        </AuthSubmit>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <span className="size-10 animate-spin rounded-full border-[3px] border-primary-200 border-t-secondary-500" />
      <AuthHeading
        size="sm"
        center
        title="Memverifikasi tautan masuk"
        lead="Mohon tunggu, kami sedang memverifikasi identitas Anda…"
      />
    </div>
  );
}
