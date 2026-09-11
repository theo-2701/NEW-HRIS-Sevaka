import type { ReactNode } from 'react';
import { useField } from 'formik';
import { DatePicker } from '@/components/DatePicker';
import { FormField } from '@/components/form/FormField';

interface DateFieldProps {
  name: string;
  label?: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  placeholder?: string;
  /** Batas ISO `YYYY-MM-DD` — tanggal di luar rentang tidak bisa dipilih. */
  min?: string;
  max?: string;
  disabled?: boolean;
  /** Sembunyikan tombol hapus untuk field yang wajib terisi terus. */
  clearable?: boolean;
  containerClassName?: string;
}

/**
 * Field tanggal terikat Formik — **satu-satunya cara** memilih tanggal di dalam
 * form. Tampilannya `<DatePicker>`; di luar form pakai komponen itu langsung.
 *
 * Nilainya tetap ISO `YYYY-MM-DD` (siap dikirim ke API); yang ditampilkan
 * format rumah `12 Agu 2026`.
 */
export function DateField({
  name,
  label,
  hint,
  required,
  placeholder,
  min,
  max,
  disabled,
  clearable = true,
  containerClassName,
}: DateFieldProps) {
  const [field, meta, helpers] = useField<string>(name);
  const error = meta.touched && meta.error ? meta.error : undefined;

  return (
    <FormField name={name} label={label} required={required} hint={hint} error={error} className={containerClassName}>
      <DatePicker
        id={name}
        value={field.value ?? ''}
        placeholder={placeholder}
        min={min}
        max={max}
        disabled={disabled}
        clearable={clearable}
        invalid={Boolean(error)}
        onChange={(iso) => {
          void helpers.setValue(iso);
          void helpers.setTouched(true, false);
        }}
        // Menutup picker dihitung sebagai "sudah disentuh" supaya galat wajib muncul.
        onClose={() => void helpers.setTouched(true)}
      />
    </FormField>
  );
}
