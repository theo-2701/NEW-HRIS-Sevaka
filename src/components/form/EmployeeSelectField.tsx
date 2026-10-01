import type { ReactNode } from 'react';
import { useField } from 'formik';
import { EmployeeSelect } from '@/components/EmployeeSelect';
import { FormField } from '@/components/form/FormField';
import type { EmployeeOption, EmployeeSource } from '@/lib/employeeSource';

interface EmployeeSelectFieldProps {
  name: string;
  source: EmployeeSource;
  label?: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  placeholder?: string;
  lang?: 'id' | 'en';
  /** Nilai Formik berupa `string[]` (chip + centang), bukan `string`. */
  multiple?: boolean;
  exclude?: string[];
  disabled?: boolean;
  clearable?: boolean;
  /** Efek samping setelah memilih (mis. mengisi field turunan). `null` saat pilihan dihapus. */
  onSelect?: (option: EmployeeOption | null) => void;
  containerClassName?: string;
}

/** `<EmployeeSelect>` terikat Formik — nilai tetap ID karyawan, jadi skema Yup & payload tidak berubah. */
export function EmployeeSelectField({
  name,
  label,
  hint,
  required,
  multiple,
  clearable,
  onSelect,
  containerClassName,
  ...rest
}: EmployeeSelectFieldProps) {
  const [field, meta, helpers] = useField<string | string[]>(name);
  const error = meta.touched && meta.error ? String(meta.error) : undefined;
  const touch = () => void helpers.setTouched(true);

  return (
    <FormField name={name} label={label} required={required} hint={hint} error={error} className={containerClassName}>
      {multiple ? (
        <EmployeeSelect
          {...rest}
          multiple
          id={name}
          invalid={Boolean(error)}
          value={Array.isArray(field.value) ? field.value : []}
          onChange={(ids) => void helpers.setValue(ids)}
          onBlur={touch}
        />
      ) : (
        <EmployeeSelect
          {...rest}
          id={name}
          clearable={clearable}
          invalid={Boolean(error)}
          value={typeof field.value === 'string' ? field.value : ''}
          onChange={(id, option) => {
            void helpers.setValue(id);
            onSelect?.(option);
          }}
          onBlur={touch}
        />
      )}
    </FormField>
  );
}
