import type { ReactNode } from 'react';
import { CircleAlert, Info } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PROD_ACTORS } from '@/features/productivity/mock-data';
import { employeeOf, PRIORITY_META, STATUS_META } from '@/features/productivity/rules';
import { useProdActor } from '@/features/productivity/store/prodActor.store';
import type { TaskPriority, TaskStatus } from '@/features/productivity/types';
import { ApiError } from '@/services/api';
import { cn } from '@/lib/utils';

/** Pemilih identitas — mencoba matriks peran Productivity (pemilik, atasan berjenjang, HR). */
export function ProdActorPicker({ onChange }: { onChange?: () => void }) {
  const { actor, setActor } = useProdActor();
  return (
    <Select
      value={actor.employeeId}
      onValueChange={(value) => {
        const next = PROD_ACTORS.find((row) => row.employeeId === value);
        if (next) {
          setActor(next);
          onChange?.();
        }
      }}
    >
      <SelectTrigger className="h-10 w-[320px]" aria-label="Viewing as">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PROD_ACTORS.map((viewer) => (
          <SelectItem key={viewer.employeeId} value={viewer.employeeId}>
            {viewer.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function Note({
  tone = 'info',
  icon,
  children,
}: {
  tone?: 'info' | 'warn' | 'danger';
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-md border px-3.5 py-3 font-body text-[13px] font-medium leading-[1.5]',
        tone === 'info' && 'border-primary-200 bg-primary-50 text-secondary-800',
        tone === 'warn' && 'border-warning-200 bg-warning-100 text-warning-800',
        tone === 'danger' && 'border-error-200 bg-error-50 text-error-700',
      )}
    >
      <span className="mt-px [&_svg]:size-4">{icon ?? (tone === 'info' ? <Info /> : <CircleAlert />)}</span>
      <span>{children}</span>
    </div>
  );
}

/** Banner gerbang — kode galat kontrak + pesannya, dirender di dalam modal (bukan toast). */
export function ErrorBanner({ error }: { error: unknown }) {
  if (!error) return null;
  const apiError = error instanceof ApiError ? error : null;
  return (
    <Note tone="danger">
      <strong>{apiError ? `${apiError.status}${apiError.code ? ` ${apiError.code}` : ''}` : 'Error'}</strong> —{' '}
      {error instanceof Error ? error.message : String(error)}
    </Note>
  );
}

export const TaskStatusBadge = ({ value }: { value: TaskStatus }) => (
  <StatusBadge tone={STATUS_META[value].tone}>{STATUS_META[value].label}</StatusBadge>
);

export const PriorityBadge = ({ value }: { value: TaskPriority }) => (
  <StatusBadge tone={PRIORITY_META[value].tone}>{PRIORITY_META[value].label}</StatusBadge>
);

export function PersonCell({ employeeId, caption }: { employeeId: string | null; caption?: string }) {
  const person = employeeOf(employeeId);
  if (!person) return <span className="text-fg-3">—</span>;
  return (
    <span className="flex flex-col gap-0.5">
      <span className="font-semibold text-fg-1">{person.name}</span>
      <span className="text-xs text-fg-3">{caption ?? person.positionName}</span>
    </span>
  );
}
