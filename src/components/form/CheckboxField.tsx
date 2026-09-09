import type { ReactNode } from 'react';
import { useField } from 'formik';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

/**
 * Checkbox terikat Formik dengan label panjang di sebelah kanannya.
 * Dipakai untuk pernyataan/atestasi yang harus dicentang sebelum simpan —
 * bukan untuk sakelar pengaturan (itu `<ToggleField>`).
 */
export function CheckboxField({
  name,
  children,
  className,
}: {
  name: string;
  children: ReactNode;
  className?: string;
}) {
  const [field, meta, helpers] = useField<boolean>(name);
  const error = meta.touched && meta.error ? meta.error : undefined;
  const checked = Boolean(field.value);

  return (
    <div className="flex flex-col gap-1">
      <label
        className={cn(
          'flex cursor-pointer items-start gap-3 rounded-[10px] border px-4 py-3.5 transition-[border-color,box-shadow] duration-200 ease-standard',
          checked
            ? 'border-secondary-500 bg-primary-50 shadow-[0_0_0_3px_rgba(2,132,199,.10)]'
            : 'border-primary-200 bg-primary-50',
          error && 'border-error-500',
          className,
        )}
      >
        <Checkbox
          id={name}
          checked={checked}
          onCheckedChange={(next) => {
            void helpers.setTouched(true, false);
            void helpers.setValue(next === true);
          }}
          className="mt-0.5"
        />
        <span className="font-body text-[13px] font-medium leading-[1.5] text-fg-2">{children}</span>
      </label>
      {error && <span className="font-body text-xs font-medium text-error-600">{error}</span>}
    </div>
  );
}
