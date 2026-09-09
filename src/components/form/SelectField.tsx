import type { ReactNode } from 'react';
import { useField } from 'formik';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormField } from '@/components/form/FormField';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  name: string;
  label?: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  placeholder?: string;
  options: SelectOption[];
  disabled?: boolean;
  containerClassName?: string;
}

/** Select terikat Formik. */
export function SelectField({
  name,
  label,
  hint,
  required,
  placeholder = 'Pilih salah satu',
  options,
  disabled,
  containerClassName,
}: SelectFieldProps) {
  const [field, meta, helpers] = useField(name);
  const error = meta.touched && meta.error ? meta.error : undefined;

  return (
    <FormField name={name} label={label} required={required} hint={hint} error={error} className={containerClassName}>
      <Select
        value={field.value ?? ''}
        onValueChange={(value) => helpers.setValue(value)}
        disabled={disabled}
      >
        <SelectTrigger id={name} onBlur={() => helpers.setTouched(true)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
}
