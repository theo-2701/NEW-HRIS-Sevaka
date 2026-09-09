import type { ReactNode } from 'react';
import { ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T, index: number) => ReactNode;
  /** mis. `w-[220px]` atau `min-w-[160px]`. */
  width?: string;
  align?: 'left' | 'center' | 'right';
  /** Isi bila kolom bisa diurutkan — nilainya dikirim ke `onSortChange`. */
  sortKey?: string;
  /** Kolom sekunder — teks Steel (padanan `.cell-dim`). */
  muted?: boolean;
  /** Kolom penekanan — teks tebal Obsidian (padanan `.cell-strong`). */
  strong?: boolean;
  /** Paksa satu baris. Otomatis aktif untuk semua kolom saat tabel dibekukan. */
  nowrap?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  /**
   * Aksi baris. Bila diisi, tabel memakai varian `.dtable-wrap--act`:
   *  • kolom pertama (identifier) dibekukan ke KIRI
   *  • kolom aksi dibekukan ke KANAN, header-nya SENGAJA kosong
   *  • sel beku bertint Sky-50 dan semua sel jadi satu baris
   * Bila kosong, tabel hanya scroll horizontal biasa (padanan `--plain`).
   * Ingat: 1 aksi → satu `<RowButton>`; ≥2 aksi → satu `<RowActions>` "Action ▾".
   */
  actions?: (row: T, index: number) => ReactNode;
  empty?: ReactNode;
  loading?: boolean;
  /** Kolom & arah urutan yang sedang aktif (dipasangkan dengan `sortKey`). */
  sort?: { by: string; dir: 'ASC' | 'DESC' };
  /** Dipanggil saat header kolom ber-`sortKey` diklik. */
  onSortChange?: (sortKey: string) => void;
  className?: string;
}

const alignClass = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
} as const;

/**
 * Tabel data standar SEVAKA — port `.dtable` (`_prototype/css/employee-flows.css`)
 * + `_design-system/table-standard.css`:
 *
 *  • kontainer : border 1px Fog · radius 12px · overflow hidden
 *  • header    : gradien Sky `#9bd5ef → #8ccbe9` · teks PUTIH 14px/700 · padding 13/16 · nowrap
 *  • sel       : padding 13/16 · 13px/500 line-height 1.4 · Obsidian · garis bawah Vapor
 *  • baris akhir tanpa garis; hover baris → Mist
 *  • beku      : sel identifier & aksi bertint Sky-50, rim 1px Fog, hover Sky-100
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  actions,
  empty = 'Belum ada data.',
  loading = false,
  sort,
  onSortChange,
  className,
}: DataTableProps<T>) {
  const frozen = Boolean(actions);
  const colSpan = columns.length + (actions ? 1 : 0);

  return (
    <div
      className={cn(
        'scroll-thin rounded-lg border border-border-1 bg-bg-surface',
        frozen ? 'overflow-x-auto' : 'overflow-hidden',
        className,
      )}
    >
      <table className={cn('border-collapse', frozen ? 'w-max min-w-full' : 'w-full')}>
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  'z-[5] whitespace-nowrap bg-[linear-gradient(180deg,#9bd5ef_0%,#8ccbe9_100%)] px-4 py-[13px] font-body text-sm font-bold leading-[1.2] text-white',
                  alignClass[col.align ?? 'left'],
                  col.width,
                  frozen && i === 0 && 'sticky left-0 z-[7] shadow-[inset_-1px_0_0_rgba(255,255,255,.4)]',
                  col.className,
                )}
                aria-sort={
                  col.sortKey && sort?.by === col.sortKey
                    ? sort.dir === 'ASC'
                      ? 'ascending'
                      : 'descending'
                    : undefined
                }
              >
                {col.sortKey && onSortChange ? (
                  <button
                    type="button"
                    onClick={() => onSortChange(col.sortKey!)}
                    className="inline-flex items-center gap-1.5 font-[inherit] tracking-[inherit] text-inherit"
                  >
                    {col.header}
                    <ChevronsUpDown
                      className={cn('size-3.5', sort?.by === col.sortKey ? 'opacity-100' : 'opacity-60')}
                    />
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
            {actions && (
              /* Header kolom Action sengaja dikosongkan (standar rumah). */
              <th
                scope="col"
                className="sticky right-0 z-[7] w-px whitespace-nowrap bg-[linear-gradient(180deg,#9bd5ef_0%,#8ccbe9_100%)] px-4 py-[13px] shadow-[inset_1px_0_0_rgba(255,255,255,.4)]"
              >
                <span className="sr-only">Aksi</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={colSpan} className="px-4 py-10 text-center font-body text-[13px] font-medium text-fg-3">
                Memuat data…
              </td>
            </tr>
          )}

          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={colSpan} className="px-4 py-10 text-center font-body text-[13px] font-medium text-fg-3">
                {empty}
              </td>
            </tr>
          )}

          {!loading &&
            rows.map((row, index) => (
              <tr key={rowKey(row, index)} className="group last:[&>td]:border-b-0">
                {columns.map((col, i) => (
                  <td
                    key={col.key}
                    className={cn(
                      'border-b border-vapor px-4 py-[13px] align-middle font-body text-[13px] font-medium leading-[1.4] text-fg-1 transition-colors group-hover:bg-mist',
                      alignClass[col.align ?? 'left'],
                      col.muted && 'text-fg-3',
                      col.strong && 'font-bold',
                      (col.nowrap || frozen) && 'whitespace-nowrap',
                      col.className,
                      frozen &&
                        i === 0 &&
                        'sticky left-0 z-[4] bg-primary-50 shadow-[inset_-1px_0_0_var(--color-border-1)] group-hover:bg-primary-100',
                    )}
                  >
                    {col.render(row, index)}
                  </td>
                ))}
                {actions && (
                  <td className="sticky right-0 z-[4] whitespace-nowrap border-b border-vapor bg-primary-50 px-4 py-[13px] align-middle shadow-[inset_1px_0_0_var(--color-border-1)] transition-colors group-hover:bg-primary-100">
                    <div className="flex items-center justify-end gap-1.5">{actions(row, index)}</div>
                  </td>
                )}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

/** Baris identitas dalam sel (nama + sub-teks) — port `.table-row-id`. */
export function CellIdentity({ name, sub, leading }: { name: ReactNode; sub?: ReactNode; leading?: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      {leading}
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate font-body text-[13px] font-bold leading-tight text-fg-1">{name}</span>
        {sub && <span className="truncate font-body text-[11px] font-medium leading-tight text-fg-3">{sub}</span>}
      </div>
    </div>
  );
}

/** Tautan identifier di dalam sel — port `.co-link` (Ocean 700, underline saat hover). */
export function CellLink({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-body text-[13px] font-bold text-fg-link hover:underline"
    >
      {children}
    </button>
  );
}
