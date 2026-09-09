import { Form, Formik, useField } from 'formik';
import { ArrowUpRight, Search, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/form/FormField';
import { TextField } from '@/components/form/TextField';
import { SelectField } from '@/components/form/SelectField';
import { EMPLOYMENT_STATUS_LABEL, EMPLOYMENT_STATUS_ORDER, BRANCHES, EMPTY_CRITERIA } from '@/features/employees/types';
import type { EmployeeSearchCriteria, EmploymentStatus } from '@/features/employees/types';
import { employeeSearchSchema } from '@/features/employees/validation';
import { cn } from '@/lib/utils';

/** Warna titik chip per status — samakan dengan chip di grid. */
const CHIP_DOT: Record<EmploymentStatus, string> = {
  WAITING: 'bg-warning-600',
  ACTIVE: 'bg-success-600',
  OFFBOARDING: 'bg-secondary-500',
  SUSPENDED: 'bg-warning-800',
  RESIGNED: 'bg-steel',
  TERMINATED: 'bg-error-600',
};

const CHIP_ACTIVE: Record<EmploymentStatus, string> = {
  WAITING: 'bg-warning-600',
  ACTIVE: 'bg-success-700',
  OFFBOARDING: 'bg-secondary-600',
  SUSPENDED: 'bg-warning-800',
  RESIGNED: 'bg-steel',
  TERMINATED: 'bg-error-700',
};

/** Multi-select status (operator IN pada `employment_status[]`). */
function StatusChips() {
  const [field, , helpers] = useField<EmploymentStatus[]>('employmentStatus');
  const selected = field.value ?? [];

  const toggle = (status: EmploymentStatus) =>
    helpers.setValue(
      selected.includes(status) ? selected.filter((s) => s !== status) : [...selected, status],
    );

  return (
    <div className="flex flex-wrap gap-2">
      {EMPLOYMENT_STATUS_ORDER.map((status) => {
        const active = selected.includes(status);
        return (
          <button
            key={status}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(status)}
            className={cn(
              'inline-flex h-[30px] items-center gap-2 rounded-pill border px-3 font-body text-[11px] font-bold leading-none tracking-[0.02em] transition-colors duration-200 ease-standard',
              active
                ? cn('border-transparent text-white', CHIP_ACTIVE[status])
                : 'border-fog bg-white text-fg-3 hover:border-secondary-500 hover:text-secondary-700',
            )}
          >
            <span className={cn('size-[7px] rounded-full', active ? 'bg-white/90' : CHIP_DOT[status])} />
            {EMPLOYMENT_STATUS_LABEL[status]}
          </button>
        );
      })}
    </div>
  );
}

/** Rentang `created_at` — dua input tanggal dalam satu baris. */
function CreatedRange() {
  const [from] = useField('createdFrom');
  const [to, toMeta] = useField('createdTo');
  const error = toMeta.touched && toMeta.error ? toMeta.error : undefined;

  return (
    <FormField name="createdFrom" label="Date range" hint="created_at" error={error}>
      <div className="flex items-center gap-2">
        <Input id="createdFrom" type="date" aria-label="Tanggal awal" {...from} />
        <span className="font-body text-[11px] font-medium text-fg-4">to</span>
        <Input id="createdTo" type="date" aria-label="Tanggal akhir" aria-invalid={Boolean(error)} {...to} />
      </div>
    </FormField>
  );
}

interface EmployeeCriteriaFormProps {
  initialValues: EmployeeSearchCriteria;
  onSearch: (criteria: EmployeeSearchCriteria) => void;
  onReset: () => void;
  loading?: boolean;
}

/**
 * Form kriteria DIR-GRID.
 *
 * Sengaja berbentuk panel, bukan toolbar filter + modal seperti layar daftar
 * lain: kontrak menetapkan pencarian sebagai **body `POST /employees/search`**
 * (UIC §1.3), dan setiap field divalidasi sebelum dirangkai jadi query
 * (§8.6 — tolak `<`, `>`, kutip skrip).
 */
export function EmployeeCriteriaForm({
  initialValues,
  onSearch,
  onReset,
  loading = false,
}: EmployeeCriteriaFormProps) {
  return (
    <Formik
      initialValues={initialValues}
      validationSchema={employeeSearchSchema}
      enableReinitialize
      onSubmit={(values) => onSearch(values)}
    >
      {({ resetForm }) => (
        <Form className="overflow-hidden rounded-lg border border-border-1 bg-bg-surface">
          <header className="flex items-center gap-2.5 border-b border-border-1 px-[18px] py-3.5">
            <Search className="size-4 text-secondary-500" />
            <h2 className="m-0 font-display text-sm font-bold leading-tight text-fg-1">Criteria Search</h2>
            <span className="ml-auto inline-flex h-[26px] items-center gap-1.5 rounded-pill bg-secondary-950 px-3 font-mono text-[11px] font-semibold text-[#cfe8f6]">
              <ArrowUpRight className="size-3 text-[#7cc2e6]" />
              <b className="text-white">POST</b> /employees/search
            </span>
          </header>

          <div className="grid gap-4 p-[18px] xl:grid-cols-3">
            <TextField
              name="keyword"
              label="Keyword"
              hint="keyword — LIKE nama / NIK"
              placeholder="mis. Eka, atau NIK-0005"
              maxLength={150}
              autoComplete="off"
              containerClassName="xl:col-span-3"
            />

            <SelectField
              name="branchId"
              label="Unit / Branch"
              hint="branch_id"
              placeholder="Semua unit"
              options={[
                { value: '', label: 'Semua unit' },
                ...BRANCHES.map((b) => ({ value: b.id, label: b.name })),
              ]}
            />

            <div className="xl:col-span-2">
              <CreatedRange />
            </div>

            <FormField
              name="employmentStatus"
              label="Employment status"
              hint="employment_status[] — operator IN (multi pilih)"
              className="xl:col-span-3"
            >
              <StatusChips />
            </FormField>
          </div>

          <footer className="flex flex-wrap items-center gap-2.5 border-t border-border-1 bg-mist px-[18px] py-3">
            <span className="inline-flex items-center gap-1.5 font-body text-[11.5px] font-medium text-fg-3">
              <Shield className="size-3.5 text-secondary-500" />
              Setiap field divalidasi (menolak <code className="font-mono">&lt; &gt;</code> / skrip) sebelum
              dirangkai menjadi query.
            </span>
            <span className="flex-1" />
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                resetForm({ values: EMPTY_CRITERIA });
                onReset();
              }}
            >
              Reset
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Mencari…' : 'Search'}
            </Button>
          </footer>
        </Form>
      )}
    </Formik>
  );
}
