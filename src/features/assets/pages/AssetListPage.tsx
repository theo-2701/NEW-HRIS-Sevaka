import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { TableToolbar } from '@/components/TableToolbar';
import { AddButton, RowButton } from '@/components/RowActions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePagedRows } from '@/hooks/usePagedRows';
import { AssetStatusBadge } from '@/features/assets/components/AssetBits';
import { RegisterAssetModal } from '@/features/assets/components/AssetModals';
import { useAssetCategories, useAssets } from '@/features/assets/hooks/useAssets';
import { useBranches } from '@/features/company/hooks/useCompany';
import { ASSET_STATUSES, ASSET_STATUS_LABEL } from '@/features/assets/types';
import type { Asset, AssetStatus } from '@/features/assets/types';

const ALL = '__all__';
const HELD: AssetStatus[] = ['ASSIGNED', 'INCOMPLETE'];

/**
 * Company Management › Assets › Asset List / Assigned Assets (FSD-COMPANY §7.1 A1/A3).
 *
 * Satu komponen, dua mode: `list` menampilkan seluruh registri dengan filter 9 status, `assigned`
 * mengunci filter ke ASSIGNED ∪ INCOMPLETE — aset yang sedang dipegang karyawan, termasuk yang
 * kelengkapannya belum lengkap (itu tetap dipegang, bukan terblokir).
 */
export function AssetListPage({ mode = 'list' }: { mode?: 'list' | 'assigned' }) {
  const navigate = useNavigate();
  const assigned = mode === 'assigned';
  const [status, setStatus] = useState(ALL);
  const [search, setSearch] = useState('');
  const [register, setRegister] = useState(false);

  const statuses = assigned ? HELD : status === ALL ? [] : [status as AssetStatus];
  const assets = useAssets(statuses, search);
  const categories = useAssetCategories();
  const branches = useBranches();

  const rows = useMemo(() => assets.data ?? [], [assets.data]);
  const paged = usePagedRows(rows);
  const categoryName = (id: string | null) => categories.data?.find((row) => row.id === id)?.name ?? '—';
  const branchName = (id: string | null) => branches.data?.find((row) => row.id === id)?.branchName ?? '—';

  const title = assigned ? 'Assigned Assets' : 'Asset List';

  return (
    <PageShell
      crumbs={[{ label: 'Company Management' }, { label: 'Assets' }, { label: title }]}
      title={title}
      description={
        assigned
          ? 'Aset yang sedang dipegang karyawan, termasuk yang kelengkapannya belum lengkap.'
          : 'Registri seluruh aset perusahaan beserta status dan pemegangnya.'
      }
    >
      <Card>
        <CardHead
          title={assigned ? 'Sedang dipegang' : 'Registri aset'}
          sub={
            assigned
              ? '"Dipegang — belum lengkap" tetap dipegang karyawan; itu berbeda dari "Tidak tersedia" yang terblokir'
              : 'Aset berstatus Tidak tersedia belum bisa diserahkan sampai branch, kategori, dan fotonya lengkap'
          }
        />
        <div>
          <TableToolbar
            filters={
              assigned ? undefined : (
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-10 w-[220px]" aria-label="Filter status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Semua status</SelectItem>
                    {ASSET_STATUSES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {ASSET_STATUS_LABEL[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )
            }
            search={{ value: search, onChange: setSearch, placeholder: 'Cari kode atau nama aset' }}
            actions={assigned ? undefined : <AddButton onClick={() => setRegister(true)}>Daftarkan aset</AddButton>}
          />
          <DataTable<Asset>
            rows={paged.rows}
            rowKey={(row) => row.id}
            loading={assets.isLoading}
            empty={assigned ? 'Belum ada aset yang sedang dipegang.' : 'Belum ada aset terdaftar.'}
            columns={[
              {
                key: 'code',
                header: 'Kode',
                nowrap: true,
                render: (row) => <span className="font-mono text-xs">{row.assetCode}</span>,
              },
              { key: 'name', header: 'Nama aset', strong: true, render: (row) => row.assetName },
              { key: 'category', header: 'Kategori', render: (row) => categoryName(row.assetCategoryId) },
              { key: 'branch', header: 'Branch', muted: true, render: (row) => branchName(row.branchId) },
              {
                key: 'ownership',
                header: 'Kepemilikan',
                muted: true,
                render: (row) => (row.ownershipType === 'OWNED' ? 'Milik sendiri' : 'Sewa'),
              },
              { key: 'holder', header: 'Pemegang', render: (row) => row.employeeInfo?.nama ?? '—' },
              { key: 'status', header: 'Status', render: (row) => <AssetStatusBadge status={row.lastAssetStatus} /> },
            ]}
            actions={(row) => (
              <RowButton onClick={() => navigate(`/company-management/assets/detail?id=${row.id}`)}>View Detail</RowButton>
            )}
          />
          <Pagination
            page={paged.page}
            pageSize={paged.pageSize}
            total={paged.total}
            noun="assets"
            onPageChange={paged.setPage}
            onPageSizeChange={paged.setPageSize}
          />
        </div>
      </Card>

      <RegisterAssetModal open={register} onClose={() => setRegister(false)} />
    </PageShell>
  );
}

export const AssignedAssetsPage = () => <AssetListPage mode="assigned" />;
