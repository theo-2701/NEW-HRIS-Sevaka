import { useMemo, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { TableToolbar } from '@/components/TableToolbar';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AddButton, RowActions } from '@/components/RowActions';
import { usePagedRows } from '@/hooks/usePagedRows';
import { AssetActorPicker } from '@/features/assets/components/AssetActorPicker';
import { useAssetActor } from '@/features/assets/store/assetActor.store';
import { CategoryFormModal } from '@/features/assets/components/AssetModals';
import { useAssetCategories, useAssets, useDeleteCategory } from '@/features/assets/hooks/useAssets';
import { canWriteAssets } from '@/features/assets/rules';
import type { AssetCategory } from '@/features/assets/types';

/** Company Management › Assets › Asset Category (FSD-COMPANY §7.1 A4) — nama unik, soft-delete. */
export function AssetCategoryPage() {
  const categories = useAssetCategories();
  const assets = useAssets();
  const remove = useDeleteCategory();
  const { actor } = useAssetActor();
  const writable = canWriteAssets(actor.role);
  const [form, setForm] = useState(false);
  const [editing, setEditing] = useState<AssetCategory | null>(null);
  const [deleting, setDeleting] = useState<AssetCategory | null>(null);

  const rows = useMemo(() => categories.data ?? [], [categories.data]);
  const paged = usePagedRows(rows);
  const usage = (id: string) => (assets.data ?? []).filter((row) => row.assetCategoryId === id).length;

  return (
    <PageShell
      crumbs={[{ label: 'Company Management' }, { label: 'Assets' }, { label: 'Asset Category' }]}
      title="Asset Category"
      description="Pengelompokan aset beserta interval perawatan berkalanya."
    >
      <Card>
        <CardHead title="Kategori aset" sub="Kategori yang masih dipakai aset tidak bisa dihapus" />
        <div>
          <TableToolbar
            filters={<AssetActorPicker />}
            actions={writable ? <AddButton onClick={() => setForm(true)}>Add Category</AddButton> : undefined}
          />
          <DataTable<AssetCategory>
            rows={paged.rows}
            rowKey={(row) => row.id}
            loading={categories.isLoading}
            empty="Belum ada kategori."
            columns={[
              { key: 'name', header: 'Kategori', strong: true, render: (row) => row.name },
              {
                key: 'interval',
                header: 'Interval maintenance',
                align: 'right',
                render: (row) =>
                  row.maintenanceIntervalDays ? (
                    <span className="tabular-nums">{row.maintenanceIntervalDays} hari</span>
                  ) : (
                    <span className="text-fg-4">Tidak berkala</span>
                  ),
              },
              {
                key: 'usage',
                header: 'Jumlah aset',
                align: 'center',
                muted: true,
                render: (row) => <span className="tabular-nums">{usage(row.id)}</span>,
              },
            ]}
            actions={
              writable
                ? (row) => (
                    <RowActions
                      actions={[
                        {
                          label: 'Ubah',
                          onSelect: () => {
                            setEditing(row);
                            setForm(true);
                          },
                        },
                        { label: 'Hapus', danger: true, onSelect: () => setDeleting(row) },
                      ]}
                    />
                  )
                : undefined
            }
          />
          <Pagination
            page={paged.page}
            pageSize={paged.pageSize}
            total={paged.total}
            noun="categories"
            onPageChange={paged.setPage}
            onPageSizeChange={paged.setPageSize}
          />
        </div>
      </Card>

      <CategoryFormModal
        actor={actor}
        open={form}
        editing={editing}
        onClose={() => {
          setForm(false);
          setEditing(null);
        }}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Hapus kategori ini?"
        description={deleting ? `${deleting.name} hanya bisa dihapus bila tidak ada aset yang memakainya.` : undefined}
        loading={remove.isPending}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={() => deleting && remove.mutate({ actor, id: deleting.id }, { onSuccess: () => setDeleting(null) })}
      />
    </PageShell>
  );
}
