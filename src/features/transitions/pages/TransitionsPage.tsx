import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead } from '@/components/Card';
import { DataTable, CellIdentity } from '@/components/DataTable';
import { DateRangePicker } from '@/components/DatePicker';
import { FilterModal } from '@/components/FilterModal';
import { Pagination } from '@/components/Pagination';
import { RowButton } from '@/components/RowActions';
import { TableToolbar } from '@/components/TableToolbar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { usePagedRows } from '@/hooks/usePagedRows';
import { TransitionStatusBadge } from '@/features/transitions/components/TransitionBits';
import { CreateTransitionModal } from '@/features/transitions/components/CreateTransitionModal';
import { useTransitions } from '@/features/transitions/hooks/useTransitions';
import {
  CREATE_KIND_LABEL,
  SUBTYPE_LABEL,
  TRANSITION_STATUS_LABEL,
  TYPE_LABEL,
  isTaskClosed,
} from '@/features/transitions/types';
import type { CreateKind, Transition, TransitionStatus, TransferSubtype } from '@/features/transitions/types';
import { formatDate } from '@/lib/format';
import { useAuthStore } from '@/store/auth.store';

const KINDS = Object.keys(CREATE_KIND_LABEL) as CreateKind[];
const STATUSES = Object.keys(TRANSITION_STATUS_LABEL) as TransitionStatus[];

/** Saringan Type menggabungkan jenis dan sub-tipe transfer (FSD §19.1). */
const TYPE_FILTERS = [
  { value: 'ONBOARDING', label: 'Onboarding' },
  { value: 'OFFBOARDING', label: 'Offboarding' },
  ...(Object.keys(SUBTYPE_LABEL) as TransferSubtype[]).map((value) => ({ value, label: `Transfer · ${SUBTYPE_LABEL[value]}` })),
];

interface Filter {
  type: string;
  status: TransitionStatus | 'ALL';
  branch: string;
  range: { from: string; to: string };
}
const EMPTY: Filter = { type: 'ALL', status: 'ALL', branch: 'ALL', range: { from: '', to: '' } };

function FilterSelect({
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
    <div className="flex flex-col gap-1">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label}>
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
    </div>
  );
}

const openTasks = (row: Transition) => row.tasks.filter((task) => !isTaskClosed(task)).length;

/**
 * Employee Management › Transition — FSD-001-EMPLOYEE 0.83 §19 (TR-LIST). Satu daftar untuk onboarding,
 * transfer, dan offboarding; menggantikan Employee Transfer serta dashboard Onboarding/Offboarding.
 */
