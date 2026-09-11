import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/DatePicker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ONCALL_STATUS_LABEL } from '@/features/oncall/types';
import { OVERTIME_CATEGORY_LABEL, OVERTIME_STATUS_LABEL } from '@/features/overtime/types';
import type { OncallAssignment, OncallStatus } from '@/features/oncall/types';
import type { OvertimeCategory, OvertimeStatus } from '@/features/overtime/types';
import type { ActivityFilterState, ScheduleFilterState } from '@/features/oncall/oncallFilters';
import { employeeName } from '@/features/oncall/mock-data';
import { formatDateTime } from '@/lib/format';

/** Isi modal filter — hanya field yang diterima kontrak pencarian §11.5/§12.2. */

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Choice({
  label,
  value,
  allLabel,
  options,
  onChange,
}: {
  label: string;
  value: string;
  allLabel: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

function DateRange({
  from,
  to,
  label,
  onChange,
}: {
  from: string;
  to: string;
  label: string;
  onChange: (next: { from: string; to: string }) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label={`${label} dari`}>
        <DatePicker value={from} max={to || undefined} onChange={(value) => onChange({ from: value, to })} />
      </Field>
      <Field label={`${label} sampai`}>
        <DatePicker value={to} min={from || undefined} onChange={(value) => onChange({ from, to: value })} />
      </Field>
    </div>
  );
}

export function ScheduleFilterFields({
  value,
  onChange,
}: {
  value: ScheduleFilterState;
  onChange: (next: ScheduleFilterState) => void;
}) {
  return (
    <>
      <Choice
        label="Status"
        value={value.oncallStatus}
        allLabel="All statuses"
        options={(Object.keys(ONCALL_STATUS_LABEL) as OncallStatus[]).map((status) => ({
          value: status,
          label: ONCALL_STATUS_LABEL[status],
        }))}
        onChange={(oncallStatus) => onChange({ ...value, oncallStatus })}
      />
      <DateRange
        label="Mulai siaga"
        from={value.from}
        to={value.to}
        onChange={(range) => onChange({ ...value, ...range })}
      />
    </>
  );
}

export function ActivityFilterFields({
  value,
  windows,
  onChange,
}: {
  value: ActivityFilterState;
  windows: OncallAssignment[];
  onChange: (next: ActivityFilterState) => void;
}) {
  return (
    <>
      <Choice
        label="Standby window"
        value={value.oncallAssignmentId}
        allLabel="All standby windows"
        options={windows.map((row) => ({
          value: row.id,
          label: `${employeeName(row.employeeId)} · ${formatDateTime(row.standbyStartAt)}`,
        }))}
        onChange={(oncallAssignmentId) => onChange({ ...value, oncallAssignmentId })}
      />
      <Choice
        label="Status"
        value={value.overtimeStatus}
        allLabel="All statuses"
        options={(Object.keys(OVERTIME_STATUS_LABEL) as OvertimeStatus[]).map((status) => ({
          value: status,
          label: OVERTIME_STATUS_LABEL[status],
        }))}
        onChange={(overtimeStatus) => onChange({ ...value, overtimeStatus })}
      />
      <Choice
        label="Category"
        value={value.overtimeCategory}
        allLabel="All categories"
        options={(Object.keys(OVERTIME_CATEGORY_LABEL) as OvertimeCategory[]).map((category) => ({
          value: category,
          label: OVERTIME_CATEGORY_LABEL[category],
        }))}
        onChange={(overtimeCategory) => onChange({ ...value, overtimeCategory })}
      />
      <DateRange
        label="Tanggal lembur"
        from={value.from}
        to={value.to}
        onChange={(range) => onChange({ ...value, ...range })}
      />
    </>
  );
}
