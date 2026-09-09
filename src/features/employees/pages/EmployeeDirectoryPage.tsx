import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Filter, GitPullRequestArrow } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { Segmented } from '@/components/Segmented';
import { DataTable, CellIdentity } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { RowButton } from '@/components/RowActions';
import { EmptyState } from '@/components/Card';
import { Avatar } from '@/components/Avatar';
import { EmploymentStatusBadge, WorkArrangementTag } from '@/features/employees/components/EmployeeTags';
import { EmployeeCriteriaForm } from '@/features/employees/components/EmployeeCriteriaForm';
import { EmployeeDetailModal } from '@/features/employees/components/EmployeeDetailModal';
import { ScopeBar } from '@/features/employees/components/ScopeBar';
import { useEmployeeSearch } from '@/features/employees/hooks/useEmployees';
import { CURRENT_EMPLOYEE_ID } from '@/features/employees/services/employee.service';
import { maskNik } from '@/features/employees/masking';
import {
  BRANCHES,
  EMPLOYMENT_STATUS_LABEL,
  EMPTY_CRITERIA,
  type ActorScope,
  type EmployeeRow,
  type EmployeeSearchCriteria,
  type SortDirection,
} from '@/features/employees/types';
import { formatNumber } from '@/lib/format';

type Tab = 'directory' | 'organization';

/** Ringkasan kriteria aktif — padanan `.doc-fsum` pada layar berfilter. */
function summarize(criteria: EmployeeSearchCriteria): string {
  const parts: string[] = [];
  if (criteria.keyword) parts.push(`keyword "${criteria.keyword}"`);
  if (criteria.employmentStatus.length) {
    parts.push(criteria.employmentStatus.map((s) => EMPLOYMENT_STATUS_LABEL[s]).join(' / '));
  }
  if (criteria.branchId) parts.push(BRANCHES.find((b) => b.id === criteria.branchId)?.name ?? criteria.branchId);
  if (criteria.createdFrom || criteria.createdTo) {
    parts.push(`created ${criteria.createdFrom || '…'} → ${criteria.createdTo || '…'}`);
  }
  return parts.length ? parts.join(' · ') : 'no filter';
}

/**
 * Employee Directory — port `_prototype/employee-directory.html`
 * (FSD-001 §1 · UIC-001 §2). READ-ONLY: DIR-GRID (search berkriteria) +
 * DIR-DETAIL (overlay). Tidak ada aksi yang mengubah data.
 */
