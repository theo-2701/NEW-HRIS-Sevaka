import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Tombol SEVAKA — port dari `.btn` (`_prototype/css/app.css`).
 * Ingat aturan ikon: tombol TANPA ikon secara default. Ikon hanya untuk
 * (1) tombol yang membuka dropdown → caret `chevron-down` di kanan, dan
 * (2) tombol "Add …" di dalam form → `+` di kiri.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-body text-sm font-bold tracking-[0.01em] transition-[background,box-shadow,color,filter] duration-200 ease-standard outline-none focus-visible:ring-4 focus-visible:ring-secondary-500/20 disabled:pointer-events-none disabled:bg-fog disabled:text-fg-4 disabled:shadow-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'text-cloud [background:var(--bg-primary-btn)] [box-shadow:var(--shadow-primary)] hover:[background:var(--bg-primary-btn-hover)] hover:[box-shadow:var(--shadow-primary-hover)] active:[background:var(--bg-primary-btn-press)] active:[box-shadow:var(--shadow-primary-press)]',
        secondary:
          'bg-cloud text-secondary-700 shadow-inset-rim hover:bg-vapor hover:[box-shadow:var(--shadow-inset-rim-brand)] active:bg-primary-200 active:[box-shadow:var(--shadow-press)]',
        danger:
          'text-white [background:var(--bg-danger-btn)] [box-shadow:var(--shadow-danger)] hover:[background:var(--bg-danger-btn-hover)] hover:[box-shadow:var(--shadow-danger-hover)] active:[background:var(--bg-danger-btn-press)] active:[box-shadow:var(--shadow-danger-press)]',
        ghost:
          'min-w-0 bg-transparent px-1.5 tracking-normal text-secondary-700 shadow-none hover:text-secondary-850 hover:underline active:text-secondary-950',
        light: 'bg-white/15 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,.4)] hover:bg-white/25',
      },
      /**
       * Hanya dua ukuran. Tangga tinggi kontrol SEVAKA:
       * 40px "Add …" · **36px tombol & field** · 32px kontrol paginasi ·
       * 30px tombol di dalam baris tabel · 28px pil tab.
       * Butuh ukuran lain? Pakai komponen khususnya (`RowButton`, `AddButton`),
       * jangan menambah varian di sini.
       */
      size: {
        default: 'h-9 min-w-[120px] px-4 py-1.5',
        icon: 'size-9 min-w-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { Button, buttonVariants };
