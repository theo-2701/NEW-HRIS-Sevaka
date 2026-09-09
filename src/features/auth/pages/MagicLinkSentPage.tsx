import { useNavigate } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { AuthFootLink, AuthHeading, AuthSubmit } from '@/features/auth/components/AuthScreen';
import { useAuthFlowStore } from '@/features/auth/store/authFlow.store';

/** MLS — Magic-Link Sent (kanal email / username). */
export function MagicLinkSentPage() {
  const navigate = useNavigate();
  const target = useAuthFlowStore((s) => s.maskedTarget) ?? 's***@ptdika.co.id';

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
        lead={
          <>
            Kami mengirim tautan masuk ke <b>{target}</b>. Buka email dan klik tautan untuk melanjutkan. Tautan berlaku
            15 menit.
          </>
        }
      />

      {/* Tombol simulasi ini menggantikan klik tautan pada email — hapus saat
          integrasi backend selesai dan tautan asli sudah bisa dibuka. */}
      <div className="mt-7">
        <AuthSubmit type="button" onClick={() => navigate('/auth/verify')}>
          Simulasikan klik tautan
        </AuthSubmit>
      </div>

      <AuthFootLink to="/auth/login">← Kembali ke halaman masuk</AuthFootLink>
    </>
  );
}
