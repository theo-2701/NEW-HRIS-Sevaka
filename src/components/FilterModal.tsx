import type { ReactNode } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';

/**
 * Modal filter tabel — pasangan tombol "Filter" di toolbar.
 *
 * Standar rumah: **≤ 2 filter** boleh inline di toolbar; **3 filter atau lebih**
 * masuk ke sini supaya toolbar tidak penuh dan kotak cari tidak terdorong.
 * Pencarian TIDAK dihitung sebagai filter — tempatnya tetap di kanan toolbar.
 *
 * Filter berlaku seketika saat diubah, jadi footer-nya cuma "Reset" dan
 * "Done" — tidak ada tombol "Terapkan" yang menahan perubahan.
 */
export function FilterModal({
  open,
  title = 'Filter',
  description,
  onOpenChange,
  onReset,
  children,
}: {
  open: boolean;
  title?: string;
  description?: string;
  onOpenChange: (open: boolean) => void;
  onReset?: () => void;
  children: ReactNode;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <>
          {onReset && (
            <Button variant="secondary" onClick={onReset}>
              Reset
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">{children}</div>
    </Modal>
  );
}
