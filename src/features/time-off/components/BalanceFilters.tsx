import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmployeeSelect } from '@/components/EmployeeSelect';
import { LEAVE_TYPES, timeEmployeeSource } from '@/features/time-off/mock-data';
import { MUTATION_SOURCE_LABEL } from '@/features/time-off/types';
import type { MutationSource } from '@/features/time-off/types';

import type { BalanceFilterState, LedgerFilterState } from '@/features/time-off/balanceFilters';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function EmployeeFilter({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <Field label="Karyawan">
      <EmployeeSelect
        source={timeEmployeeSource()}
        placeholder="Semua karyawan"
        clearable
        value={value === 'ALL' ? '' : value}
        onChange={(id) => onChange(id || 'ALL')}
        aria-label="Karyawan"
      />
    </Field>
  );
}

function LeaveTypeSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <Field label="Jenis cuti">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All leave types</SelectItem>
          {LEAVE_TYPES.map((row) => (
            <SelectItem key={row.id} value={row.id}>
              {row.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

function YearSelect({
  value,
  years,
  onChange,
}: {
  value: string;
  years: number[];
  onChange: (value: string) => void;
}) {
  return (
    <Field label="Tahun hak">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All years</SelectItem>
          {years.map((year) => (
            <SelectItem key={year} value={String(year)}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

/** Isi modal filter grid saldo — tiga field, sesuai kontrak pencarian. */
export function BalanceFilterFields({
  value,
  years,
  onChange,
}: {
  value: BalanceFilterState;
  years: number[];
  onChange: (next: BalanceFilterState) => void;
}) {
  return (
    <>
      <EmployeeFilter value={value.employeeId} onChange={(employeeId) => onChange({ ...value, employeeId })} />
      <LeaveTypeSelect value={value.leaveTypeId} onChange={(leaveTypeId) => onChange({ ...value, leaveTypeId })} />
      <YearSelect value={value.periodYear} years={years} onChange={(periodYear) => onChange({ ...value, periodYear })} />
    </>
  );
}

/** Isi modal filter ledger — sama plus sumber mutasi. */
export function LedgerFilterFields({
  value,
  years,
  onChange,
}: {
  value: LedgerFilterState;
  years: number[];
  onChange: (next: LedgerFilterState) => void;
}) {
  return (
    <>
      <EmployeeFilter value={value.employeeId} onChange={(employeeId) => onChange({ ...value, employeeId })} />
      <Field label="Sumber mutasi">
        <Select value={value.source} onValueChange={(source) => onChange({ ...value, source })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All mutation sources</SelectItem>
            {(Object.keys(MUTATION_SOURCE_LABEL) as MutationSource[]).map((source) => (
              <SelectItem key={source} value={source}>
                {MUTATION_SOURCE_LABEL[source]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <LeaveTypeSelect value={value.leaveTypeId} onChange={(leaveTypeId) => onChange({ ...value, leaveTypeId })} />
      <YearSelect value={value.periodYear} years={years} onChange={(periodYear) => onChange({ ...value, periodYear })} />
    </>
  );
}
