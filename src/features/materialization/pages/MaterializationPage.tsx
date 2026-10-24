import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, TriangleAlert } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { FilterModal } from '@/components/FilterModal';
import { Modal } from '@/components/Modal';
import { PageShell } from '@/components/PageShell';
import { RowButton } from '@/components/RowActions';
import { StatusBadge } from '@/components/StatusBadge';
import { TableToolbar } from '@/components/TableToolbar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDateTime } from '@/lib/format';
import { Note } from '@/features/time-off/components/TimeOffBits';
import { materializationService } from '@/features/materialization/services/materialization.service';
import {
  BRANCH_OPTIONS,
  SETUP_STATUS_LABEL,
  SETUP_STATUS_TONE,
  SETUP_TYPE_LABEL,
  branchLabel,
  canReadMaterialization,
  canWriteMaterialization,
} from '@/features/materialization/types';
import type { Setup, SetupFilter, SetupStatus, SetupType } from '@/features/materialization/types';
import { SUBTYPE_LABEL } from '@/features/transitions/types';
import type { TransferSubtype } from '@/features/transitions/types';
import { useAuthStore } from '@/store/auth.store';

type Row = Setup & { status: SetupStatus };
const TYPES = Object.keys(SETUP_TYPE_LABEL) as SetupType[];
const SUBTYPES = Object.keys(SUBTYPE_LABEL) as TransferSubtype[];
const STATUSES = Object.keys(SETUP_STATUS_LABEL) as SetupStatus[];

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
    <div className="flex flex-col gap-1">
      <Label>{label}</Label>
      <Select value={value || 'ALL'} onValueChange={(next) => onChange(next === 'ALL' ? '' : next)}>
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

/** "New setup" — pilih Type, Subtype (Transfer), Branch (Onboarding/Offboarding), lalu buka editor. */
function NewSetupModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [type, setType] = useState<SetupType>('ONBOARDING');
  const [subtype, setSubtype] = useState('');
  const [branch, setBranch] = useState('');
  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="New setup"
      description="Choose what the setup applies to. You add its tasks on the next screen."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const params = new URLSearchParams({ new: type });
              if (type === 'TRANSFER' && subtype) params.set('subtype', subtype);
              if (type !== 'TRANSFER' && branch) params.set('branch', branch);
              navigate(`/employees/materialization/setup?${params}`);
            }}
          >
            Continue
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as SetupType)}>
            <SelectTrigger aria-label="Type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map((value) => (
                <SelectItem key={value} value={value}>
                  {SETUP_TYPE_LABEL[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {type === 'TRANSFER' ? (
          <Choice label="Subtype" value={subtype} allLabel="All subtypes" options={SUBTYPES.map((value) => ({ value, label: SUBTYPE_LABEL[value] }))} onChange={setSubtype} />
        ) : (
          <Choice label="Branch" value={branch} allLabel="Company default" options={BRANCH_OPTIONS} onChange={setBranch} />
        )}
      </div>
    </Modal>
  );
}

/**
 * Employee Management › Materialization — FSD-001-EMPLOYEE 0.83 §17 (MZ-LIST). Tulis: HR Manager · Super
 * Admin; baca saja: HR Staff · System Admin.
 */
