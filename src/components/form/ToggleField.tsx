import type { ReactNode } from 'react';
import { useField } from 'formik';
import { cn } from '@/lib/utils';

interface ToggleFieldProps {
  name: string;
  label: ReactNode;
  hint?: ReactNode;
  disabled?: boolean;
  className?: string;
}

/**
 * Sakelar biner terikat Formik — port `.ep-toggle` + `.ep-switch`.
 * Dipakai untuk pilihan ya/tidak yang mengubah field lain (mis. domisili
 * mengikuti alamat KTP), bukan sebagai pengganti checkbox dalam daftar.
 */
export function ToggleField({ name, label, hint, disabled, className }: ToggleFieldProps) {
  const [field, , helpers] = useField<boolean>(name);
  const on = Boolean(field.value);

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 rounded-md border border-border-1 bg-cloud px-3.5 py-3',
        className,
      )}
    >
      <span className="flex flex-col gap-1">
        <span className="font-body text-[13px] font-bold leading-tight text-fg-1">{label}</span>
        {hint && <span className="font-body text-[11.5px] font-medium leading-normal text-fg-3">{hint}</span>}
      </span>

      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={typeof label === 'string' ? label : name}
        disabled={disabled}
        onClick={() => helpers.setValue(!on)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-pill transition-colors duration-200 ease-standard',
          on ? 'bg-secondary-500' : 'bg-border-2',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 size-5 rounded-full bg-white shadow-card-sm transition-[left] duration-200 ease-standard',
            on ? 'left-[22px]' : 'left-0.5',
          )}
        />
      </button>
    </div>
  );
}
