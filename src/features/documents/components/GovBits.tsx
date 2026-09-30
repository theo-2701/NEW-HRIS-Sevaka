import type { ReactNode } from 'react';
import { CircleAlert, Info } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DocActor } from '@/features/documents/types';
import { ApiError } from '@/services/api';
import { cn } from '@/lib/utils';

export function GovActorPicker({
  viewers,
  actor,
  onChange,
}: {
  viewers: DocActor[];
  actor: DocActor;
  onChange: (next: DocActor) => void;
}) {
  return (
    <Select
      value={actor.employeeId}
      onValueChange={(value) => {
        const next = viewers.find((row) => row.employeeId === value);
        if (next) onChange(next);
      }}
    >
      <SelectTrigger className="h-10 w-[320px]" aria-label="Viewing as">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {viewers.map((viewer) => (
          <SelectItem key={viewer.employeeId} value={viewer.employeeId}>
            {viewer.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function GovNote({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'danger'; children: ReactNode }) {
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-md border px-3.5 py-3 font-body text-[13px] font-medium leading-[1.5]',
        tone === 'info' && 'border-primary-200 bg-primary-50 text-secondary-800',
        tone === 'warn' && 'border-warning-200 bg-warning-100 text-warning-800',
        tone === 'danger' && 'border-error-200 bg-error-50 text-error-700',
      )}
    >
      <span className="mt-px [&_svg]:size-4">{tone === 'info' ? <Info /> : <CircleAlert />}</span>
      <span>{children}</span>
    </div>
  );
}

/** Banner gerbang di dalam modal/halaman — kode kontrak + pesannya. */
export function GovError({ error }: { error: unknown }) {
  if (!error) return null;
  const apiError = error instanceof ApiError ? error : null;
  return (
    <GovNote tone="danger">
      <strong>{apiError ? `${apiError.status}${apiError.code ? ` ${apiError.code}` : ''}` : 'Error'}</strong> —{' '}
      {error instanceof Error ? error.message : String(error)}
    </GovNote>
  );
}

/** Spanduk utang baris menu — layar lengkap secara kontrak tetapi belum dapat dicapai lewat menu HRIS. */
export function NoMenuRowBanner({ problem }: { problem: string }) {
  return (
    <GovNote tone="warn">
      This screen has no menu row yet ({problem}). It is complete by contract but cannot be reached from the HRIS menu
      until the row is registered.
    </GovNote>
  );
}
