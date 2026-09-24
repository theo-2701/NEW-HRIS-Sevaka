import { useMemo, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { TabMenu } from '@/components/TabMenu';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { RowButton } from '@/components/RowActions';
import { StatusBadge } from '@/components/StatusBadge';
import { usePagedRows } from '@/hooks/usePagedRows';
import { DisposalModal } from '@/features/assets/components/AssetModals';
import { useAssets, useDisposals } from '@/features/assets/hooks/useAssets';
import { DISPOSAL_TYPE_LABEL } from '@/features/assets/types';
import type { Asset, DisposalLog } from '@/features/assets/types';
import { formatCurrency, formatDateTime } from '@/lib/format';

type Tab = 'candidates' | 'history';
type DisposalRow = DisposalLog & { assetCode: string; assetName: string };

/**
 * Company Management › Assets › Disposal (FSD-COMPANY §9, P1–P3). Hanya aset Tersedia yang bisa
 * dilepas. Dijual dan dihibahkan terminal; dilelang masih bisa kembali Tersedia bila lelang batal.
 */
export function DisposalPage() {
  const [tab, setTab] = useState<Tab>('candidates');
  const [target, setTarget] = useState<Asset | null>(null);
  const available = useAssets(['AVAILABLE']);
  const history = useDisposals();

  const candidates = useMemo(() => available.data ?? [], [available.data]);
  const past = useMemo(() => history.data ?? [], [history.data]);
  const pagedCandidates = usePagedRows(candidates);
  const pagedPast = usePagedRows(past);

  return (
    <PageShell
      crumbs={[{ label: 'Company Management' }, { label: 'Assets' }, { label: 'Disposal' }]}
      title="Disposal"
      description="Pelepasan aset lewat penjualan, lelang, atau hibah — kepada karyawan maupun pihak luar."
    >
      <div className="flex flex-col gap-5">
        <TabMenu<Tab>
          value={tab}
          onChange={setTab}
          items={[
            { value: 'candidates', label: 'Bisa dilepas', count: candidates.length },
            { value: 'history', label: 'Riwayat pelepasan', count: past.length },
          ]}
        />

        {tab === 'candidates' && (
          <Card>
            <CardHead title="Aset yang bisa dilepas" sub="Hanya aset berstatus Tersedia — aset yang dipegang karyawan harus diterima kembali dulu" />
            <div>
              <DataTable<Asset>
                rows={pagedCandidates.rows}
                rowKey={(row) => row.id}
                loading={available.isLoading}
                empty="Tidak ada aset Tersedia yang bisa dilepas."
                columns={[
                  {
                    key: 'code',
                    header: 'Kode',
                    nowrap: true,
                    render: (row) => <span className="font-mono text-xs">{row.assetCode}</span>,
                  },
                  { key: 'name', header: 'Nama aset', strong: true, render: (row) => row.assetName },
                  {
                    key: 'residual',
                    header: 'Nilai residu',
                    align: 'right',
                    render: (row) => (row.currentResidualValue !== null ? formatCurrency(row.currentResidualValue) : '—'),
                  },
                ]}
                actions={(row) => <RowButton onClick={() => setTarget(row)}>Lepas aset</RowButton>}
              />
              <Pagination
                page={pagedCandidates.page}
                pageSize={pagedCandidates.pageSize}
                total={pagedCandidates.total}
                noun="assets"
                onPageChange={pagedCandidates.setPage}
                onPageSizeChange={pagedCandidates.setPageSize}
              />
            </div>
          </Card>
        )}

        {tab === 'history' && (
          <Card>
            <CardHead title="Riwayat pelepasan" sub="Append-only" />
            <div>
              <DataTable<DisposalRow>
                rows={pagedPast.rows}
                rowKey={(row) => row.id}
                loading={history.isLoading}
                empty="Belum ada aset yang dilepas."
                columns={[
                  { key: 'asset', header: 'Aset', strong: true, render: (row) => `${row.assetCode} — ${row.assetName}` },
                  {
                    key: 'type',
                    header: 'Jenis',
                    render: (row) => (
                      <StatusBadge tone={row.disposalType === 'AUCTION' ? 'brand' : 'mute'}>
                        {DISPOSAL_TYPE_LABEL[row.disposalType]}
                      </StatusBadge>
                    ),
                  },
                  {
                    key: 'nominal',
                    header: 'Nominal',
                    align: 'right',
                    render: (row) => (row.disposalNominal !== null ? formatCurrency(row.disposalNominal) : '—'),
                  },
                  {
                    key: 'to',
                    header: 'Penerima',
                    render: (row) => (row.isEmployee ? `${row.employeeInfo?.nama ?? '—'} (karyawan)` : `${row.fullName} (pihak luar)`),
                  },
                  { key: 'at', header: 'Waktu', muted: true, nowrap: true, render: (row) => formatDateTime(row.createdAt) },
                ]}
              />
              <Pagination
                page={pagedPast.page}
                pageSize={pagedPast.pageSize}
                total={pagedPast.total}
                noun="disposals"
                onPageChange={pagedPast.setPage}
                onPageSizeChange={pagedPast.setPageSize}
              />
            </div>
          </Card>
        )}
      </div>

      <DisposalModal asset={target} onClose={() => setTarget(null)} />
    </PageShell>
  );
}
