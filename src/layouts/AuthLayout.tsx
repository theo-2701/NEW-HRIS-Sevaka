import { useCallback, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster } from '@/components/Toaster';
import { SevakaLogo } from '@/components/brand/SevakaLogo';
import { AuthSplash } from '@/features/auth/components/AuthSplash';
import { hasSeenSplash } from '@/features/auth/splash';
import { cn } from '@/lib/utils';

/**
 * Layout auth — port `auth.html` + `css/auth.css`:
 * splash merek → gradien 140° (Ocean → Sky), kartu 448px radius 16px,
 * footer di bawah. Splash hanya diputar sekali per sesi; setelah selesai,
 * kartu & footer naik masuk (`card-reveal`).
 */
export function AuthLayout() {
  const [splashDone, setSplashDone] = useState(hasSeenSplash);
  const handleSplashDone = useCallback(() => setSplashDone(true), []);

  /* Selama splash berjalan kartu disembunyikan, lalu dianimasikan masuk. */
  const revealClass = splashDone ? 'animate-card-reveal' : 'opacity-0';

  return (
    /* `bg-fixed` meniru `background-attachment: fixed` di `css/auth.css`,
       supaya gradien tetap menutup layar saat kartu lebih tinggi dari viewport. */
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 bg-[linear-gradient(140deg,var(--color-secondary-600)_0%,var(--color-secondary-500)_42%,var(--color-primary-500)_100%)] bg-fixed px-6 pb-6 pt-10">
      {!splashDone && <AuthSplash onDone={handleSplashDone} />}

      <div
        className={cn(
          'w-[448px] max-w-full rounded-2xl bg-white px-10 pb-8 pt-10 shadow-[0_24px_60px_-20px_rgba(2,70,110,.45),0_2px_8px_rgba(16,24,40,.08)]',
          revealClass,
        )}
      >
        <div className="mb-12 flex items-center">
          <SevakaLogo size="lg" />
        </div>

        <Outlet />
      </div>

      <footer className={cn('flex flex-col items-center gap-2 text-center', revealClass)}>
        <div className="flex items-center gap-2 font-body text-xs font-medium text-white/80">
          <a href="#" className="hover:underline">
            Kebijakan privasi
          </a>
          <span aria-hidden>•</span>
          <a href="#" className="hover:underline">
            Ketentuan penggunaan
          </a>
          <span aria-hidden>•</span>
          <a href="#" className="hover:underline">
            Tentang Sevaka
          </a>
        </div>
        <p className="m-0 font-body text-[11px] font-medium text-white/60">
          © 2025 PT Danamas Insan Kreasi Andalan
        </p>
      </footer>

      <Toaster />
    </div>
  );
}
