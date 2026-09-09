import { useState } from 'react';
import { useField } from 'formik';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Placeholder widget Cloudflare Turnstile — port `.turnstile` di `auth.html`.
 * Wajib diselesaikan sebelum submit. Saat integrasi nyata, ganti isi
 * `handleVerify` dengan callback token dari script Turnstile dan simpan
 * token itu ke field Formik `turnstileToken`.
 */
export function TurnstileField({ name = 'turnstileToken' }: { name?: string }) {
  const [field, meta, helpers] = useField(name);
  const [pending, setPending] = useState(false);
  const verified = Boolean(field.value);
  const error = meta.touched && meta.error ? meta.error : undefined;

  const handleVerify = () => {
    if (verified || pending) return;
    setPending(true);
    window.setTimeout(() => {
      setPending(false);
      // setTouched TANPA validasi ulang: Formik memvalidasi dari snapshot lama
      // sehingga pesan error sempat muncul lagi padahal token sudah terisi.
      helpers.setTouched(true, false);
      helpers.setValue('turnstile-mock-token');
    }, 900);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="checkbox"
        aria-checked={verified}
        aria-label="Verifikasi anti-bot"
        tabIndex={0}
        onClick={handleVerify}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') handleVerify();
        }}
        className={cn(
          'flex min-h-[60px] items-center gap-3 rounded-md border bg-cloud px-3.5 transition-[border-color,box-shadow] duration-200 ease-standard',
          verified ? 'cursor-default border-secondary-500' : 'cursor-pointer border-silver hover:border-secondary-500',
          error && 'border-error-500',
        )}
      >
        <span
          className={cn(
            'relative flex size-6 flex-none items-center justify-center rounded-sm',
            verified ? 'bg-secondary-500 text-white' : 'bg-white shadow-[inset_0_0_0_1.5px_var(--color-silver)]',
          )}
        >
          {pending && (
            <span className="size-4 animate-spin rounded-full border-2 border-secondary-200 border-t-secondary-500" />
          )}
          {verified && <Check className="size-4" strokeWidth={3} />}
        </span>
        <span className="flex-1 font-body text-[13px] font-medium text-fg-2">
          {verified ? 'Terverifikasi' : 'Verifikasi Anda manusia'}
        </span>
        <span className="flex flex-col items-end">
          <span className="font-body text-[11px] font-bold text-fg-2">Turnstile</span>
          <span className="font-body text-[10px] font-medium text-fg-4">Cloudflare</span>
        </span>
      </div>
      {error && <span className="font-body text-xs font-medium text-error-800">{error}</span>}
    </div>
  );
}
