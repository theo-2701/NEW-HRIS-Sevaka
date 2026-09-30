import { useMemo, useState } from 'react';
import { Lock } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead, EmptyState } from '@/components/Card';
import { DataTable, type Column } from '@/components/DataTable';
import { FilterModal } from '@/components/FilterModal';
import { Pagination } from '@/components/Pagination';
import { RowActions } from '@/components/RowActions';
import { TabMenu } from '@/components/TabMenu';
import { TableToolbar } from '@/components/TableToolbar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NoAccess, PerfActorPicker } from '@/features/performance/components/PerfBits';
import {
  ActiveBadge,
  DeactivateKpiDialog,
  KpiFormModal,
  TargetTypeBadge,
} from '@/features/performance/components/KpiModals';
import { formatWeight, shortId } from '@/features/performance/format';
import { useJobGrades, useKpiItems } from '@/features/performance/hooks/useKpi';
import { canReadKpi, canWriteKpi } from '@/features/performance/rules';
import { usePerfActor } from '@/features/performance/store/perfActor.store';
import { TARGET_TYPE_LABEL, type KpiItem, type TargetType } from '@/features/performance/types';

type Tab = 'manage' | 'browse';
const ALL = 'ALL';

interface Filter {
  jobGradeId: string;
  targetType: string;
  status: string;
}
const EMPTY_FILTER: Filter = { jobGradeId: ALL, targetType: ALL, status: ALL };

const BASE_COLUMNS: Column<KpiItem>[] = [
  {
    key: 'id',
    header: 'ID',
    nowrap: true,
    render: (row) => (
      <span title={row.id} className="rounded-md bg-vapor px-2 py-0.5 font-mono text-[12px] text-fg-2">
        {shortId(row.id)}
      </span>
    ),
  },
  { key: 'name', header: 'Nama Item', strong: true, render: (row) => row.itemName },
  { key: 'grade', header: 'Golongan', render: (row) => row.jobGradeNameSnapshot },
  { key: 'type', header: 'Jenis Target', render: (row) => <TargetTypeBadge type={row.targetType} /> },
  {
    key: 'weight',
    header: 'Bobot',
    align: 'right',
    render: (row) => <span className="tabular-nums">{formatWeight(row.rawWeight)}</span>,
  },
];

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
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

/**
 * Performance › KPI Master & Weight (FSD-001-PERFORMANCE §2 · UIC §3, `KPM-1`–`KPM-5`).
 * Tab Kelola = grid HR (HR Staff & atasan baca saja); tab Browsing = permukaan pilih atasan,
 * status terkunci aktif dan golongan wajib dipilih manual.
 */
