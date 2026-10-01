import { useState } from 'react';
import type { ReactNode } from 'react';
import { ValidationError } from 'yup';
import { DateRangePicker } from '@/components/DatePicker';
import { FilterModal } from '@/components/FilterModal';
import { MultiSelect } from '@/components/MultiSelect';
import { TableToolbar } from '@/components/TableToolbar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BRANCHES,
  EMPLOYMENT_STATUS_LABEL,
  EMPLOYMENT_STATUS_ORDER,
  EMPTY_CRITERIA,
} from '@/features/employees/types';
import type { EmployeeSearchCriteria } from '@/features/employees/types';
import { employeeSearchSchema } from '@/features/employees/validation';
import { formatDate } from '@/lib/format';

const ALL = 'ALL';
const STATUS_OPTIONS = EMPLOYMENT_STATUS_ORDER.map((value) => ({ value, label: EMPLOYMENT_STATUS_LABEL[value] }));

/** Galat keyword dari skema yang sama dengan backend (§8.6) — `undefined` bila aman dikirim. */
function keywordError(keyword: string): string | undefined {
  try {
    employeeSearchSchema.validateSyncAt('keyword', { keyword });
    return undefined;
  } catch (error) {
    return error instanceof ValidationError ? error.message : 'Kata kunci tidak valid.';
  }
}

/** Status, unit, dan rentang tanggal — rentang dihitung satu filter, bukan dua. */
function countActive(value: EmployeeSearchCriteria): number {
  return (
    (value.employmentStatus.length ? 1 : 0) + (value.branchId ? 1 : 0) + (value.createdFrom || value.createdTo ? 1 : 0)
  );
}

function summarize(value: EmployeeSearchCriteria): string {
  const parts: string[] = [];
  if (value.employmentStatus.length) {
    parts.push(
      EMPLOYMENT_STATUS_ORDER.filter((status) => value.employmentStatus.includes(status))
        .map((status) => EMPLOYMENT_STATUS_LABEL[status])
        .join(' / '),
    );
  }
  if (value.branchId) parts.push(BRANCHES.find((branch) => branch.id === value.branchId)?.name ?? value.branchId);
  if (value.createdFrom || value.createdTo) {
    const from = value.createdFrom ? formatDate(value.createdFrom) : '…';
    const to = value.createdTo ? formatDate(value.createdTo) : '…';
    parts.push(`Created ${from} → ${to}`);
  }
  return parts.length ? parts.join(' · ') : 'Tanpa filter';
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

/**
 * Filter DIR-GRID — tiga filter (status multi, unit, rentang `created_at`), jadi masuk modal sesuai
 * standar rumah (≥ 3 filter → `<FilterModal>`); keyword tetap di kanan toolbar. Kontraknya tetap:
 * semua nilai dirangkai jadi body `POST /employees/search` (UIC §1.3). Keyword yang memuat `<`, `>`,
 * kutip, atau `script` tidak pernah dikirim (§8.6) — galatnya tampil di bawah toolbar dan hasil
 * terakhir tetap.
 */
export function EmployeeFilterBar({
  value,
  onChange,
}: {
  value: EmployeeSearchCriteria;
  onChange: (next: EmployeeSearchCriteria) => void;
}) {
  const [keyword, setKeyword] = useState(value.keyword);
  const [open, setOpen] = useState(false);
  const error = keywordError(keyword);
  const active = countActive(value);

  return (
    <div className="flex flex-col">
      <TableToolbar
        filters={
          <Button variant="secondary" onClick={() => setOpen(true)}>
            {active > 0 ? `Filter (${active})` : 'Filter'}
          </Button>
        }
        summary={summarize(value)}
        search={{
          value: keyword,
          placeholder: 'Search name or NIK',
          onChange: (next) => {
            setKeyword(next);
            if (!keywordError(next)) onChange({ ...value, keyword: next.trim() });
          },
        }}
      />
      {error && (
        <span role="alert" className="-mt-1 mb-2 self-end font-body text-xs font-medium text-error-800">
          {error}
        </span>
      )}

      <FilterModal
        open={open}
        onOpenChange={setOpen}
        description="Filter langsung berlaku pada tabel."
        onReset={() => onChange({ ...EMPTY_CRITERIA, keyword: value.keyword })}
      >
        <Field label="Employment status" htmlFor="employee-filter-status">
          <MultiSelect
            id="employee-filter-status"
            value={value.employmentStatus}
            options={STATUS_OPTIONS}
            placeholder="All statuses"
            onChange={(employmentStatus) => onChange({ ...value, employmentStatus })}
          />
        </Field>
        <Field label="Unit / Branch">
          <Select
            value={value.branchId || ALL}
            onValueChange={(next) => onChange({ ...value, branchId: next === ALL ? '' : next })}
          >
            <SelectTrigger aria-label="Unit / Branch">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All units</SelectItem>
              {BRANCHES.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Created date">
          <DateRangePicker
            value={{ from: value.createdFrom, to: value.createdTo }}
            placeholder="Created date"
            onChange={(range) => onChange({ ...value, createdFrom: range.from, createdTo: range.to })}
          />
        </Field>
      </FilterModal>
    </div>
  );
}
