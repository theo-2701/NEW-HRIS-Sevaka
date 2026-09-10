import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EMPLOYEES } from '@/features/time-off/mock-data';
import {
  ATTENDANCE_STATUS_LABEL,
  CORRECTION_REASON_LABEL,
  CORRECTION_STATUS_LABEL,
  DAY_TYPE_LABEL,
} from '@/features/attendance/types';
import type { AttendanceStatus, CorrectionReasonType, CorrectionStatus, DayType } from '@/features/attendance/types';
import type {
  CorrectionFilterState,
  DayFilterState,
  TapFilterState,
} from '@/features/attendance/attendanceFilters';

/** Isi modal filter — hanya field yang diterima kontrak pencarian tiap grid. */

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

const EMPLOYEE_OPTIONS = EMPLOYEES.map((row) => ({ value: row.id, label: row.name }));

export function DayFilterFields({
  value,
  onChange,
}: {
  value: DayFilterState;
  onChange: (next: DayFilterState) => void;
}) {
  return (
    <>
      <Choice
        label="Attendance status"
        value={value.attendanceStatus}
        allLabel="All statuses"
        options={(Object.keys(ATTENDANCE_STATUS_LABEL) as AttendanceStatus[]).map((status) => ({
          value: status,
          label: ATTENDANCE_STATUS_LABEL[status],
        }))}
        onChange={(attendanceStatus) => onChange({ ...value, attendanceStatus })}
      />
      <Choice
        label="Day type"
        value={value.dayType}
        allLabel="All day types"
        options={(Object.keys(DAY_TYPE_LABEL) as DayType[]).map((dayType) => ({
          value: dayType,
          label: DAY_TYPE_LABEL[dayType],
        }))}
        onChange={(dayType) => onChange({ ...value, dayType })}
      />
      <Choice
        label="Excused"
        value={value.excused}
        allLabel="Excused & belum"
        options={[
          { value: 'YES', label: 'Excused' },
          { value: 'NO', label: 'Belum excused' },
        ]}
        onChange={(excused) => onChange({ ...value, excused })}
      />
      <Choice
        label="Karyawan"
        value={value.employeeId}
        allLabel="All employees"
        options={EMPLOYEE_OPTIONS}
        onChange={(employeeId) => onChange({ ...value, employeeId })}
      />
    </>
  );
}

export function TapFilterFields({
  value,
  onChange,
}: {
  value: TapFilterState;
  onChange: (next: TapFilterState) => void;
}) {
  return (
    <>
      <Choice
        label="Tap type"
        value={value.punchType}
        allLabel="Tap in & tap out"
        options={[
          { value: 'IN', label: 'Tap in' },
          { value: 'OUT', label: 'Tap out' },
        ]}
        onChange={(punchType) => onChange({ ...value, punchType })}
      />
      <Choice
        label="Radius verdict"
        value={value.geofence}
        allLabel="All verdicts"
        options={[
          { value: 'IN', label: 'Inside radius' },
          { value: 'OUT', label: 'Outside radius' },
          { value: 'UNKNOWN', label: 'Could not be evaluated' },
        ]}
        onChange={(geofence) => onChange({ ...value, geofence })}
      />
      <Choice
        label="Mock location"
        value={value.mockLocation}
        allLabel="Dengan & tanpa dugaan"
        options={[
          { value: 'YES', label: 'Mock location suspected' },
          { value: 'NO', label: 'Tanpa dugaan mock' },
        ]}
        onChange={(mockLocation) => onChange({ ...value, mockLocation })}
      />
      <Choice
        label="Karyawan"
        value={value.employeeId}
        allLabel="All employees"
        options={EMPLOYEE_OPTIONS}
        onChange={(employeeId) => onChange({ ...value, employeeId })}
      />
    </>
  );
}

export function CorrectionFilterFields({
  value,
  onChange,
}: {
  value: CorrectionFilterState;
  onChange: (next: CorrectionFilterState) => void;
}) {
  return (
    <>
      <Choice
        label="Correction status"
        value={value.correctionStatus}
        allLabel="All statuses"
        options={(Object.keys(CORRECTION_STATUS_LABEL) as CorrectionStatus[]).map((status) => ({
          value: status,
          label: CORRECTION_STATUS_LABEL[status],
        }))}
        onChange={(correctionStatus) => onChange({ ...value, correctionStatus })}
      />
      <Choice
        label="Reason type"
        value={value.correctionReasonType}
        allLabel="All reasons"
        options={(Object.keys(CORRECTION_REASON_LABEL) as CorrectionReasonType[]).map((reason) => ({
          value: reason,
          label: CORRECTION_REASON_LABEL[reason],
        }))}
        onChange={(correctionReasonType) => onChange({ ...value, correctionReasonType })}
      />
      <Choice
        label="Pengaju"
        value={value.employeeId}
        allLabel="All filers"
        options={EMPLOYEE_OPTIONS}
        onChange={(employeeId) => onChange({ ...value, employeeId })}
      />
    </>
  );
}
