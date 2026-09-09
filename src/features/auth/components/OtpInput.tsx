import { useRef } from 'react';
import { cn } from '@/lib/utils';

const LENGTH = 6;

/** Enam kotak OTP — port `.otp-row` / `.otp-box`. Paste 6 digit sekaligus didukung. */
export function OtpInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.padEnd(LENGTH, ' ').slice(0, LENGTH).split('');

  const setDigit = (index: number, digit: string) => {
    onChange(digits.map((d, i) => (i === index ? digit : d)).join(''));
  };

  return (
    <div className="flex gap-2.5">
      {Array.from({ length: LENGTH }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={digits[i]?.trim() ?? ''}
          inputMode="numeric"
          maxLength={1}
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => {
            const digit = e.target.value.replace(/\D/g, '').slice(-1);
            setDigit(i, digit || ' ');
            if (digit && i < LENGTH - 1) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !digits[i]?.trim() && i > 0) refs.current[i - 1]?.focus();
          }}
          onPaste={(e) => {
            e.preventDefault();
            const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH);
            if (pasted) {
              onChange(pasted);
              refs.current[Math.min(pasted.length, LENGTH - 1)]?.focus();
            }
          }}
          className={cn(
            'h-16 min-w-0 flex-1 rounded-[10px] border-none bg-mist text-center font-display text-[26px] font-bold text-obsidian shadow-inset-rim outline-none transition-[background,box-shadow] duration-200 ease-standard',
            'focus:bg-white focus:shadow-[inset_0_0_0_1.5px_var(--color-secondary-500),0_0_0_4px_rgba(2,132,199,.16)]',
            digits[i]?.trim() && 'bg-white shadow-[inset_0_0_0_1.5px_var(--color-secondary-200)]',
          )}
        />
      ))}
    </div>
  );
}
