import { useState } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageShell } from '@/components/PageShell';
import { TabMenu } from '@/components/TabMenu';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { AssetActorPicker } from '@/features/assets/components/AssetActorPicker';
import { useAssetActor } from '@/features/assets/store/assetActor.store';
import { AssetStatusBadge } from '@/features/assets/components/AssetBits';
import { DisposalModal, LifecycleModal } from '@/features/assets/components/AssetModals';
import type { LifecycleAction } from '@/features/assets/components/AssetModals';
import { useAsset, useAssetCategories, useAssetHistory, useUploadPhoto } from '@/features/assets/hooks/useAssets';
import { useBranches, useVendors } from '@/features/company/hooks/useCompany';
import {
  blockerReasons,
  canAssign,
  canDispose,
  canLease,
  canReturn,
  canTransfer,
  canWriteAssets,
  isTerminal,
} from '@/features/assets/rules';
import { ASSET_STATUS_LABEL } from '@/features/assets/types';
import type { HandoverLog, LeaseLog, MaintenanceLog, ResidualLog, TransferLog } from '@/features/assets/types';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';

type Tab = 'handover' | 'maintenance' | 'transfer' | 'lease' | 'residual';

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-body text-[11px] font-bold uppercase tracking-[0.06em] text-fg-4">{label}</span>
      <span className="font-body text-[13px] font-medium text-fg-1">{children}</span>
    </div>
  );
}

/**
 * Company Management › Assets › Asset Detail (FSD-COMPANY §8, D1–D9) — halaman hub satu aset:
 * hero + tab riwayat per log (serah-terima, maintenance, transfer, sewa, residu) + aksi lifecycle.
 * Tombol aksi hanya tampil bila sah untuk status aset dan peran saat ini (§7.0: HR Manager dan
 * Department Manager hanya lihat), supaya 403/422 tidak jadi satu-satunya cara pengguna tahu.
 */
