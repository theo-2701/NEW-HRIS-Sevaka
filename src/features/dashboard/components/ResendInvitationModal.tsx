import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { DataTable, CellIdentity } from '@/components/DataTable';
import { RowButton } from '@/components/RowActions';
import { StatusBadge } from '@/components/StatusBadge';
import { TableToolbar } from '@/components/TableToolbar';
import { Avatar } from '@/components/Avatar';
import { authService } from '@/features/auth/services/auth.service';
import { pendingInvitationKeys, usePendingInvitations } from '@/features/auth/hooks/useAuth';
import type { PendingInvitation } from '@/features/auth/types';
import { ApiError } from '@/services/api';
import { toast } from '@/store/ui.store';
import { formatDateTime } from '@/lib/format';

function expiryLabel(expiresAt: string, now: number) {
  const hours = Math.round((new Date(expiresAt).getTime() - now) / (60 * 60 * 1000));
  if (hours > 0) return `${hours} jam lagi`;
  if (hours === 0) return 'kurang dari 1 jam';
  return `${Math.abs(hours)} jam lalu`;
}

/**
 * Kirim Ulang Undangan (FSD-001-AUTH-0.14 §6 · UIC-001-AUTH-0.19 §5.2) — SUPER_ADMIN / HR_MANAGER.
 *
 * RI-LIST: akun belum aktivasi + status tautan terakhir; RI-CONFIRM: `422` karena tautan aktif masih
 * berlaku → admin memilih Batal atau Kirim Ulang Paksa (`force_invalidate=true`, tautan lama dicabut);
 * RI-DONE: banner sukses, akun tetap di daftar (masih belum aktif) dengan tanggal yang disegarkan.
 * Menu "Manajemen Akun" tidak ada di pohon sidebar kontrak, jadi layar ini dibuka dari Dashboard.
 */
export function ResendInvitationModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const { data = [], isLoading } = usePendingInvitations(open);
  const [search, setSearch] = useState('');
  const [confirming, setConfirming] = useState<PendingInvitation | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  const resend = useMutation({
    mutationFn: ({ row, force }: { row: PendingInvitation; force: boolean }) =>
      authService.resendInvitation(row.employeeId, force),
    onSuccess: (row) => {
      setConfirming(null);
      setDone(`Undangan berhasil dikirim ulang — ${row.name} akan menerima tautan aktivasi baru via email.`);
      void queryClient.invalidateQueries({ queryKey: pendingInvitationKeys });
    },
    onError: (error: Error, { row }) => {
      if (error instanceof ApiError && error.status === 422) return setConfirming(row);
      toast(error.message, 'danger');
    },
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? data.filter((row) => [row.name, row.email].some((v) => v.toLowerCase().includes(q))) : data;
  }, [data, search]);

  return (
    <>
      <Modal
        open={open}
        onOpenChange={(next) => {
          if (!next) setDone(null);
          onOpenChange(next);
        }}
        size="wide"
        title="Kirim Ulang Undangan"
        description="Akun yang sudah dibuat tetapi belum diaktifkan pemiliknya. Hanya satu tautan aktivasi yang berlaku dalam satu waktu."
        footer={
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        }
      >
        {done && (
          <p className="m-0 rounded-md border border-success-200 bg-success-50 px-3.5 py-2.5 font-body text-xs font-medium text-success-800">
            {done}
          </p>
        )}
        <TableToolbar
          search={{ value: search, onChange: setSearch, placeholder: 'Cari nama atau email' }}
          summary={`${data.length} akun menunggu aktivasi`}
        />
        <DataTable<PendingInvitation>
          rows={rows}
          loading={isLoading}
          rowKey={(row) => row.employeeId}
          empty="Tidak ada akun yang menunggu aktivasi."
          columns={[
            {
              key: 'employee',
              header: 'Nama akun',
              render: (row) => <CellIdentity name={row.name} leading={<Avatar name={row.name} size="sm" />} />,
            },
            { key: 'email', header: 'Email', muted: true, nowrap: true, render: (row) => row.email },
            { key: 'sent', header: 'Terkirim', muted: true, nowrap: true, render: (row) => formatDateTime(row.sentAt) },
            {
              key: 'status',
              header: 'Status',
              render: (row) =>
                new Date(row.expiresAt).getTime() > now ? (
                  <StatusBadge tone="ok">Aktif</StatusBadge>
                ) : (
                  <StatusBadge tone="mute">Kedaluwarsa</StatusBadge>
                ),
            },
            {
              key: 'expires',
              header: 'Kedaluwarsa',
              muted: true,
              nowrap: true,
              render: (row) => expiryLabel(row.expiresAt, now),
            },
          ]}
          actions={(row) => (
            <RowButton disabled={resend.isPending} onClick={() => resend.mutate({ row, force: false })}>
              Kirim Ulang
            </RowButton>
          )}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(confirming)}
        title="Undangan aktif masih ada"
        description={
          confirming
            ? `Undangan untuk ${confirming.name} masih berlaku dan belum kedaluwarsa. Kirim ulang akan membatalkan tautan lama dan menerbitkan tautan baru.`
            : undefined
        }
        confirmLabel="Kirim Ulang Paksa"
        cancelLabel="Batal"
        loading={resend.isPending}
        onOpenChange={(next) => !next && setConfirming(null)}
        onConfirm={() => confirming && resend.mutate({ row: confirming, force: true })}
      />
    </>
  );
}
