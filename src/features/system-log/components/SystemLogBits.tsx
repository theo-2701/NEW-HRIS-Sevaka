import { CircleAlert, Lock, TriangleAlert } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Note } from '@/features/time-off/components/TimeOffBits';
import { rangeSummary } from '@/features/system-log/rules';
import type { LogGrid, LogLevel } from '@/features/system-log/types';

const LEVEL_TONE: Record<LogLevel, 'info' | 'warn' | 'err'> = { INFO: 'info', WARN: 'warn', ERROR: 'err' };

export function LevelBadge({ level }: { level: LogLevel }) {
  return <StatusBadge tone={LEVEL_TONE[level]}>{level}</StatusBadge>;
}

/** `TR-5` — menggantikan seluruh formulir; nol permintaan dikirim. */
export function SystemLogAccessNote() {
  return (
    <Note tone="warn" icon={<Lock />}>
      Only Super Admin can view the system log.
    </Note>
  );
}

/** Kalimat galat bersama untuk 5xx/putus jaringan (FSD-AUTH 0.24 `EC-4`/`EC-5`). */
const UNAVAILABLE = 'This is temporarily unavailable. Please try again in a moment.';

/** `EC-5` — tetap tampil sesudah dialog ditutup; `Try again` mengulang pencarian yang sama. */
export function SystemLogLoadError({ onRetry, retrying }: { onRetry: () => void; retrying: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-error-200 bg-error-50 px-3.5 py-3">
      <span className="flex items-center gap-2.5 font-body text-[13px] font-medium text-error-800 [&_svg]:size-4">
        <CircleAlert />
        {UNAVAILABLE}
      </span>
      <Button variant="secondary" disabled={retrying} onClick={onRetry}>
        {retrying ? 'Trying…' : 'Try again'}
      </Button>
    </div>
  );
}

/** Ringkasan rentang + pemberitahuan terpotong di atas tabel hasil. */
export function SystemLogSummary({ grid, truncatedText }: { grid: LogGrid; truncatedText: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 font-body text-[13px] font-medium text-fg-2">{rangeSummary(grid)}</p>
      {grid.isTruncated && (
        <Note tone="warn" icon={<TriangleAlert />}>
          {truncatedText}
        </Note>
      )}
    </div>
  );
}
