import type { ReactNode } from 'react';
import { useField } from 'formik';
import { DateRangePicker } from '@/components/DatePicker';
import { FormField } from '@/components/form/FormField';

interface DateRangeFieldProps {
  /** Nama field Formik tanggal awal & akhir — tetap dua nilai ISO, hanya tampilannya satu field. */
  fromName: string;
  toName: string;
  label?: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  placeholder?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  clearable?: boolean;
  /** Tanggal akhir boleh kosong (mis. "Effective until" opsional). */
  openEnd?: boolean;
  /** Tanggal awal terkunci; hanya tanggal akhir yang bisa diubah. */
  lockFrom?: boolean;
  containerClassName?: string;
}

/**
 * Rentang tanggal terikat Formik — standar rumah untuk pasangan "mulai – selesai" di dalam form.
 * Dua nilai Formik (`fromName`/`toName`) tetap terpisah supaya skema Yup & payload API tidak
 * berubah; galat yang tampil = galat pertama dari keduanya.
 */
export function DateRangeField({
  fromName,
  toName,
  label,
  hint,
  required,
  placeholder,
  min,
  max,
  disabled,
  clearable = true,
  openEnd,
  lockFrom,
  containerClassName,
}: DateRangeFieldProps) {
  const [from, fromMeta, fromHelpers] = useField<string>(fromName);
  const [to, toMeta, toHelpers] = useField<string>(toName);
  const touched = fromMeta.touched || toMeta.touched;
  const error = touched ? fromMeta.error || toMeta.error : undefined;

  const touchBoth = () => {
    void fromHelpers.setTouched(true);
    void toHelpers.setTouched(true);
  };

  return (
    <FormField
      name={fromName}
      label={label}
      required={required}
      hint={hint}
      error={error}
      className={containerClassName}
    >
      <DateRangePicker
        id={fromName}
        value={{ from: from.value ?? '', to: to.value ?? '' }}
        placeholder={placeholder}
        min={min}
        max={max}
        disabled={disabled}
        clearable={clearable}
        openEnd={openEnd}
        lockFrom={lockFrom}
        invalid={Boolean(error)}
        onChange={(range) => {
          void fromHelpers.setValue(range.from, false);
          void toHelpers.setValue(range.to);
          touchBoth();
        }}
        // Menutup picker dihitung "sudah disentuh" supaya galat wajib muncul.
        onClose={touchBoth}
      />
    </FormField>
  );
}
