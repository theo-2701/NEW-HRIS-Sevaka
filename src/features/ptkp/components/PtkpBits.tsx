import { useRef } from 'react';
import type { ReactNode } from 'react';
import { useField } from 'formik';
import { StatusBadge } from '@/components/StatusBadge';
import { Label } from '@/components/ui/label';
import { shortCode } from '@/features/ptkp/types';
import type { PeriodStatus } from '@/features/ptkp/types';
import { cn } from '@/lib/utils';

/** Chip kode PTKP — port `.ptkp-code`: kotak Ocean, 15/700, minimal 52px. */
export function PtkpCodeChip({ code, size = 'md' }: { code: string; size?: 'sm' | 'md' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-md bg-secondary-500 font-body font-bold tracking-[0.02em] text-white',
        size === 'md' ? 'h-[30px] min-w-[52px] px-3 text-[15px]' : 'h-6 min-w-[44px] px-2.5 text-xs',
      )}
    >
      {shortCode(code)}
    </span>
  );
}

export function PeriodStatusBadge({ status }: { status: PeriodStatus }) {
  return status === 'ACTIVE' ? (
    <StatusBadge tone="ok">Active</StatusBadge>
  ) : (
    <StatusBadge tone="mute">Closed</StatusBadge>
  );
}

/** Baris label–nilai kartu periode berjalan — port `.ptkp-current__row`. */
export function PeriodRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-vapor py-2.5 last:border-b-0">
      <span className="font-body text-xs font-medium text-fg-3">{label}</span>
      <span className="text-right font-body text-sm font-bold text-fg-1">{children}</span>
    </div>
  );
}

export function Note({
  tone = 'info',
  icon,
  children,
}: {
  tone?: 'info' | 'warn';
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-md border px-3.5 py-3 font-body text-[13px] font-medium leading-[1.5]',
        tone === 'info' && 'border-primary-200 bg-primary-50 text-secondary-800',
        tone === 'warn' && 'border-warning-200 bg-warning-100 text-warning-800',
      )}
    >
      <span className="mt-px [&_svg]:size-4">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

/**
 * Pemilih berkas pendukung — port `.file-ctl`. Yang disimpan hanya namanya;
 * berkasnya sendiri diunggah ke Document Service dan dikirim sebagai
 * **id dokumen buram**, bukan URL.
 */
export function DocumentField({ name, label, hint }: { name: string; label: string; hint?: ReactNode }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [field, , helpers] = useField<string>(name);

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={`${name}-input`}>{label}</Label>
      <div className="flex h-9 items-center gap-3 rounded-md border border-silver bg-white pr-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="h-full rounded-l-md bg-vapor px-3 font-body text-[13px] font-bold text-secondary-700 transition-colors duration-200 ease-standard hover:bg-mist"
        >
          Choose File
        </button>
        <span className="min-w-0 flex-1 truncate font-body text-[13px] font-medium text-fg-3">
          {field.value || 'Belum ada berkas dipilih'}
        </span>
      </div>
      <input
        id={`${name}-input`}
        ref={inputRef}
        type="file"
        hidden
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={(event) => void helpers.setValue(event.target.files?.[0]?.name ?? '')}
      />
      {hint && <span className="font-body text-xs font-normal leading-[1.4] text-fg-3">{hint}</span>}
    </div>
  );
}
