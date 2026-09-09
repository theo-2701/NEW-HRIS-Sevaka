import { useMemo, useState } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { DataTable, CellIdentity } from '@/components/DataTable';
import { RowButton } from '@/components/RowActions';
import { TableToolbar } from '@/components/TableToolbar';
import { Avatar } from '@/components/Avatar';
import { useLockedAccounts, useUnlockAccount } from '@/features/dashboard/hooks/useDashboard';
import { formatDateTime } from '@/lib/format';
import type { LockedAccount } from '@/features/dashboard/types';

interface UnlockAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Modal "Buka Kunci Akun" — port `.ua-overlay` di `index.html`.
 * Hanya SUPER_ADMIN / HR Manager. Satu aksi per baris → tombol inline
 * (bukan dropdown), sesuai standar aksi baris.
 */
export function UnlockAccountModal({ open, onOpenChange }: UnlockAccountModalProps) {
  const [search, setSearch] = useState('');
  const { data = [], isLoading } = useLockedAccounts(open);
  const unlock = useUnlockAccount();

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((a) =>
      [a.name, a.username, a.email].some((v) => v.toLowerCase().includes(q)),
    );
  }, [data, search]);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="wide"
      title="Buka Kunci Akun"
      description="Akun terkunci otomatis setelah 5× gagal login. Membuka kunci di sini melewati auto-unlock 15 menit."
      footer={
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          Tutup
        </Button>
      }
    >
      <TableToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: 'Cari nama, username, atau email',
        }}
        summary={`${data.length} akun terkunci`}
      />

      <DataTable<LockedAccount>
        rows={rows}
        loading={isLoading}
        rowKey={(row) => row.id}
        empty="Tidak ada akun yang terkunci."
        columns={[
          {
            key: 'employee',
            header: 'Karyawan',
            render: (row) => (
              <CellIdentity name={row.name} sub={row.username} leading={<Avatar name={row.name} size="sm" />} />
            ),
          },
          { key: 'email', header: 'Email', muted: true, nowrap: true, render: (row) => row.email },
          {
            key: 'lockedAt',
            header: 'Terkunci sejak',
            muted: true,
            nowrap: true,
            render: (row) => formatDateTime(row.lockedAt),
          },
          {
            key: 'attempts',
            header: 'Gagal login',
            align: 'right',
            muted: true,
            nowrap: true,
            render: (row) => `${row.failedAttempts}×`,
          },
        ]}
        actions={(row) => (
          <RowButton disabled={unlock.isPending} onClick={() => unlock.mutate(row.id)}>
            Buka Kunci
          </RowButton>
        )}
      />
    </Modal>
  );
}
