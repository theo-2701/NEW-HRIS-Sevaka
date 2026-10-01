import { Label } from '@/components/ui/label';
import { DateRangePicker } from '@/components/DatePicker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { APPROVAL_STATUS_LABEL, HOLIDAY_TYPE_LABEL } from '@/features/calendar/types';
import type { ApprovalStatus, HolidayType } from '@/features/calendar/types';
import type { HolidayFilterState } from '@/features/calendar/calendarFilters';

/** Isi modal filter libur — hanya field yang diterima kontrak pencarian §2.1.5. */
export function HolidayFilterFields({
  value,
  onChange,
}: {
  value: HolidayFilterState;
  onChange: (next: HolidayFilterState) => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-1">
        <Label>Status</Label>
        <Select value={value.approvalStatus} onValueChange={(approvalStatus) => onChange({ ...value, approvalStatus })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {(Object.keys(APPROVAL_STATUS_LABEL) as ApprovalStatus[]).map((status) => (
              <SelectItem key={status} value={status}>
                {APPROVAL_STATUS_LABEL[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <Label>Holiday type</Label>
        <Select value={value.holidayType} onValueChange={(holidayType) => onChange({ ...value, holidayType })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All types</SelectItem>
            {(Object.keys(HOLIDAY_TYPE_LABEL) as HolidayType[]).map((type) => (
              <SelectItem key={type} value={type}>
                {HOLIDAY_TYPE_LABEL[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <Label>Tanggal</Label>
        <DateRangePicker
          value={{ from: value.from, to: value.to }}
          onChange={(range) => onChange({ ...value, ...range })}
        />
      </div>
    </>
  );
}
