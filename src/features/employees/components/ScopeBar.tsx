import { GitBranch, ShieldCheck, User } from 'lucide-react';
import type { ActorScope } from '@/features/employees/types';
import { cn } from '@/lib/utils';

const SCOPES: { id: ActorScope; label: string; icon: typeof User }[] = [
  { id: 'HR', label: 'HR Staff / Manager · full', icon: ShieldCheck },
  { id: 'DEPT', label: 'Dept Manager · subtree', icon: GitBranch },
  { id: 'SELF', label: 'Employee · self', icon: User },
];

/**
 * Pemilih cakupan aktor (`employee:directory:read`).
 *
 * Di produksi cakupan datang dari token sesi, bukan dipilih pengguna. Pemilih
 * ini dipertahankan dari prototype sebagai alat verifikasi masking: mengubah
 * scope memperlihatkan bagaimana NIK dan PII disamarkan untuk aktor non-HR.
 */
export function ScopeBar({ value, onChange }: { value: ActorScope; onChange: (scope: ActorScope) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-[10px] border border-primary-200 bg-primary-50 px-3.5 py-2.5">
      <span className="t-label text-secondary-700">Actor data-scope</span>

      {SCOPES.map(({ id, label, icon: Icon }) => {
        const active = id === value;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-pressed={active}
            className={cn(
              'inline-flex h-[26px] items-center gap-1.5 rounded-pill border px-3 font-body text-[11.5px] font-semibold leading-none transition-colors duration-200 ease-standard',
              active
                ? 'border-secondary-500 bg-secondary-500 text-white'
                : 'border-primary-200 bg-white text-fg-2 hover:border-secondary-500',
            )}
          >
            <Icon className={cn('size-3.5', active ? 'text-white' : 'text-secondary-500')} />
            {label}
          </button>
        );
      })}

      <span className="ml-auto font-body text-[11.5px] font-medium text-fg-3">
        Granular scope <code className="font-mono">employee:directory:read</code>
      </span>
    </div>
  );
}
