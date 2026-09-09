import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  /**
   * Tombol footer. Aturan rumah: bila ada 2 tombol, keduanya berdampingan
   * rata KANAN-BAWAH — jangan pakai space-between.
   */
  footer?: ReactNode;
  /** `wide` = 720px (default 540px), sesuai `.ovl__panel--wide`. */
  size?: 'default' | 'wide';
  className?: string;
}

/**
 * Modal standar SEVAKA — port `.ovl` (`_prototype/css/employee-flows.css`):
 *  • header bertint `primary-50` (judul + deskripsi + X) dengan divider di bawah
 *  • HANYA body yang scroll; panel `overflow-hidden` supaya sudut tetap membulat
 *  • footer mist dengan divider di atas, tombol rata kanan
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'default',
  className,
}: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(size === 'wide' && 'max-w-[720px]', className)}>
        <header className="flex flex-shrink-0 items-start gap-3.5 border-b border-border-1 bg-primary-50 px-6 py-5">
          <div className="min-w-0">
            <DialogTitle className="t-h3 m-0 tracking-[-0.01em]">{title}</DialogTitle>
            {description && (
              <DialogDescription className="mt-1 font-body text-[12.5px] font-medium leading-normal text-fg-3">
                {description}
              </DialogDescription>
            )}
          </div>
          <DialogClose
            aria-label="Tutup"
            className="ml-auto inline-flex size-[34px] flex-shrink-0 items-center justify-center rounded-md text-fg-3 transition-colors duration-150 ease-standard hover:bg-vapor hover:text-fg-1"
          >
            <X className="size-5" />
          </DialogClose>
        </header>

        <div className="scroll-thin flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5 [&>*]:flex-shrink-0">
          {children}
        </div>

        {footer && (
          <footer className="flex flex-shrink-0 justify-end gap-3 border-t border-border-1 bg-mist px-6 py-4">
            {footer}
          </footer>
        )}
      </DialogContent>
    </Dialog>
  );
}
