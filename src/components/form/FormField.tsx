import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  name: string;
  label?: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: string | false;
  children: ReactNode;
  className?: string;
}

/** Id pesan bantu/galat = `${name}-desc`; kontrol input merujuknya lewat `aria-describedby`. */
const describedBy = (name: string) => `${name}-desc`;

/**
 * Pembungkus field standar — `form-standard.css`: label 16/700 Slate,
 * **jarak label → kotak input 4px**, lalu hint/error di bawahnya.
 */
export function FormField({ name, label, required, hint, error, children, className }: FormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <Label htmlFor={name}>
          {label}
          {required && <em>*</em>}
        </Label>
      )}
      {children}
      {/* Galat diumumkan pembaca layar (role=alert) dan ditautkan ke kontrolnya lewat id. */}
      {error ? (
        <span id={describedBy(name)} role="alert" className="font-body text-xs font-medium text-error-800">
          {error}
        </span>
      ) : (
        hint && (
          <span id={describedBy(name)} className="font-body text-xs font-normal text-fg-3">
            {hint}
          </span>
        )
      )}
    </div>
  );
}
