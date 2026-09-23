import { useMemo, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { TabMenu } from '@/components/TabMenu';
import { Card, CardHead, EmptyState } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { TableToolbar } from '@/components/TableToolbar';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AddButton, RowActions, RowButton } from '@/components/RowActions';
import { usePagedRows } from '@/hooks/usePagedRows';
import { CostCenterCategoryFormModal, CostCenterFormModal } from '@/features/company/components/CompanyModals';
import {
  useCompanySetup,
  useCostCenterCategories,
  useCostCenters,
  useDeleteCostCenter,
} from '@/features/company/hooks/useCompany';
import { personName } from '@/features/company/mock-data';
import type { CostCenter, CostCenterCategory } from '@/features/company/types';
import { formatCurrency } from '@/lib/format';

type Tab = 'centers' | 'categories';

/**
 * Settings › Company › Cost Center — port `_prototype/company-cost-center.html`
 * (UIC-001-COMPANY-0.22 §2.5).
 *
 * Menu ini hanya terbuka bila penetapan cost center dinyalakan di Company Setup. Kode cost
 * center unik antar baris aktif dan terkunci setelah dibuat.
 */
export function CostCenterPage() {
  const setup = useCompanySetup();
  const enabled = setup.data?.costCenterAssignmentMode === 'ENABLED';

  const [tab, setTab] = useState<Tab>('centers');
  const [search, setSearch] = useState('');
  const [centerForm, setCenterForm] = useState(false);
  const [editingCenter, setEditingCenter] = useState<CostCenter | null>(null);
  const [deletingCenter, setDeletingCenter] = useState<CostCenter | null>(null);
  const [categoryForm, setCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CostCenterCategory | null>(null);

  const centers = useCostCenters(enabled);
  const categories = useCostCenterCategories(enabled);
  const remove = useDeleteCostCenter();

  const centerRows = useMemo(() => centers.data ?? [], [centers.data]);
  const categoryRows = useMemo(() => categories.data ?? [], [categories.data]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return centerRows;
    return centerRows.filter(
      (row) => row.name.toLowerCase().includes(query) || row.code.toLowerCase().includes(query),
    );
  }, [centerRows, search]);
  const paged = usePagedRows(filtered);
  const pagedCategories = usePagedRows(categoryRows);

  const categoryName = (id: string) => categoryRows.find((row) => row.id === id)?.name ?? '—';
  const parentName = (row: CostCenter) =>
    row.parentId ? (centerRows.find((item) => item.id === row.parentId)?.name ?? '—') : 'Tanpa induk';

  const closeCenterForm = () => {
    setCenterForm(false);
    setEditingCenter(null);
  };
  const closeCategoryForm = () => {
    setCategoryForm(false);
    setEditingCategory(null);
  };

  return (
    <PageShell
      crumbs={[{ label: 'Settings' }, { label: 'Company' }, { label: 'Cost Center' }]}
      title="Cost Center"
      description="Pusat biaya yang dibebani biaya karyawan, beserta kategori dan penanggung jawabnya."
    >
      {!enabled && !setup.isLoading ? (
        <Card>
          <CardHead title="Cost Center" />
          <EmptyState
            title="Penetapan cost center dimatikan untuk perusahaan ini"
            description="Nyalakan dulu penetapan cost center pada Company Setup agar daftar ini bisa dipakai."
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          <TabMenu<Tab>
            value={tab}
            onChange={setTab}
            items={[
              { value: 'centers', label: 'Cost center', count: centerRows.length },
              { value: 'categories', label: 'Kategori', count: categoryRows.length },
            ]}
          />

          {tab === 'centers' && (
            <Card>
              <CardHead title="Cost center" sub="Kode terkunci setelah dibuat dan tidak boleh sama antar baris aktif" />
              <div>
                <TableToolbar
                  search={{ value: search, onChange: setSearch, placeholder: 'Cari nama atau kode' }}
                  actions={<AddButton onClick={() => setCenterForm(true)}>Add Cost Center</AddButton>}
                />
                <DataTable<CostCenter>
                  rows={paged.rows}
                  rowKey={(row) => row.id}
                  loading={centers.isLoading}
                  empty={centers.error ? String(centers.error.message) : 'Belum ada cost center.'}
                  columns={[
                    {
                      key: 'code',
                      header: 'Kode',
                      nowrap: true,
                      render: (row) => <span className="font-mono text-xs">{row.code}</span>,
                    },
                    { key: 'name', header: 'Nama', strong: true, render: (row) => row.name },
                    { key: 'category', header: 'Kategori', render: (row) => categoryName(row.costCenterCategoryId) },
                    { key: 'parent', header: 'Induk', muted: true, render: parentName },
                    {
                      key: 'pic',
                      header: 'Penanggung jawab',
                      render: (row) => personName(row.responsibleEmployeeId),
                    },
                    {
                      key: 'budget',
                      header: 'Anggaran tahunan',
                      align: 'right',
                      render: (row) =>
                        row.annualBudget === null ? (
                          <span className="text-fg-4">—</span>
                        ) : (
                          <span className="tabular-nums">{formatCurrency(row.annualBudget)}</span>
                        ),
                    },
                  ]}
                  actions={(row) => (
                    <RowActions
                      actions={[
                        {
                          label: 'Ubah',
                          onSelect: () => {
                            setEditingCenter(row);
                            setCenterForm(true);
                          },
                        },
                        { label: 'Hapus', danger: true, onSelect: () => setDeletingCenter(row) },
                      ]}
                    />
                  )}
                />
                <Pagination
                  page={paged.page}
                  pageSize={paged.pageSize}
                  total={paged.total}
                  noun="cost centers"
                  onPageChange={paged.setPage}
                  onPageSizeChange={paged.setPageSize}
                />
              </div>
            </Card>
          )}

          {tab === 'categories' && (
            <Card>
              <CardHead title="Kategori" sub="Pengelompokan cost center untuk laporan biaya" />
              <div>
                <TableToolbar actions={<AddButton onClick={() => setCategoryForm(true)}>Add Category</AddButton>} />
                <DataTable<CostCenterCategory>
                  rows={pagedCategories.rows}
                  rowKey={(row) => row.id}
                  loading={categories.isLoading}
                  empty={categories.error ? String(categories.error.message) : 'Belum ada kategori.'}
                  columns={[
                    { key: 'name', header: 'Kategori', strong: true, render: (row) => row.name },
                    { key: 'desc', header: 'Keterangan', muted: true, render: (row) => row.description || '—' },
                    {
                      key: 'used',
                      header: 'Dipakai',
                      align: 'center',
                      muted: true,
                      render: (row) => (
                        <span className="tabular-nums">
                          {centerRows.filter((center) => center.costCenterCategoryId === row.id).length}
                        </span>
                      ),
                    },
                  ]}
                  actions={(row) => (
                    <RowButton
                      onClick={() => {
                        setEditingCategory(row);
                        setCategoryForm(true);
                      }}
                    >
                      Ubah
                    </RowButton>
                  )}
                />
                <Pagination
                  page={pagedCategories.page}
                  pageSize={pagedCategories.pageSize}
                  total={pagedCategories.total}
                  noun="categories"
                  onPageChange={pagedCategories.setPage}
                  onPageSizeChange={pagedCategories.setPageSize}
                />
              </div>
            </Card>
          )}
        </div>
      )}

      <CostCenterFormModal
        open={centerForm}
        editing={editingCenter}
        categories={categoryRows}
        costCenters={centerRows}
        onClose={closeCenterForm}
      />
      <CostCenterCategoryFormModal open={categoryForm} editing={editingCategory} onClose={closeCategoryForm} />

      <ConfirmDialog
        open={Boolean(deletingCenter)}
        title="Hapus cost center ini?"
        description={
          deletingCenter
            ? `${deletingCenter.name} tidak lagi bisa dibebani biaya. Baris yang masih menjadi induk tidak bisa dihapus.`
            : undefined
        }
        loading={remove.isPending}
        onOpenChange={(open) => !open && setDeletingCenter(null)}
        onConfirm={() => deletingCenter && remove.mutate(deletingCenter.id, { onSuccess: () => setDeletingCenter(null) })}
      />
    </PageShell>
  );
}
