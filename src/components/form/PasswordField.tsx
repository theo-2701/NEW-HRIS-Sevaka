import { useState, type ReactNode } from 'react';
import { useField } from 'formik';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/form/FormField';

interface PasswordFieldProps extends Omit<React.ComponentProps<'input'>, 'name' | 'type' | 'form'> {
  name: string;
  label?: ReactNode;
  hint?: ReactNode;
  required?: boolean;
}

/** Field password + tombol mata — port `.field--pw` + `.field__eye`. */
export function PasswordField({ name, label, hint, required, ...props }: PasswordFieldProps) {
  const [field, meta] = useField(name);
  const [visible, setVisible] = useState(false);
  const error = meta.touched && meta.error ? meta.error : undefined;

  return (
    <FormField name={name} label={label} required={required} hint={hint} error={error}>
      <div className="relative">
        <Input
          id={name}
          type={visible ? 'text' : 'password'}
          aria-invalid={Boolean(error)}
          className="pr-10"
          {...field}
          {...props}
        />
        <button
          type="button"
          aria-label={visible ? 'Sembunyikan password' : 'Tampilkan password'}
          onClick={() => setVisible((v) => !v)}
          className="absolute right-1 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-fg-3 transition-colors duration-150 ease-standard hover:bg-vapor hover:text-fg-1"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </FormField>
  );
}