export function MaterializationPage() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const canRead = canReadMaterialization(role);
  const canWrite = canWriteMaterialization(role);

  const [filter, setFilter] = useState<SetupFilter>({});
  const [filterOpen, setFilterOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ['materialization', 'list', filter],
    queryFn: () => materializationService.search(filter),
    enabled: canRead,
  });
  const { data: coverage } = useQuery({ queryKey: ['materialization', 'coverage'], queryFn: () => materializationService.coverage(), enabled: canRead });

  const active = Object.values(filter).filter(Boolean).length;
  const summary = useMemo(
    () =>
      [
        filter.type && SETUP_TYPE_LABEL[filter.type],
        filter.subtype && (filter.subtype === 'ALL_SUBTYPES' ? 'All subtypes' : SUBTYPE_LABEL[filter.subtype]),
        filter.branchId && (filter.branchId === 'DEFAULT' ? 'Company default' : branchLabel(filter.branchId)),
        filter.status && SETUP_STATUS_LABEL[filter.status],
      ]
        .filter(Boolean)
        .join(' · ') || 'No filter',
    [filter],
  );
  const open = (id: string) => navigate(`/employees/materialization/setup?id=${id}`);

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Employee Management' }, { label: 'Materialization' }]}
        title="Materialization"
        description="Define the tasks each transition creates and who receives them. Onboarding and offboarding are set per branch, transfer per company; a branch without its own setup uses the company default."
        actions={canWrite && <Button onClick={() => setCreating(true)}>New Setup</Button>}
      >
        {!canRead ? (
          <Note tone="warn" icon={<Lock />}>
            This menu is available to HR Manager, Super Admin, HR Staff and System Admin.
          </Note>
        ) : (
          <div className="flex flex-col gap-4">
            {Boolean(coverage?.understaffed) && (
              <Note tone="warn" icon={<TriangleAlert />}>
                {coverage!.understaffed} setup(s) have fewer than 2 active people on a task. New transitions still run with the remaining people.{' '}
                <button type="button" className="font-semibold underline" onClick={() => setFilter({ status: 'UNDERSTAFFED' })}>
                  Show them
                </button>
              </Note>
            )}
            <span className="font-body text-xs font-medium text-fg-3">
              Rotation is managed in{' '}
              <Link to="/employees/temporary-assignment" className="font-semibold text-secondary-700 underline">
                Temporary Assignment
              </Link>
              .
            </span>
            <Card>
              <CardHead title="Setups" sub={`${rows.length} setups`} />
              <div className="flex flex-col">
                <TableToolbar
                  filters={
                    <Button variant="secondary" onClick={() => setFilterOpen(true)}>
                      {active > 0 ? `Filter (${active})` : 'Filter'}
                    </Button>
                  }
                  summary={summary}
                />
                <DataTable<Row>
                  rows={rows}
                  rowKey={(row) => row.id}
                  loading={isLoading}
                  empty={isError ? 'The setups could not be loaded.' : active ? 'No setup matches the filter.' : 'No setup has been defined yet.'}
                  columns={[
                    { key: 'type', header: 'Type', strong: true, render: (row) => SETUP_TYPE_LABEL[row.type] },
                    { key: 'subtype', header: 'Subtype', muted: true, render: (row) => (row.type !== 'TRANSFER' ? '—' : row.subtype ? SUBTYPE_LABEL[row.subtype] : 'All subtypes') },
                    { key: 'branch', header: 'Branch', render: (row) => (row.type === 'TRANSFER' ? 'Whole company' : branchLabel(row.branchId)) },
                    { key: 'status', header: 'Status', render: (row) => <StatusBadge tone={SETUP_STATUS_TONE[row.status]}>{SETUP_STATUS_LABEL[row.status]}</StatusBadge> },
                    { key: 'version', header: 'Version', align: 'center', render: (row) => `v${row.version}` },
                    { key: 'updated', header: 'Updated', muted: true, nowrap: true, render: (row) => `${formatDateTime(row.updatedAt)} · ${row.updatedBy}` },
                  ]}
                  actions={(row) => <RowButton onClick={() => open(row.id)}>Open</RowButton>}
                />
              </div>
            </Card>
            {coverage && coverage.missing.length > 0 && (
              <Card>
                <CardHead title="Branches without a setup" sub="These use the company default" />
                <DataTable<{ type: SetupType; branchId: string }>
                  rows={coverage.missing}
                  rowKey={(row) => `${row.type}:${row.branchId}`}
                  columns={[
                    { key: 'branch', header: 'Branch', strong: true, render: (row) => branchLabel(row.branchId) },
                    { key: 'type', header: 'Type', render: (row) => SETUP_TYPE_LABEL[row.type] },
                  ]}
                  actions={
                    canWrite
                      ? (row) => (
                          <RowButton onClick={() => navigate(`/employees/materialization/setup?new=${row.type}&branch=${row.branchId}`)}>
                            Create Setup
                          </RowButton>
                        )
                      : undefined
                  }
                />
              </Card>
            )}
          </div>
        )}
      </PageShell>

      <FilterModal open={filterOpen} title="Filter setups" onOpenChange={setFilterOpen} onReset={() => setFilter({})}>
        <Choice label="Type" value={filter.type ?? ''} allLabel="All types" options={TYPES.map((value) => ({ value, label: SETUP_TYPE_LABEL[value] }))} onChange={(v) => setFilter({ ...filter, type: (v || undefined) as SetupType | undefined })} />
        <Choice
          label="Subtype"
          value={filter.subtype ?? ''}
          allLabel="Any subtype"
          options={[{ value: 'ALL_SUBTYPES', label: 'All subtypes (generic)' }, ...SUBTYPES.map((value) => ({ value, label: SUBTYPE_LABEL[value] }))]}
          onChange={(v) => setFilter({ ...filter, subtype: (v || undefined) as SetupFilter['subtype'] })}
        />
        <Choice
          label="Branch"
          value={filter.branchId ?? ''}
          allLabel="All branches"
          options={[{ value: 'DEFAULT', label: 'Company default' }, ...BRANCH_OPTIONS]}
          onChange={(v) => setFilter({ ...filter, branchId: v || undefined })}
        />
        <Choice label="Status" value={filter.status ?? ''} allLabel="All statuses" options={STATUSES.map((value) => ({ value, label: SETUP_STATUS_LABEL[value] }))} onChange={(v) => setFilter({ ...filter, status: (v || undefined) as SetupStatus | undefined })} />
      </FilterModal>

      <NewSetupModal open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
