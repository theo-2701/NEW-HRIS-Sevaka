import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { TabMenu } from '@/components/TabMenu';
import { Card, CardHead, StatCard } from '@/components/Card';
import { DataTable, CellIdentity } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/ui/button';
import { RowButton } from '@/components/RowActions';
import { usePagedRows } from '@/hooks/usePagedRows';
import {
  Note,
  ReasonHidden,
  ReprimandStatusBadge,
  StandingPill,
} from '@/features/reprimand/components/ReprimandBits';
import {
  IssueReprimandModal,
  ReviewReprimandModal,
} from '@/features/reprimand/components/ReprimandModals';
import {
  useReprimandCategories,
  useReprimandPolicy,
  useReprimands,
  useStanding,
} from '@/features/reprimand/hooks/useReprimand';
import { toIsoDate } from '@/lib/format';
import { formatDate } from '@/lib/format';
import type { Reprimand, Standing } from '@/features/reprimand/types';

type Tab = 'standing' | 'history';

/**
 * Reprimand — port `_prototype/reprimand.html` (FSD §6 · UIC §7).
 * Dua muka: standing karyawan (diturunkan dari snapshot aktif) dan riwayat
 * penerbitan. Alasan reprimand tidak pernah dirender di tabel.
 */
export function ReprimandPage() {
  const { data: rows = [], isLoading } = useReprimands();
  const { data: standing = [] } = useStanding();
  const { data: categories = [] } = useReprimandCategories();
  const { data: policyMode = 'DIRECT' } = useReprimandPolicy();

  const [tab, setTab] = useState<Tab>('standing');
  const [issuing, setIssuing] = useState(false);
  const [reviewing, setReviewing] = useState<Reprimand | null>(null);

  const paged = usePagedRows(rows);

  const active = rows.filter((row) => row.status === 'ACTIVE').length;
  const inApproval = rows.filter((row) => row.status === 'IN_APPROVAL').length;
  const atFinal = standing.filter((row) => row.level === 'FINAL').length;
  const expiringSoon = useMemo(() => {
    const limit = new Date();
    limit.setDate(limit.getDate() + 30);
    const limitIso = toIsoDate(limit);
    const today = toIsoDate(new Date());
    return rows.filter((row) => row.status === 'ACTIVE' && row.expiryDate >= today && row.expiryDate <= limitIso)
      .length;
  }, [rows]);

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Employee Management' }, { label: 'Reprimand' }]}
        title="Reprimand"
        description="Terbitkan surat peringatan lewat tinjauan maker→checker. Snapshot kategori dibekukan server saat penerbitan, dan standing diturunkan dari snapshot itu — bukan dari konfigurasi yang berlaku sekarang."
        actions={
          <>
            <Button variant="secondary" asChild>
              <Link to="/employees/reprimand/type-setting">Type setting</Link>
            </Button>
            <Button onClick={() => setIssuing(true)}>Issue reprimand</Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Active reprimands" value={active} footer={<Foot>Sedang berlaku</Foot>} />
            <StatCard label="In approval" value={inApproval} footer={<Foot>Menunggu checker</Foot>} />
            <StatCard label="At final warning" value={atFinal} footer={<Foot>Standing level terminal</Foot>} />
            <StatCard label="Expiring in 30d" value={expiringSoon} footer={<Foot>Masa berlaku segera habis</Foot>} />
          </div>

          <TabMenu<Tab>
            value={tab}
            onChange={setTab}
            items={[
              { value: 'standing', label: 'Employee standing', count: standing.length },
              { value: 'history', label: 'Reprimand history', count: rows.length },
            ]}
          />

          {tab === 'standing' && (
            <Card>
              <CardHead title="Employee standing" sub={`Mode kebijakan: ${policyMode}`} />

              <Note icon={<Info />}>
                Standing diturunkan dari <strong>snapshot reprimand yang aktif</strong> — bukan dari konfigurasi
                yang berlaku sekarang. Mengubah master kategori tidak mengubah standing yang sudah terbentuk.
              </Note>

              <DataTable<Standing>
                rows={standing}
                rowKey={(row) => row.employeeId}
                empty="Belum ada karyawan dengan riwayat reprimand."
                columns={[
                  {
                    key: 'employee',
                    header: 'Employee',
                    render: (row) => (
                      <CellIdentity name={row.employeeName} leading={<Avatar name={row.employeeName} size="sm" />} />
                    ),
                  },
                  { key: 'unit', header: 'Unit', muted: true, render: (row) => row.unit },
                  { key: 'points', header: 'Active points', align: 'center', strong: true, render: (row) => row.points },
                  { key: 'standing', header: 'Standing', render: (row) => <StandingPill level={row.level} /> },
                  {
                    key: 'latest',
                    header: 'Latest reprimand',
                    muted: true,
                    nowrap: true,
                    render: (row) => formatDate(row.latestIssuedDate),
                  },
                ]}
              />
            </Card>
          )}

          {tab === 'history' && (
            <Card>
              <CardHead title="Reprimand history" sub="Alasan disembunyikan di grid (PII)" />

              <div className="flex flex-col">
                <DataTable<Reprimand>
                  rows={paged.rows}
                  rowKey={(row) => row.id}
                  loading={isLoading}
                  empty="Belum ada reprimand."
                  columns={[
                    {
                      key: 'employee',
                      header: 'Employee',
                      render: (row) => (
                        <CellIdentity
                          name={row.employeeName}
                          sub={row.unit}
                          leading={<Avatar name={row.employeeName} size="sm" />}
                        />
                      ),
                    },
                    { key: 'category', header: 'Category', strong: true, render: (row) => row.snapshot.label },
                    {
                      key: 'issued',
                      header: 'Issued',
                      muted: true,
                      nowrap: true,
                      render: (row) => formatDate(row.issuedDate),
                    },
                    {
                      key: 'expires',
                      header: 'Expires',
                      muted: true,
                      nowrap: true,
                      render: (row) => formatDate(row.expiryDate),
                    },
                    { key: 'reason', header: 'Reason', render: () => <ReasonHidden /> },
                    { key: 'status', header: 'Status', render: (row) => <ReprimandStatusBadge status={row.status} /> },
                    { key: 'maker', header: 'Maker', muted: true, render: (row) => row.maker },
                  ]}
                  actions={(row) => (
                    <RowButton onClick={() => setReviewing(row)}>
                      {row.status === 'IN_APPROVAL' ? 'Review' : 'View Detail'}
                    </RowButton>
                  )}
                />

                <Pagination
                  page={paged.page}
                  pageSize={paged.pageSize}
                  total={paged.total}
                  noun="reprimands"
                  onPageChange={paged.setPage}
                  onPageSizeChange={paged.setPageSize}
                />
              </div>
            </Card>
          )}
        </div>
      </PageShell>

      <IssueReprimandModal open={issuing} categories={categories} onClose={() => setIssuing(false)} />

      {reviewing && (
        <ReviewReprimandModal
          reprimand={reviewing}
          standing={standing}
          policyMode={policyMode}
          onClose={() => setReviewing(null)}
        />
      )}
    </>
  );
}

function Foot({ children }: { children: React.ReactNode }) {
  return <span className="font-body text-[11.5px] font-medium leading-[1.4] text-fg-3">{children}</span>;
}
