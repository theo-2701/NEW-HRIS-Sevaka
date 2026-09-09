import type { ReactNode } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TableToolbarProps {
  /**
   * Kontrol filter. Standar rumah: ≤ 2 filter → kontrol inline di sini;
   * > 2 filter → satu tombol "Filter" yang membuka modal filter, plus
   * ringkasan filter aktif (`summary`).
   * Semua kontrol di toolbar bertinggi **40px** (`.doc-tbar`).
   */
  filters?: ReactNode;
  summary?: ReactNode;
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  /** Aksi kanan tambahan (mis. `<AddButton>`). */
  actions?: ReactNode;
  className?: string;
}

/**
 * Toolbar tabel — filter di KIRI, pencarian di KANAN (port `.doc-tbar`).
 * Jarak ke tabel hanya **8 px** supaya terbaca sebagai bagian dari tabel; bungkus
 * toolbar + tabel + paginasi dalam satu `<div>` agar `gap` induk tidak menambah
 * jarak itu.
 * Kotak cari mengikuti `.co-search`: 40px · min-width 260px · isi Cloud ·
 * border 1px Silver · ikon 16px · teks 13px/500.
 */
export function TableToolbar({ filters, summary, search, actions, className }: TableToolbarProps) {
  return (
    <div className={cn('mb-2 flex flex-wrap items-center gap-2.5', className)}>
      {filters}
      {summary && (
        <span className="max-w-[420px] truncate font-body text-xs font-medium text-fg-4">{summary}</span>
      )}
      <div className="flex-1" />
      {search && (
        <label className="inline-flex h-10 min-w-[260px] items-center gap-2 rounded-md border border-silver bg-cloud px-3.5 transition-[border-color,box-shadow] duration-200 ease-standard focus-within:border-secondary-500 focus-within:shadow-[0_0_0_4px_rgba(2,132,199,.16)]">
          <Search className="size-4 shrink-0 text-fg-3" />
          <input
            type="search"
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            placeholder={search.placeholder ?? 'Search here'}
            className="min-w-0 flex-1 border-none bg-transparent font-body text-[13px] font-medium leading-[1.4] text-fg-2 outline-none placeholder:text-fg-4"
          />
        </label>
      )}
      {actions}
    </div>
  );
}
