import type { ReactNode } from 'react';
import { ChevronDown, CirclePlus, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface RowAction {
  label: string;
  icon?: ReactNode;
  onSelect?: () => void;
  danger?: boolean;
  disabled?: boolean;
}

/** Kelas dasar tombol di dalam baris tabel — `.rowbtn` / `.rowmenu__trigger`. */
const ROW_CONTROL =
  'inline-flex h-[30px] items-center gap-1.5 whitespace-nowrap rounded-md border border-fog bg-white px-3 font-body text-[11.5px] font-bold leading-none text-secondary-700 shadow-inset-rim transition-[background,box-shadow,color] duration-200 ease-standard hover:bg-vapor hover:[box-shadow:var(--shadow-press)] [&_svg]:size-3.5';

/**
 * Tombol aksi inline dalam baris tabel — port `.rowbtn`:
 * **30px** · border 1px Fog + `shadow-inset-rim` · 11.5px/700 Secondary-700 ·
 * ikon 14px · hover Vapor + soft-press.
 * Teks saja, tanpa ikon. Label detail selalu "View Detail".
 */
export function RowButton({
  children,
  variant = 'default',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'ghost' | 'danger' }) {
  return (
    <button
      type="button"
      className={cn(
        ROW_CONTROL,
        variant === 'ghost' && 'border-transparent bg-transparent px-2 shadow-none hover:bg-mist',
        variant === 'danger' && 'text-error-600 hover:bg-error-50 hover:text-error-700',
        'disabled:cursor-not-allowed disabled:bg-fog disabled:text-fg-4 disabled:shadow-none',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * Dropdown "Action ▾" untuk baris dengan ≥ 2 aksi — port `.rowmenu__trigger`
 * (padanan `F.rowMenu()`). Satu aksi TIDAK memakai komponen ini; pakai
 * `<RowButton>` tunggal.
 */
export function RowActions({ actions, label = 'Action' }: { actions: RowAction[]; label?: string }) {
  if (actions.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={cn(ROW_CONTROL, 'pl-3 pr-2.5')}>
          {label}
          <ChevronDown />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {actions.map((action) => (
          <DropdownMenuItem
            key={action.label}
            danger={action.danger}
            disabled={action.disabled}
            onSelect={action.onSelect}
          >
            {action.icon}
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Tombol "Action ▾" tingkat panel/toolbar — port `.action-btn`:
 * **36px** · putih + `shadow-inset-rim` · 13px/700 Secondary-700 · chevron 14px.
 * Beda dari `<RowActions>` yang 30px karena dipakai di luar baris tabel.
 */
export function PanelActionButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-white px-4 font-body text-[13px] font-bold leading-none text-secondary-700 shadow-inset-rim transition-[background,box-shadow] duration-200 ease-standard hover:bg-vapor hover:[box-shadow:var(--shadow-press)] [&_svg]:size-3.5',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * Tombol "Add …" — SATU standar di seluruh app (`.add-filter`): **40px**, putih +
 * inset-rim, 14px/700 Secondary-700, ikon **outline circle-plus** 18px di kiri
 * (bukan kotak solid), hover soft-press.
 */
export function AddButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-10 items-center gap-2 rounded-md bg-white px-[18px] font-body text-sm font-bold leading-none text-secondary-700 shadow-inset-rim transition-[background,box-shadow] duration-200 ease-standard hover:bg-vapor hover:[box-shadow:var(--shadow-press)]',
        className,
      )}
      {...props}
    >
      <CirclePlus className="size-[18px] shrink-0 text-secondary-500" />
      {children}
    </button>
  );
}

/**
 * Ghost "hapus baris" (`.pc-delrow`): **32px** transparan, "×" 16px Silver yang
 * berubah Error-600 di atas tint Error-50. Ini afordans hapus baris —
 * bukan tombol destruktif merah.
 */
export function RemoveRowButton({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label="Hapus baris"
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-md bg-transparent text-silver transition-colors duration-200 ease-standard hover:bg-error-50 hover:text-error-600 [&_svg]:size-4',
        className,
      )}
      {...props}
    >
      <X />
    </button>
  );
}
