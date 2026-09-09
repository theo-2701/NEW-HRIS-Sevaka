import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AuthHeading } from '@/features/auth/components/AuthScreen';
import { useVerifyMagicLink } from '@/features/auth/hooks/useAuth';

/** AV — Auto-verify magic link. Token dibaca dari query `?token=`. */
export function VerifyMagicLinkPage() {
  const [params] = useSearchParams();
  const verify = useVerifyMagicLink();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    verify.mutate(params.get('token') ?? 'mock-magic-token');
  }, [params, verify]);

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