export function EmployeeDirectoryPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const tab: Tab = pathname.endsWith('/organization') ? 'organization' : 'directory';

  const [scope, setScope] = useState<ActorScope>('HR');
  const [criteria, setCriteria] = useState<EmployeeSearchCriteria>(EMPTY_CRITERIA);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [sortBy, setSortBy] = useState('nik');
  const [sortDir, setSortDir] = useState<SortDirection>('ASC');
  const [detailId, setDetailId] = useState<string | null>(null);

  const request = useMemo(
    () => ({ ...criteria, page, size, sortBy, sortDir }),
    [criteria, page, size, sortBy, sortDir],
  );
  const { data, isFetching } = useEmployeeSearch(request);
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;

  const handleSort = (key: string) => {
    if (key === sortBy) {
      setSortDir((d) => (d === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(key);
      setSortDir('ASC');
    }
    setPage(1);
  };

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Employee Management' }, { label: 'Employee Directory' }]}
        title="Employee Directory"
        description="Cari direktori karyawan aktif dan buka profil gabungan (work data + identitas + posisi). Read-only — tidak ada data yang diubah."
      >
        <div className="flex flex-col gap-4">
          <Segmented<Tab>
            value={tab}
            onChange={(next) =>
              navigate(next === 'directory' ? '/employees/directory' : '/employees/organization')
            }
            options={[
              { value: 'directory', label: 'Directory' },
              { value: 'organization', label: 'Organization' },
            ]}
          />

          {tab === 'organization' ? (
            <EmptyState
              title="Tampilan Organization belum tersedia"
              description="Prototype dan kontrak saat ini hanya memuat DIR-GRID + DIR-DETAIL. Struktur pohon organisasi menunggu kontrak read dari company-service."
            />
          ) : (
            <>
              <ScopeBar value={scope} onChange={setScope} />

              <EmployeeCriteriaForm
                initialValues={criteria}
                loading={isFetching}
                onSearch={(next) => {
                  setCriteria(next);
                  setPage(1);
                }}
                onReset={() => {
                  setCriteria(EMPTY_CRITERIA);
                  setPage(1);
                }}
              />

              {/* GAP PROB-FRONTEND-002 — lihat _prototype/EMPLOYEE-GAP-NOTES.md §A */}
              <div className="flex items-start gap-2.5 rounded-[10px] border border-warning-200 bg-warning-50 px-3.5 py-3 font-body text-[11.5px] font-medium leading-normal text-warning-950">
                <GitPullRequestArrow className="mt-0.5 size-4 shrink-0 text-warning-700" />
                <span>
                  <span className="mr-1.5 inline-flex h-[18px] items-center rounded-[5px] bg-warning-500 px-1.5 font-body text-[8.5px] font-bold uppercase tracking-[0.04em] text-white">
                    GAP · PROB-FRONTEND-002
                  </span>
                  Kolom <strong>Name</strong> dan <strong>Unit/Branch</strong> bukan kolom{' '}
                  <code className="font-mono">emp_work_detail</code> — keduanya proyeksi join lintas-service (auth
                  &amp; company). Ketersediaannya menunggu kontrak read gabungan yang belum ditegaskan.
                </span>
              </div>

              <section className="overflow-hidden rounded-lg border border-border-1 bg-bg-surface">
                <header className="flex flex-wrap items-center gap-3 border-b border-border-1 px-[18px] py-3.5">
                  <span className="font-body text-[13px] font-bold leading-tight text-fg-1">
                    Menampilkan <b className="text-secondary-600">{formatNumber(total)}</b> hasil
                  </span>
                  <span className="ml-auto inline-flex h-[26px] items-center gap-1.5 rounded-pill bg-secondary-950 px-3 font-mono text-[11px] font-semibold text-[#cfe8f6]">
                    <Filter className="size-3 text-[#7cc2e6]" />
                    <b className="text-white">{summarize(criteria)}</b>
                  </span>
                </header>

                <div className="p-[18px]">
                  <DataTable<EmployeeRow>
                    rows={rows}
                    loading={isFetching && rows.length === 0}
                    rowKey={(row) => row.id}
                    sort={{ by: sortBy, dir: sortDir }}
                    onSortChange={handleSort}
                    empty="Tidak ada hasil. Sesuaikan keyword, status, unit, atau rentang tanggal, lalu cari lagi."
                    columns={[
                      {
                        key: 'employee',
                        header: 'Employee',
                        render: (row) => (
                          <CellIdentity
                            name={
                              <button
                                type="button"
                                onClick={() => setDetailId(row.id)}
                                className="text-fg-link hover:underline"
                              >
                                {row.name}
                              </button>
                            }
                            sub={row.position}
                            leading={<Avatar name={row.name} size="sm" />}
                          />
                        ),
                      },
                      {
                        key: 'nik',
                        header: 'NIK',
                        sortKey: 'nik',
                        render: (row) => (
                          <span className="font-mono text-[12.5px] font-semibold tracking-[0.04em] text-fg-2">
                            {maskNik(row.nik, scope, row.id === CURRENT_EMPLOYEE_ID)}
                          </span>
                        ),
                      },
                      {
                        key: 'employmentStatus',
                        header: 'Employment Status',
                        sortKey: 'employmentStatus',
                        render: (row) => <EmploymentStatusBadge status={row.employmentStatus} />,
                      },
                      {
                        key: 'workArrangement',
                        header: 'Work Arrangement',
                        render: (row) => <WorkArrangementTag arrangement={row.workArrangement} />,
                      },
                      { key: 'branch', header: 'Unit / Branch', muted: true, render: (row) => row.branchName },
                    ]}
                    actions={(row) => <RowButton onClick={() => setDetailId(row.id)}>View Detail</RowButton>}
                  />

                  <Pagination
                    page={page}
                    pageSize={size}
                    total={total}
                    noun="employees"
                    onPageChange={setPage}
                    onPageSizeChange={(next) => {
                      setSize(next);
                      setPage(1);
                    }}
                  />
                </div>
              </section>
            </>
          )}
        </div>
      </PageShell>

      <EmployeeDetailModal employeeId={detailId} scope={scope} onClose={() => setDetailId(null)} />
    </>
  );
}
