import { useEffect, useRef, useState } from 'react';
import { LOGO_TEXT, SevakaMark } from '@/components/brand/SevakaLogo';
import {
  markSplashSeen,
  SPLASH_HOLD_MS,
  SPLASH_LEAVE_MS,
  SPLASH_TAGLINE,
} from '@/features/auth/splash';
import { cn } from '@/lib/utils';

/**
 * Splash screen layar masuk — port `.intro` (`_prototype/auth.html` +
 * `css/auth.css`): kartu merek muncul di atas gradien auth, huruf wordmark
 * masuk satu per satu, lalu tagline. Keluar otomatis setelah ~2,1 detik atau
 * saat pengguna mengklik, dan hanya diputar sekali per sesi.
 */
export function AuthSplash({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const doneRef = useRef(false);

  useEffect(() => {
    markSplashSeen();

    const leave = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      setLeaving(true);
      window.setTimeout(onDone, SPLASH_LEAVE_MS);
    };

    const hold = window.setTimeout(leave, SPLASH_HOLD_MS);
    // Klik di mana saja melewati splash.
    window.addEventListener('pointerdown', leave);

    return () => {
      window.clearTimeout(hold);
      window.removeEventListener('pointerdown', leave);
    };
  }, [onDone]);

  return (
    <div
      data-intro
      aria-hidden
      className={cn(
        'fixed inset-0 z-[60] grid cursor-pointer place-items-center',
        'bg-[linear-gradient(140deg,var(--color-secondary-600)_0%,var(--color-secondary-500)_42%,var(--color-primary-500)_100%)]',
        leaving && 'animate-intro-bg-out',
      )}
    >
      <div className={cn('flex -translate-y-1 flex-col items-center gap-[22px]', leaving && 'animate-intro-rise-out')}>
        <span className="grid size-[104px] animate-intro-mark place-items-center rounded-[24px] bg-white opacity-0 shadow-[0_20px_50px_-12px_rgba(0,0,0,.35)]">
          <SevakaMark className="h-16" />
        </span>

        <span className="flex font-display text-[34px] font-bold leading-none tracking-[0.22em] text-white">
          {LOGO_TEXT.split('').map((ch, i) => (
            <span
              key={`${ch}-${i}`}
              className="animate-intro-letter opacity-0 [transform:translateY(10px)]"
              style={{ animationDelay: `${200 + i * 70}ms` }}
            >
              {ch}
            </span>
          ))}
        </span>

        <span className="animate-intro-fade font-body text-sm font-medium leading-none tracking-[0.04em] text-white/85 opacity-0">
          {SPLASH_TAGLINE}
        </span>
      </div>
    </div>
  );
}
