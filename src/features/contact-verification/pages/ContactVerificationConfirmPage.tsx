import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useConfirmContact } from '@/features/contact-verification/hooks/useContactVerification';

/**
 * Halaman publik `/contact-verification/:companyCode#t=<token>` (§7.20). Token di
 * fragmen supaya tidak masuk log akses. Sengaja TIDAK memverifikasi otomatis saat
 * dibuka — pemindai tautan tidak boleh memverifikasi atas nama pemilik.
 */
export function ContactVerificationConfirmPage() {
  const { companyCode } = useParams();
  const token = new URLSearchParams(window.location.hash.slice(1)).get('t') ?? '';
  const confirm = useConfirmContact();

  const done = confirm.data;
  const what = done?.kind === 'PHONE' ? 'phone number' : 'company email';

  return (
    <main className="flex min-h-dvh items-center justify-center bg-mist px-4 py-10">
      <section className="flex w-full max-w-[440px] flex-col gap-4 rounded-2xl bg-white p-7 shadow-card">
        <span className="font-body text-xs font-bold uppercase tracking-[0.06em] text-fg-3">{companyCode}</span>
        {done ? (
          <>
            <h1 className="m-0 font-display text-2xl font-bold text-fg-1">Verified</h1>
            <p className="m-0 font-body text-sm font-medium leading-[1.5] text-fg-2" role="status">
              Your {what} is now confirmed as a sign-in identity.
              {done.allVerified ? ' All your contacts are verified — you can close this page.' : ''}
            </p>
          </>
        ) : (
          <>
            <h1 className="m-0 font-display text-2xl font-bold text-fg-1">Confirm your contact</h1>
            <p className="m-0 font-body text-sm font-medium leading-[1.5] text-fg-2">
              Press the button to confirm this company email or phone number belongs to you. The link works once and
              expires after 24 hours.
            </p>
            {!token && (
              <p role="alert" className="m-0 font-body text-[13px] font-medium text-error-800">
                This link is incomplete. Open the full link from your message.
              </p>
            )}
            {confirm.error && (
              <p role="alert" className="m-0 font-body text-[13px] font-medium text-error-800">
                {confirm.error.message}
              </p>
            )}
            <Button disabled={!token || confirm.isPending} onClick={() => confirm.mutate(token)}>
              {confirm.isPending ? 'Verifying…' : 'Verify now'}
            </Button>
          </>
        )}
      </section>
    </main>
  );
}
