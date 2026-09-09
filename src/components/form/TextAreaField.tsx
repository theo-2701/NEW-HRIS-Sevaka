import type { ReactNode } from 'react';
import { useField } from 'formik';
import { Textarea } from '@/components/ui/input';
import { FormField } from '@/components/form/FormField';

interface TextAreaFieldProps extends Omit<React.ComponentProps<'textarea'>, 'name' | 'form'> {
  name: string;
  label?: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  containerClassName?: string;
}

/** Textarea terikat Formik — kotak sama seperti field 36px, padding 9/12. */
export function TextAreaField({
  name,
  label,
  hint,
  required,
  containerClassName,
  rows = 3,
  ...props
}: TextAreaFieldProps) {
  const [field, meta] = useField(name);
  const error = meta.touched && meta.error ? meta.error : undefined;

  return (
    <FormField name={name} label={label} required={required} hint={hint} error={error} className={containerClassName}>
      <Textarea id={name} rows={rows} aria-invalid={Boolean(error)} {...field} {...props} />
    </FormField>
  );
}
