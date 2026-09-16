import { useMemo, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { TableToolbar } from '@/components/TableToolbar';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AddButton, RowActions } from '@/components/RowActions';
import { StatusBadge } from '@/components/StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePagedRows } from '@/hooks/usePagedRows';
import { VendorFormModal } from '@/features/company/components/CompanyModals';
import { useDeleteVendor, useVendors } from '@/features/company/hooks/useCompany';
import { PIC_POSITION_LABEL, VENDOR_TYPES, VENDOR_TYPE_LABEL } from '@/features/company/types';
import type { Vendor, VendorType } from '@/features/company/types';

/**
 * Settings › Company › Vendor — port `_prototype/company-vendor.html`
 * (UIC-001-COMPANY-0.9 §2.7).
 *
 * Mitra yang dipakai perusahaan, mis. penyedia seragam atau jasa pelatihan. Jenis vendor dan
 * jabatan PIC adalah dua daftar tertutup; kontrak belum menyediakan kolom surel.
 */
export function VendorPage() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState<VendorType | 'ALL'>('ALL');
  const [form, setForm] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [deleting, setDeleting] = useState<Vendor | null>(null);

  const vendors = useVendors(search);
  const remove = useDeleteVendor();

  const rows = useMemo(() => {
    const data = vendors.data ?? [];
    return type === 'ALL' ? data : data.filter((row) => row.vendorType === type);
  }, [vendors.data, type]);
  const paged = usePagedRows(rows);

  const closeForm = () => {
    setForm(false);
    setEditing(null);
  };

  return (
    <PageShell
      crumbs={[{ label: 'Settings' }, { label: 'Company' }, { label: 'Vendor' }]}
      title="Vendor"
      description="Mitra penyedia barang dan jasa perusahaan beserta kontak penanggung jawabnya."
    >
      <Card>
        <CardHead title="Daftar vendor" sub="Kontak vendor disimpan sebagai telepon dan alamat" />
        <div>
          <TableToolbar
            filters={
              <Select value={type} onValueChange={(value) => setType(value as VendorType | 'ALL')}>
                <SelectTrigger className="h-10 w-[200px]" aria-label="Jenis vendor">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua jenis</SelectItem>
                  {VENDOR_TYPES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {VENDOR_TYPE_LABEL[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
            search={{ value: search, onChange: setSearch, placeholder: 'Cari nama vendor' }}
            actions={<AddButton onClick={() => setForm(true)}>Add Vendor</AddButton>}
          />
          <DataTable<Vendor>
            rows={paged.rows}
            rowKey={(row) => row.id}
            loading={vendors.isLoading}
            empty={vendors.error ? String(vendors.error.message) : 'Belum ada vendor terdaftar.'}
            columns={[
              { key: 'name', header: 'Vendor', strong: true, render: (row) => row.vendorName },
              {
                key: 'type',
                header: 'Jenis',
                render: (row) => <StatusBadge tone="info">{VENDOR_TYPE_LABEL[row.vendorType]}</StatusBadge>,
              },
              { key: 'address', header: 'Alamat', muted: true, render: (row) => row.address },
              { key: 'phone', header: 'Telepon seluler', nowrap: true, render: (row) => row.phone },
              { key: 'tel', header: 'Telepon kantor', nowrap: true, muted: true, render: (row) => row.telephone ?? '—' },
              {
                key: 'pic',
                header: 'PIC',
                render: (row) =>
                  row.picName
                    ? `${row.picName}${row.picPosition ? ` · ${PIC_POSITION_LABEL[row.picPosition]}` : ''}`
                    : '—',
              },
            ]}
            actions={(row) => (
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
            )}
          />
          <Pagination
            page={paged.page}
            pageSize={paged.pageSize}
            total={paged.total}
            noun="vendors"
            onPageChange={paged.setPage}
            onPageSizeChange={paged.setPageSize}
          />
        </div>
      </Card>

      <VendorFormModal open={form} editing={editing} onClose={closeForm} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Hapus vendor ini?"
        description={deleting ? `${deleting.vendorName} tidak lagi muncul pada daftar pilihan vendor.` : undefined}
        loading={remove.isPending}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </PageShell>
  );
}
