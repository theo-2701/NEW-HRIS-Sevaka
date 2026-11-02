import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/StatusBadge';
import type { ActiveFilter, MasterRole } from '@/features/employee-masters/types';

export function ActiveBadge({ active }: { active: boolean }) {
  return <StatusBadge tone={active ? 'ok' : 'mute'}>{active ? 'Active' : 'Inactive'}</StatusBadge>;
}

/** Filter status aktif — satu filter, jadi inline di toolbar (kiri). */
export function ActiveFilterSelect({ value, onChange }: { value: ActiveFilter; onChange: (value: ActiveFilter) => void }) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as ActiveFilter)}>
      <SelectTrigger className="w-[180px]" aria-label="Status filter">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">All statuses</SelectItem>
        <SelectItem value="ACTIVE">Active</SelectItem>
        <SelectItem value="INACTIVE">Inactive</SelectItem>
      </SelectContent>
    </Select>
  );
}

/** Pemilih peran percobaan — pengganti token (HR Staff baca saja). */
export function RolePicker({ value, onChange }: { value: MasterRole; onChange: (value: MasterRole) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span className="font-body text-xs font-medium text-fg-3">Dev only — signed in as</span>
      <Select value={value} onValueChange={(next) => onChange(next as MasterRole)}>
        <SelectTrigger className="w-[260px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="HR_MANAGER">HR Manager — read and write</SelectItem>
          <SelectItem value="HR_STAFF">HR Staff — read only</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