export function TransitionsPage() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const hr = role === 'ROLE_SUPER_ADMIN' || role === 'ROLE_HR_MANAGER' || role === 'ROLE_HR_STAFF';
  const { data, isLoading, isError } = useTransitions();
  const [keyword, setKeyword] = useState('');
  const [filter, setFilter] = useState<Filter>(EMPTY);
  const [filterOpen, setFilterOpen] = useState(false);
  const [creating, setCreating] = useState<CreateKind | null>(null);

  const branches = useMemo(() => [...new Set((data ?? []).map((row) => row.branch).filter(Boolean) as string[])].sort(), [data]);
  const rows = useMemo(() => {
    const word = keyword.trim().toLowerCase();
    return (data ?? []).filter(
      (row) =>
        (!word || `${row.employee} ${row.employeeNik ?? ''}`.toLowerCase().includes(word)) &&
        (filter.type === 'ALL' || row.type === filter.type || row.subtype === filter.type) &&
        (filter.status === 'ALL' || row.status === filter.status) &&
        (filter.branch === 'ALL' || row.branch === filter.branch) &&
        (!filter.range.from || row.effectiveDate >= filter.range.from) &&
        (!filter.range.to || row.effectiveDate <= filter.range.to),
    );
  }, [data, keyword, filter]);
  const paged = usePagedRows(rows);

  const active = [filter.type !== 'ALL', filter.status !== 'ALL', filter.branch !== 'ALL', Boolean(filter.range.from || filter.range.to)].filter(Boolean).length;
  const summary =
    [
      filter.type !== 'ALL' && TYPE_FILTERS.find((item) => item.value === filter.type)?.label,
      filter.status !== 'ALL' && TRANSITION_STATUS_LABEL[filter.status],
      filter.branch !== 'ALL' && filter.branch,
      (filter.range.from || filter.range.to) && `Effective ${filter.range.from ? formatDate(filter.range.from) : '…'} – ${filter.range.to ? formatDate(filter.range.to) : '…'}`,
    ]
      .filter(Boolean)
      .join(' · ') || 'No filter';
  const update = (patch: Partial<Filter>) => {
    setFilter({ ...filter, ...patch });
    paged.resetPage();
  };

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Employee Management' }, { label: 'Transition' }]}
        title="Transition"
        description="Every onboarding, transfer and offboarding in one list. Open a row to follow its tasks. Onboarding starts from New Joiner materialization; submit the other kinds here."
        actions={
          hr && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                {/* Caret = satu-satunya ikon yang boleh menempel di tombol. */}
                <Button>
                  New Transition
                  <ChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {KINDS.map((kind) => (
                  <DropdownMenuItem key={kind} onSelect={() => setCreating(kind)}>
                    {CREATE_KIND_LABEL[kind]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        }
      >
        <Card>
          <CardHead title="Transitions" sub={`${rows.length} transitions`} />
          <div className="flex flex-col">
            <TableToolbar
              filters={
                <Button variant="secondary" onClick={() => setFilterOpen(true)}>
                  {active > 0 ? `Filter (${active})` : 'Filter'}
                </Button>
              }
              summary={summary}
              search={{
                value: keyword,
                onChange: (value) => {
                  setKeyword(value);
                  paged.resetPage();
                },
                placeholder: 'Search employee name or NIK',
              }}
            />
            <DataTable<Transition>
              rows={paged.rows}
              rowKey={(row) => row.id}
              loading={isLoading}
              empty={isError ? 'The transitions could not be loaded.' : 'No transitions found.'}
              columns={[
                {
                  key: 'employee',
                  header: 'Employee',
                  render: (row) => <CellIdentity name={row.employee} sub={row.employeeNik ?? row.id} />,
                },
                { key: 'type', header: 'Type', render: (row) => TYPE_LABEL[row.type] },
                { key: 'subtype', header: 'Subtype', muted: true, render: (row) => (row.subtype ? SUBTYPE_LABEL[row.subtype] : '—') },
                { key: 'effective', header: 'Effective Date', muted: true, nowrap: true, render: (row) => formatDate(row.effectiveDate) },
                { key: 'status', header: 'Status', render: (row) => <TransitionStatusBadge status={row.status} /> },
                { key: 'open', header: 'Open Tasks', align: 'center', render: (row) => openTasks(row) },
                { key: 'requester', header: 'Requester', muted: true, render: (row) => row.requester ?? '—' },
              ]}
              actions={(row) => (
                <RowButton onClick={() => navigate(`/employees/transition/detail?tr=${row.id}`)}>View Detail</RowButton>
              )}
            />
            <Pagination
              page={paged.page}
              pageSize={paged.pageSize}
              total={paged.total}
              noun="transitions"
              onPageChange={paged.setPage}
              onPageSizeChange={paged.setPageSize}
            />
          </div>
        </Card>
      </PageShell>

      <FilterModal
        open={filterOpen}
        title="Filter transitions"
        description="Narrow the list with the criteria below."
        onOpenChange={setFilterOpen}
        onReset={() => update(EMPTY)}
      >
        <FilterSelect label="Type" value={filter.type} allLabel="All types" options={TYPE_FILTERS} onChange={(type) => update({ type })} />
        <FilterSelect
          label="Status"
          value={filter.status}
          allLabel="All statuses"
          options={STATUSES.map((value) => ({ value, label: TRANSITION_STATUS_LABEL[value] }))}
          onChange={(status) => update({ status: status as Filter['status'] })}
        />
        <FilterSelect
          label="Branch"
          value={filter.branch}
          allLabel="All branches"
          options={branches.map((value) => ({ value, label: value }))}
          onChange={(branch) => update({ branch })}
        />
        <div className="flex flex-col gap-1">
          <Label>Effective date</Label>
          <DateRangePicker value={filter.range} onChange={(range) => update({ range })} placeholder="Any date" />
        </div>
      </FilterModal>

      <CreateTransitionModal kind={creating} onClose={() => setCreating(null)} />
    </>
  );
}
