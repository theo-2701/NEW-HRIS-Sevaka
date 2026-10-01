import type { ReactNode } from 'react';
import { EmployeeSelect } from '@/components/EmployeeSelect';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { EmployeeSource } from '@/lib/employeeSource';
import { cn } from '@/lib/utils';

/** Satu baris isian di dalam modal master data. */
export function Field({
  label,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  hint?: ReactNode;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label>
        {label}
        {required && <span className="ml-1 text-error-600">*</span>}
      </Label>
      {children}
      {hint && <span className="font-body text-xs font-medium text-fg-3">{hint}</span>}
    </div>
  );
}

export function TextRow({
  label,
  hint,
  required,
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: {
  label: string;
  hint?: ReactNode;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Field label={label} hint={hint} required={required} className={className}>
      <Input
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

export interface Option {
  value: string;
  label: string;
}

export function SelectRow({
  label,
  hint,
  required,
  value,
  onChange,
  options,
  placeholder = 'Pilih salah satu',
  allowEmpty,
  emptyLabel = 'Tidak ada',
  disabled,
  className,
}: {
  label: string;
  hint?: ReactNode;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  disabled?: boolean;
  className?: string;
}) {
  const NONE = '__none__';
  return (
    <Field label={label} hint={hint} required={required} className={className}>
      <Select
        value={value || (allowEmpty ? NONE : '')}
        disabled={disabled}
        onValueChange={(next) => onChange(next === NONE ? '' : next)}
      >
        <SelectTrigger aria-label={label}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {allowEmpty && <SelectItem value={NONE}>{emptyLabel}</SelectItem>}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

/**
 * Baris pilih karyawan — `<EmployeeSelect>` rumah dalam bingkai `Field`.
 * `emptyLabel` (mis. "Lowong", "Belum ditunjuk") jadi teks saat kosong dan pilihan bisa dihapus.
 */
export function EmployeeRow({
  label,
  hint,
  required,
  value,
  onChange,
  source,
  exclude,
  emptyLabel,
  lang,
  disabled,
  className,
}: {
  label: string;
  hint?: ReactNode;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  source: EmployeeSource;
  exclude?: string[];
  emptyLabel?: string;
  /** Bahasa layar — teks bawaan pemilih ikut. */
  lang?: 'id' | 'en';
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Field label={label} hint={hint} required={required} className={className}>
      <EmployeeSelect
        source={source}
        value={value}
        onChange={(id) => onChange(id)}
        exclude={exclude}
        placeholder={emptyLabel}
        clearable={Boolean(emptyLabel)}
        lang={lang}
        disabled={disabled}
        aria-label={label}
      />
    </Field>
  );
}

/** Dua kolom isian dalam modal lebar. */
export function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}
