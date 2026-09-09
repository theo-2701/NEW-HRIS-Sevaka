import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Input SEVAKA — standar field design system (`form-standard.css`):
 * tinggi **36px**, isi Cloud, **border 1px Silver** (bukan inset-rim), radius 8px,
 * padding-x 12px, teks & placeholder 12px/500. Fokus: border Ocean + ring 4px.
 */
function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-9 w-full rounded-md border border-silver bg-cloud px-3 font-body text-xs font-medium leading-[1.4] text-fg-2 outline-none transition-[border-color,box-shadow] duration-200 ease-standard',
        'placeholder:text-xs placeholder:font-medium placeholder:text-fg-4',
        'focus:border-secondary-500 focus:shadow-[0_0_0_4px_rgba(2,132,199,.16)]',
        'disabled:cursor-not-allowed disabled:bg-vapor disabled:text-fg-4',
        'aria-invalid:border-error-500 aria-invalid:focus:shadow-[0_0_0_4px_rgba(239,68,68,.16)]',
        className,
      )}
      {...props}
    />
  );
}

/** Textarea dengan kotak yang sama; padding vertikal 9px sesuai standar. */
function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'min-h-9 w-full rounded-md border border-silver bg-cloud px-3 py-[9px] font-body text-xs font-medium leading-[1.4] text-fg-2 outline-none transition-[border-color,box-shadow] duration-200 ease-standard',
        'placeholder:text-xs placeholder:font-medium placeholder:text-fg-4',
        'focus:border-secondary-500 focus:shadow-[0_0_0_4px_rgba(2,132,199,.16)]',
        'disabled:cursor-not-allowed disabled:bg-vapor disabled:text-fg-4',
        'aria-invalid:border-error-500',
        className,
      )}
      {...props}
    />
  );
}

export { Input, Textarea };
