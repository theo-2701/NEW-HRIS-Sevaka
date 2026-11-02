import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useField } from 'formik';
import { FormField } from '@/components/form/FormField';

interface DocumentFieldProps {
  name: string;
  label: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  /** Atribut `accept` input berkas. */
  accept?: string;
  /** Batas ukuran per berkas; lewat batas ⇒ berkas ditolak di klien. */
  maxBytes?: number;
}

/**
 * Pemilih berkas pendukung — port `.file-ctl`. Yang disimpan hanya namanya;
 * berkasnya sendiri diunggah ke Document Service dan dikirim sebagai
 * **id dokumen buram**, bukan URL.
 */
export function DocumentField({
  name,
  label,
  hint,
  required,
  accept = '.pdf,.jpg,.jpeg,.png',
  maxBytes,
}: DocumentFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [field, meta, helpers] = useField<string>(name);
  const [sizeError, setSizeError] = useState('');
  const error = sizeError || (meta.touched && meta.error ? meta.error : '');

  return (
    <FormField name={`${name}-input`} label={label} required={required} hint={hint} error={error}>
      <div className="flex h-9 items-center gap-3 rounded-md border border-silver bg-white pr-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="h-full rounded-l-md bg-vapor px-3 font-body text-[13px] font-bold text-secondary-700 transition-colors duration-200 ease-standard hover:bg-mist"
        >
          Choose File
        </button>
        <span className="min-w-0 flex-1 truncate font-body text-[13px] font-medium text-fg-3">
          {field.value || 'No file chosen'}
        </span>
      </div>
      <input
        id={`${name}-input`}
        ref={inputRef}
        type="file"
        hidden
        accept={accept}
        onChange={(event) => {
          const file = event.target.files?.[0];
          const tooLarge = Boolean(file && maxBytes && file.size > maxBytes);
          setSizeError(tooLarge ? `The file is larger than ${Math.round(maxBytes! / 1024 / 1024)} MB.` : '');
          void helpers.setTouched(true, false);
          void helpers.setValue(file && !tooLarge ? file.name : '');
        }}
      />
    </FormField>
  );
}
