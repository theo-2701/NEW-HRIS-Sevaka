import type { ReactNode } from 'react';
import { useField } from 'formik';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/form/FormField';

interface TextFieldProps extends Omit<React.ComponentProps<'input'>, 'name' | 'form'> {
  name: string;
  label?: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  containerClassName?: string;
}

/**
 * Field teks terikat Formik. Ini abstraksi form standar project —
 * jangan memakai `<Field>` Formik mentah atau `<input>` telanjang di fitur.
 */
export function TextField({ name, label, hint, required, containerClassName, ...props }: TextFieldProps) {
  const [field, meta] = useField(name);
  const error = meta.touched && meta.error ? meta.error : undefined;

  return (
    <FormField name={name} label={label} required={required} hint={hint} error={error} className={containerClassName}>
      <Input id={name} aria-invalid={Boolean(error)} {...field} {...props} />
    </FormField>
  );
}
