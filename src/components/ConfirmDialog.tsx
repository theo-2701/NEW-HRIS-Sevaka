import type { ReactNode } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  /** Label tombol aksi. Default "Hapus" karena mayoritas pemakaian destruktif. */
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  children?: ReactNode;
}

/**
 * Dialog konfirmasi standar — aksi pendek satu keputusan, jadi modal
 * (bukan halaman penuh). Dua tombol footer otomatis rata kanan mengikuti
 * standar `<Modal>`.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Hapus',
  cancelLabel = 'Batal',
  tone = 'danger',
  loading = false,
  onConfirm,
  onOpenChange,
  children,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={typeof description === 'string' ? description : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button variant={tone} onClick={onConfirm} disabled={loading}>
            {loading ? 'Memproses…' : confirmLabel}
          </Button>
        </>
      }
    >
      {typeof description !== 'string' && description}
      {children}
    </Modal>
  );
}