export function KpiItemsPage() {
  const { actor } = usePerfActor();
  const readable = canReadKpi(actor.role);
  const writable = canWriteKpi(actor.role);
  const [tab, setTab] = useState<Tab>(actor.role === 'ROLE_DEPT_MANAGER' ? 'browse' : 'manage');
  const [filter, setFilter] = useState<Filter>(EMPTY_FILTER);
  const [filterOpen, setFilterOpen] = useState(false);
  const [browseGrade, setBrowseGrade] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [composing, setComposing] = useState(false);
  const [editing, setEditing] = useState<KpiItem | null>(null);
  const [deactivating, setDeactivating] = useState<KpiItem | null>(null);

  const grades = useJobGrades(actor, readable);
  const gradeName = (id: string) => grades.data?.find((row) => row.id === id)?.name ?? id;

  const query = useMemo(
    () =>
      tab === 'manage'
        ? {
            jobGradeId: filter.jobGradeId === ALL ? undefined : filter.jobGradeId,
            targetType: filter.targetType === ALL ? undefined : (filter.targetType as TargetType),
            isActive: filter.status === ALL ? undefined : filter.status === 'ACTIVE',
            page,
            size,
          }
        : { jobGradeId: browseGrade, isActive: true, page, size },
    [tab, filter, browseGrade, page, size],
  );
  const { data, isLoading } = useKpiItems(actor, query, readable && (tab === 'manage' || Boolean(browseGrade)));

  const activeFilters = [
    filter.jobGradeId !== ALL && `Golongan: ${gradeName(filter.jobGradeId)}`,
    filter.targetType !== ALL && `Jenis: ${TARGET_TYPE_LABEL[filter.targetType as TargetType]}`,
    filter.status !== ALL && `Status: ${filter.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}`,
  ].filter(Boolean) as string[];

  const changeTab = (next: Tab) => {
    setTab(next);
    setPage(1);
  };

  const pager = (
    <Pagination
      page={page}
      pageSize={size}
      total={data?.totalData ?? 0}
      noun="items"
      onPageChange={setPage}
      onPageSizeChange={(next) => {
        setSize(next);
        setPage(1);
      }}
    />
  );

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Performance Management' }, { label: 'KPI Master & Weight' }]}
        title="KPI Master & Weight"
        description="Daftar hal yang dinilai per golongan jabatan beserta jenis target dan bobot mentahnya. Atasan menyalin baris aktif ke lembar penilaian bawahannya."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <PerfActorPicker
              onChange={() => {
                setPage(1);
                setTab(usePerfActor.getState().actor.role === 'ROLE_DEPT_MANAGER' ? 'browse' : 'manage');
              }}
            />
            {writable && tab === 'manage' && <Button onClick={() => setComposing(true)}>Buat item</Button>}
          </div>
        }
      >
        {!readable ? (
          <NoAccess description="Menu Daftar Induk & Bobot tidak tersedia untuk peran Employee." />
        ) : (
          <div className="flex flex-col gap-5">
            <TabMenu<Tab>
              value={tab}
              onChange={changeTab}
              items={[
                { value: 'manage', label: 'Kelola daftar induk' },
                { value: 'browse', label: 'Browsing atasan' },
              ]}
            />

            {tab === 'manage' && (
              <Card>
                <CardHead title="Daftar induk" sub={writable ? 'Seluruh baris, aktif maupun nonaktif' : 'Baca saja untuk peran Anda'} />
                <div className="flex flex-col">
                  <TableToolbar
                    filters={
                      <Button variant="secondary" onClick={() => setFilterOpen(true)}>
                        {activeFilters.length > 0 ? `Filter (${activeFilters.length})` : 'Filter'}
                      </Button>
                    }
                    summary={activeFilters.length > 0 ? activeFilters.join(' · ') : undefined}
                  />
                  <DataTable<KpiItem>
                    rows={data?.rows ?? []}
                    rowKey={(row) => row.id}
                    loading={isLoading}
                    empty="Belum ada item daftar induk."
                    columns={[
                      ...BASE_COLUMNS,
                      { key: 'status', header: 'Status', render: (row) => <ActiveBadge active={row.isActive} /> },
                    ]}
                    actions={
                      writable
                        ? (row) => (
                            <RowActions
                              actions={[
                                { label: 'Ubah', onSelect: () => setEditing(row) },
                                { label: 'Nonaktifkan', danger: true, onSelect: () => setDeactivating(row) },
                              ]}
                            />
                          )
                        : undefined
                    }
                  />
                  {pager}
                </div>
              </Card>
            )}

            {tab === 'browse' && (
              <Card>
                <CardHead title="Browsing atasan" sub="Baris aktif golongan bawahan — baca saja sebelum disalin ke lembar penilaian" />
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex w-[260px] flex-col gap-1">
                      <Label htmlFor="browse-grade">
                        Golongan jabatan<em>*</em>
                      </Label>
                      <Select
                        value={browseGrade}
                        onValueChange={(value) => {
                          setBrowseGrade(value);
                          setPage(1);
                        }}
                      >
                        <SelectTrigger id="browse-grade">
                          <SelectValue placeholder="Pilih golongan jabatan" />
                        </SelectTrigger>
                        <SelectContent>
                          {(grades.data ?? []).map((row) => (
                            <SelectItem key={row.id} value={row.id}>
                              {row.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <span className="inline-flex h-9 items-center gap-1.5 rounded-pill bg-vapor px-3 font-body text-xs font-semibold text-fg-2">
                      <Lock className="size-3.5" />
                      Status terkunci: aktif
                    </span>
                  </div>
                  {!browseGrade ? (
                    <EmptyState
                      title="Pilih golongan jabatan"
                      description="Golongan bawahan belum bisa diisi otomatis dari profil, jadi pilih dulu golongannya."
                    />
                  ) : (
                    <div className="flex flex-col">
                      <DataTable<KpiItem>
                        rows={data?.rows ?? []}
                        rowKey={(row) => row.id}
                        loading={isLoading}
                        empty="Belum ada item aktif untuk golongan ini."
                        columns={BASE_COLUMNS}
                      />
                      {pager}
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        )}
      </PageShell>

      <FilterModal
        open={filterOpen}
        title="Filter daftar induk"
        description="Saring daftar berdasarkan kriteria di bawah."
        onOpenChange={setFilterOpen}
        onReset={() => {
          setFilter(EMPTY_FILTER);
          setPage(1);
        }}
      >
        <div className="grid gap-4">
          <FilterSelect
            label="Golongan jabatan"
            value={filter.jobGradeId}
            onChange={(value) => {
              setFilter({ ...filter, jobGradeId: value });
              setPage(1);
            }}
            options={[{ value: ALL, label: 'Semua golongan' }, ...(grades.data ?? []).map((row) => ({ value: row.id, label: row.name }))]}
          />
          <FilterSelect
            label="Jenis target"
            value={filter.targetType}
            onChange={(value) => {
              setFilter({ ...filter, targetType: value });
              setPage(1);
            }}
            options={[
              { value: ALL, label: 'Semua jenis' },
              { value: 'NUMERIC', label: TARGET_TYPE_LABEL.NUMERIC },
              { value: 'NARRATIVE', label: TARGET_TYPE_LABEL.NARRATIVE },
            ]}
          />
          <FilterSelect
            label="Status"
            value={filter.status}
            onChange={(value) => {
              setFilter({ ...filter, status: value });
              setPage(1);
            }}
            options={[
              { value: ALL, label: 'Semua status' },
              { value: 'ACTIVE', label: 'Aktif' },
              { value: 'INACTIVE', label: 'Nonaktif' },
            ]}
          />
        </div>
      </FilterModal>

      <KpiFormModal
        open={composing || Boolean(editing)}
        editing={editing}
        onClose={() => {
          setComposing(false);
          setEditing(null);
        }}
      />
      <DeactivateKpiDialog item={deactivating} onClose={() => setDeactivating(null)} />
    </>
  );
}
