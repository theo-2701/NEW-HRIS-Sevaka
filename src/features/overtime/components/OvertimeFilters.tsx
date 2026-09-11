import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/DatePicker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  OVERTIME_CATEGORY_LABEL,
  OVERTIME_STATUS_LABEL,
  SUBMISSION_MODE_LABEL,
} from '@/features/overtime/types';
import type { OvertimeCategory, OvertimeStatus, SubmissionMode } from '@/features/overtime/types';
import type { DailyFilterState, RequestFilterState } from '@/features/overtime/overtimeFilters';

/** Isi modal filter — hanya field yang diterima kontrak pencarian §8.1.5/§8.2.2. */

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

const CATEGORY_OPTIONS = (Object.keys(OVERTIME_CATEGORY_LABEL) as OvertimeCategory[]).map((value) => ({
  value,
  label: OVERTIME_CATEGORY_LABEL[value],
}));

/** Rentang tanggal — satu filter, dua kotak. */
function DateRange({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (next: { from: string; to: string }) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Tanggal dari">
        <DatePicker value={from} max={to || undefined} onChange={(value) => onChange({ from: value, to })} />
      </Field>
      <Field label="Tanggal sampai">
        <DatePicker value={to} min={from || undefined} onChange={(value) => onChange({ from, to: value })} />
      </Field>
    </div>
  );
}

export function RequestFilterFields({
  value,
  onChange,
}: {
  value: RequestFilterState;
  onChange: (next: RequestFilterState) => void;
}) {
  return (
    <>
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
        label="Submission mode"
        value={value.submissionMode}
        allLabel="All modes"
        options={(Object.keys(SUBMISSION_MODE_LABEL) as SubmissionMode[]).map((mode) => ({
          value: mode,
          label: SUBMISSION_MODE_LABEL[mode],
        }))}
        onChange={(submissionMode) => onChange({ ...value, submissionMode })}
      />
      <Choice
        label="Category"
        value={value.overtimeCategory}
        allLabel="All categories"
        options={CATEGORY_OPTIONS}
        onChange={(overtimeCategory) => onChange({ ...value, overtimeCategory })}
      />
      <DateRange from={value.from} to={value.to} onChange={(range) => onChange({ ...value, ...range })} />
    </>
  );
}

export function DailyFilterFields({
  value,
  onChange,
}: {
  value: DailyFilterState;
  onChange: (next: DailyFilterState) => void;
}) {
  return (
    <>
      <Choice
        label="Category"
        value={value.overtimeCategory}
        allLabel="All categories"
        options={CATEGORY_OPTIONS}
        onChange={(overtimeCategory) => onChange({ ...value, overtimeCategory })}
      />
      <DateRange from={value.from} to={value.to} onChange={(range) => onChange({ ...value, ...range })} />
    </>
  );
}
