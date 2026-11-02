import type { ReactNode } from 'react';
import { CircleAlert, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { LogLevel, SystemLogRole } from '@/features/system-log/types';

export function RolePicker({ value, onChange }: { value: SystemLogRole; onChange: (value: SystemLogRole) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span className="font-body text-xs font-medium text-fg-3">Dev only — signed in as</span>
      <Select value={value} onValueChange={(next) => onChange(next as SystemLogRole)}>
        <SelectTrigger className="w-[220px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
          <SelectItem value="HR_MANAGER">HR Manager</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

const LEVEL_TONE: Record<LogLevel, 'ok' | 'warn' | 'err'> = { INFO: 'ok', WARN: 'warn', ERROR: 'err' };

export const LevelBadge = ({ level }: { level: LogLevel }) => <StatusBadge tone={LEVEL_TONE[level]}>{level}</StatusBadge>;

function Banner({ icon, children, action }: { icon: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 rounded-md border border-border-1 bg-cloud px-4 py-3 font-body text-[13px] font-medium text-fg-2"
    >
      <span className="text-fg-3">{icon}</span>
      <span className="flex-1">{children}</span>
      {action}
    </div>
  );
}

export const AccessNote = () => (
  <Banner icon={<Lock className="size-4" strokeWidth={1.75} />}>
    System logs are available to Super Admin only.
  </Banner>
);

/** Galat muat (bukan 403/422): spanduk + Try again; tabel tanpa teks kosong (T9). */
export const LoadErrorBanner = ({ onRetry, retrying }: { onRetry: () => void; retrying: boolean }) => (
  <Banner
    icon={<CircleAlert className="size-4" strokeWidth={1.75} />}
    action={
      <Button variant="secondary" disabled={retrying} onClick={onRetry}>
        {retrying ? 'Retrying…' : 'Try again'}
      </Button>
    }
  >
    The log could not be loaded. Please try again in a moment.
  </Banner>
);
