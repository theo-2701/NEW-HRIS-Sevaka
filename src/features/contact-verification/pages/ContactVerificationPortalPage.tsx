import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { CircleCheck, Link2Off } from 'lucide-react';
import { SevakaLogo } from '@/components/brand/SevakaLogo';
import { Button } from '@/components/ui/button';
import { contactVerificationService } from '@/features/contact-verification/services/contact-verification.service';

/** Token dibaca dari `#t=` sekali, disimpan di memori, lalu dibuang dari bilah alamat. */
function readToken(): string {
  const match = window.location.hash.match(/t=([^&]+)/);
  if (match) window.history.replaceState(null, '', window.location.pathname + window.location.search);
  return match?.[1] ?? '';
}

const ERRORS: Record<string, { title: string; body: string; retry?: boolean }> = {
  '404': { title: 'This link is invalid or already used', body: 'Ask HR to send you a new link.' },
  '410': { title: 'This link has expired', body: 'Links work for 24 hours. Ask HR to send you a new one.' },
  '409': { title: 'This cannot be verified yet', body: 'Ask HR to check your company email or phone number.' },
  '503': { title: 'Verification is unavailable right now', body: 'Please try again in a moment.', retry: true },
};

/**
 * EPV-PUBLIC — `/contact-verification/:companyCode#t=<token>` tanpa login (FSD-001-EMPLOYEE 0.83 §14.1).
 * Tidak memverifikasi otomatis saat dibuka: pemindai tautan tidak boleh memverifikasi atas nama pemilik.
 */
export function ContactVerificationPortalPage() {
  const { companyCode = '' } = useParams();
  const [token] = useState(readToken);
  const confirm = useMutation({ mutationFn: () => contactVerificationService.confirm(token) });

  useEffect(() => {
    document.title = 'Verify your contact · SEVAKA';
  }, []);

  const code = confirm.error ? (confirm.error.message.match(/^\d{3}/)?.[0] ?? '503') : !token ? '404' : null;
  const error = code ? (ERRORS[code] ?? ERRORS['409']) : null;
  const done = confirm.data;

  return (
    <div className="min-h-screen bg-bg-app px-4 py-8">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <SevakaLogo size="sm" />
          <span className="font-body text-xs font-bold uppercase tracking-[0.08em] text-fg-3">{companyCode} · Verification</span>
        </header>
        <main className="flex flex-col items-center gap-3 rounded-2xl border border-border-1 bg-white px-6 py-10 text-center shadow-card-sm">
          {error ? (
            <>
              <Link2Off className="size-8 text-fg-3" />
              <h1 className="m-0 font-display text-xl font-bold text-fg-1">{error.title}</h1>
              <p className="m-0 max-w-md font-body text-[13px] font-medium leading-[1.5] text-fg-3">{error.body}</p>
              {error.retry && (
                <Button variant="secondary" onClick={() => confirm.mutate()}>
                  Try again
                </Button>
              )}
            </>
          ) : done ? (
            <>
              <CircleCheck className="size-8 text-success-700" />
              <h1 className="m-0 font-display text-xl font-bold text-fg-1">
                {done.kind === 'EMAIL' ? 'Your company email is verified' : 'Your phone number is verified'}
              </h1>
              <p className="m-0 max-w-md font-body text-[13px] font-medium leading-[1.5] text-fg-3">
                You can now sign in to HRIS with {done.value}.
              </p>
            </>
          ) : (
            <>
              <h1 className="m-0 font-display text-xl font-bold text-fg-1">Verify your contact</h1>
              <p className="m-0 max-w-md font-body text-[13px] font-medium leading-[1.5] text-fg-3">
                Press the button to confirm this company email or phone number belongs to you. After that you can use it
                to sign in to HRIS.
              </p>
              <Button onClick={() => confirm.mutate()} disabled={confirm.isPending}>
                {confirm.isPending ? 'Verifying…' : 'Verify now'}
              </Button>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