export function AssetDetailPage() {
  const [params] = useSearchParams();
  const id = params.get('id') ?? '';
  const asset = useAsset(id);
  const history = useAssetHistory(id);
  const categories = useAssetCategories();
  const branches = useBranches();
  const vendors = useVendors();
  const upload = useUploadPhoto();
  const { actor } = useAssetActor();
  const writable = canWriteAssets(actor.role);

  const [tab, setTab] = useState<Tab>('handover');
  const [action, setAction] = useState<LifecycleAction | null>(null);
  const [disposing, setDisposing] = useState(false);

  const row = asset.data;
  const categoryName = (value: string | null) => categories.data?.find((item) => item.id === value)?.name ?? '—';
  const branchName = (value: string | null) => branches.data?.find((item) => item.id === value)?.branchName ?? '—';
  const vendorName = (value: string | null) => vendors.data?.find((item) => item.id === value)?.vendorName ?? '—';

  const blockers = row ? blockerReasons(row) : [];

  return (
    <PageShell
      crumbs={[
        { label: 'Company Management' },
        { label: 'Assets' },
        { label: 'Asset List', to: '/company-management/assets' },
        { label: row?.assetCode ?? 'Detail' },
      ]}
      title={row ? `${row.assetCode} — ${row.assetName}` : 'Asset Detail'}
      description="Riwayat serah-terima, perawatan, perpindahan, sewa, dan nilai residu satu aset beserta aksi lifecycle-nya."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <AssetActorPicker />
          {row && writable && (
            <>
              {canAssign(row) && <Button onClick={() => setAction('assign')}>Serahkan</Button>}
              {canReturn(row) && <Button onClick={() => setAction('return')}>Terima kembali</Button>}
              {canTransfer(row) && (
                <Button variant="secondary" onClick={() => setAction('transfer')}>
                  Pindahkan
                </Button>
              )}
              {!isTerminal(row.lastAssetStatus) && (
                <Button variant="secondary" onClick={() => setAction('maintain')}>
                  Maintenance
                </Button>
              )}
              {canLease(row) && (
                <Button variant="secondary" onClick={() => setAction('lease')}>
                  Sewa
                </Button>
              )}
              {!isTerminal(row.lastAssetStatus) && (
                <Button variant="secondary" onClick={() => setAction('residual')}>
                  Nilai residu
                </Button>
              )}
              {canDispose(row) && (
                <Button variant="secondary" onClick={() => setDisposing(true)}>
                  Lepas aset
                </Button>
              )}
            </>
          )}
        </div>
      }
    >
      {asset.isLoading || !row ? (
        <Card>
          <p className="py-10 text-center font-body text-[13px] font-medium text-fg-3">
            {asset.error ? String(asset.error.message) : 'Memuat aset…'}
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          <Card>
            <div className="flex flex-wrap items-center gap-3 border-b border-border-1 pb-4">
              <AssetStatusBadge status={row.lastAssetStatus} />
              {row.currentHandoverStatus !== 'NONE' && (
                <StatusBadge tone="mute">
                  {row.currentHandoverStatus === 'GIVING' ? 'Diserahkan' : 'Diterima kembali'}
                </StatusBadge>
              )}
              {row.lastAssetStatus === 'EMPLOYEE_NEGLIGENCE' && <StatusBadge tone="err">Ditandai klaim</StatusBadge>}
            </div>

            {blockers.length > 0 && row.lastAssetStatus === 'NOT_AVAILABLE' && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-error-200 bg-error-50 px-3.5 py-2.5">
                <span className="font-body text-xs font-medium text-error-700">
                  Belum bisa diserahkan: {blockers.join(', ')}.
                </span>
                {!row.photo1 && writable && (
                  <Button
                    variant="secondary"
                    disabled={upload.isPending}
                    onClick={() => upload.mutate({ actor, id: row.id })}
                  >
                    {upload.isPending ? 'Mengunggah…' : 'Unggah foto'}
                  </Button>
                )}
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
              <Info label="Kategori">{categoryName(row.assetCategoryId)}</Info>
              <Info label="Branch">{branchName(row.branchId)}</Info>
              <Info label="Serial number">{row.serialNumber ?? '—'}</Info>
              <Info label="Pemegang">
                {row.employeeInfo ? `${row.employeeInfo.nama} · ${row.employeeInfo.nik}` : '—'}
              </Info>
              <Info label="Kepemilikan">{row.ownershipType === 'OWNED' ? 'Milik sendiri' : 'Sewa'}</Info>
              {row.ownershipType === 'OWNED' ? (
                <>
                  <Info label="Tanggal beli">{row.purchaseDate ? formatDate(row.purchaseDate) : '—'}</Info>
                  <Info label="Harga beli">{row.purchasePrice !== null ? formatCurrency(row.purchasePrice) : '—'}</Info>
                  <Info label="Nomor faktur">{row.purchaseInvoiceNumber ?? '—'}</Info>
                </>
              ) : (
                <>
                  <Info label="Vendor">{vendorName(row.vendorId)}</Info>
                  <Info label="Nilai sewa">{row.leaseAmount !== null ? formatCurrency(row.leaseAmount) : '—'}</Info>
                  <Info label="Masa sewa">
                    {row.leaseStartDate && row.leaseEndDate
                      ? `${formatDate(row.leaseStartDate)} – ${formatDate(row.leaseEndDate)}`
                      : '—'}
                  </Info>
                </>
              )}
              <Info label="Nilai residu">
                {row.currentResidualValue !== null ? formatCurrency(row.currentResidualValue) : '—'}
              </Info>
              <Info label="Maintenance berikutnya">
                {row.nextMaintenanceDate ? formatDate(row.nextMaintenanceDate) : '—'}
              </Info>
            </div>
          </Card>

          <TabMenu<Tab>
            value={tab}
            onChange={setTab}
            items={[
              { value: 'handover', label: 'Serah-terima', count: history.data?.handovers.length ?? 0 },
              { value: 'maintenance', label: 'Maintenance', count: history.data?.maintenances.length ?? 0 },
              { value: 'transfer', label: 'Transfer', count: history.data?.transfers.length ?? 0 },
              ...(row.ownershipType === 'LEASED'
                ? [{ value: 'lease' as const, label: 'Sewa', count: history.data?.leases.length ?? 0 }]
                : []),
              { value: 'residual', label: 'Nilai residu', count: history.data?.residuals.length ?? 0 },
            ]}
          />

          <Card>
            {tab === 'handover' && (
              <>
                <CardHead
                  title="Riwayat serah-terima"
                  sub="Append-only — setiap penyerahan dan penerimaan kembali satu baris"
                />
                <DataTable<HandoverLog>
                  rows={history.data?.handovers ?? []}
                  rowKey={(item) => item.id}
                  loading={history.isLoading}
                  empty="Belum ada serah-terima."
                  columns={[
                    {
                      key: 'event',
                      header: 'Event',
                      render: (item) => (
                        <StatusBadge tone={item.event === 'GIVING' ? 'info' : 'mute'}>
                          {item.event === 'GIVING' ? 'Diserahkan' : 'Diterima kembali'}
                        </StatusBadge>
                      ),
                    },
                    { key: 'who', header: 'Karyawan', strong: true, render: (item) => item.employeeInfo?.nama ?? '—' },
                    {
                      key: 'result',
                      header: 'Keterangan',
                      render: (item) =>
                        item.event === 'GIVING'
                          ? item.isComplete
                            ? 'Lengkap'
                            : 'Kelengkapan belum lengkap'
                          : item.assetStatus
                            ? ASSET_STATUS_LABEL[item.assetStatus]
                            : '—',
                    },
                    { key: 'location', header: 'Lokasi', muted: true, render: (item) => item.assetLocation ?? '—' },
                    { key: 'note', header: 'Catatan', muted: true, render: (item) => item.note ?? '—' },
                    {
                      key: 'at',
                      header: 'Waktu',
                      muted: true,
                      nowrap: true,
                      render: (item) => formatDateTime(item.createdAt),
                    },
                  ]}
                />
              </>
            )}
            {tab === 'maintenance' && (
              <>
                <CardHead
                  title="Riwayat maintenance"
                  sub="Hanya perawatan terjadwal yang menggeser jadwal berikutnya"
                />
                <DataTable<MaintenanceLog>
                  rows={history.data?.maintenances ?? []}
                  rowKey={(item) => item.id}
                  loading={history.isLoading}
                  empty="Belum ada maintenance."
                  columns={[
                    {
                      key: 'date',
                      header: 'Tanggal',
                      strong: true,
                      nowrap: true,
                      render: (item) => formatDate(item.maintenanceDate),
                    },
                    {
                      key: 'type',
                      header: 'Jenis',
                      render: (item) => (
                        <StatusBadge tone={item.maintenanceType === 'SCHEDULED' ? 'ok' : 'warn'}>
                          {item.maintenanceType === 'SCHEDULED' ? 'Terjadwal' : 'Tak terjadwal'}
                        </StatusBadge>
                      ),
                    },
                    {
                      key: 'cost',
                      header: 'Biaya',
                      align: 'right',
                      render: (item) => (item.cost !== null ? formatCurrency(item.cost) : '—'),
                    },
                    { key: 'note', header: 'Catatan', muted: true, render: (item) => item.note ?? '—' },
                  ]}
                />
              </>
            )}
            {tab === 'transfer' && (
              <>
                <CardHead title="Riwayat transfer" sub="Perpindahan antar-branch; pemegang aset tidak ikut berubah" />
                <DataTable<TransferLog>
                  rows={history.data?.transfers ?? []}
                  rowKey={(item) => item.id}
                  loading={history.isLoading}
                  empty="Belum ada transfer."
                  columns={[
                    {
                      key: 'date',
                      header: 'Tanggal',
                      strong: true,
                      nowrap: true,
                      render: (item) => formatDate(item.transferDate),
                    },
                    { key: 'from', header: 'Dari branch', render: (item) => branchName(item.fromBranchId) },
                    { key: 'to', header: 'Ke branch', strong: true, render: (item) => branchName(item.toBranchId) },
                    { key: 'reason', header: 'Alasan', muted: true, render: (item) => item.transferReason },
                  ]}
                />
              </>
            )}
            {tab === 'lease' && (
              <>
                <CardHead title="Riwayat sewa" sub="Setiap pembaruan kontrak sewa satu baris" />
                <DataTable<LeaseLog>
                  rows={history.data?.leases ?? []}
                  rowKey={(item) => item.id}
                  loading={history.isLoading}
                  empty="Belum ada pembaruan sewa."
                  columns={[
                    { key: 'vendor', header: 'Vendor', strong: true, render: (item) => vendorName(item.vendorId) },
                    { key: 'contract', header: 'Nomor kontrak', render: (item) => item.leaseContractNumber },
                    {
                      key: 'at',
                      header: 'Waktu',
                      muted: true,
                      nowrap: true,
                      render: (item) => formatDateTime(item.createdAt),
                    },
                  ]}
                />
              </>
            )}
            {tab === 'residual' && (
              <>
                <CardHead
                  title="Riwayat nilai residu"
                  sub="Nilai terkini tampil di atas; riwayat perubahannya di sini"
                />
                <DataTable<ResidualLog>
                  rows={history.data?.residuals ?? []}
                  rowKey={(item) => item.id}
                  loading={history.isLoading}
                  empty="Belum ada perubahan nilai residu."
                  columns={[
                    {
                      key: 'value',
                      header: 'Nilai residu',
                      strong: true,
                      align: 'right',
                      render: (item) => formatCurrency(item.residualValue),
                    },
                    {
                      key: 'at',
                      header: 'Waktu',
                      muted: true,
                      nowrap: true,
                      render: (item) => formatDateTime(item.createdAt),
                    },
                  ]}
                />
              </>
            )}
          </Card>
        </div>
      )}

      {row && <LifecycleModal actor={actor} asset={row} action={action} onClose={() => setAction(null)} />}
      <DisposalModal actor={actor} asset={disposing ? (row ?? null) : null} onClose={() => setDisposing(false)} />
    </PageShell>
  );
}
