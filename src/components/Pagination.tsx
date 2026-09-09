import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizes?: number[];
  /** Kata benda untuk teks "Showing 1–10 of 42 records". */
  noun?: string;
  className?: string;
}

/**
 * Footer paginasi rumah — port `.ph-foot` (`css/pagination-standard.css`).
 * Kiri: "Showing x–y of n" + pemilih baris/halaman. Kanan: ‹ / kotak halaman /
 * "of N" / ›. Jangan bikin markup pager sendiri dan jangan pakai `.pagination`.
 */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizes = [10, 25, 50, 100],
  noun = 'records',
  className,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className={cn('mt-2 flex flex-wrap items-center justify-between gap-4', className)}>
      <div className="flex items-center gap-3 font-body text-[13px] font-medium leading-none text-fg-3">
        <span>
          Showing {from}–{to} of {total} {noun}
        </span>
        <span className="relative inline-flex items-center">
          <select
            aria-label="Rows per page"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-8 appearance-none rounded-md bg-white pl-3 pr-8 font-body text-[13px] font-semibold leading-none text-fg-1 shadow-inset-rim outline-none"
          >
            {pageSizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 size-4 text-fg-3" />
        </span>
        <span>rows / page</span>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Halaman sebelumnya"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex size-8 items-center justify-center rounded-md text-fg-2 transition-colors duration-200 ease-standard enabled:hover:bg-mist enabled:hover:text-secondary-700 disabled:cursor-not-allowed disabled:text-fg-4"
        >
          <ChevronLeft className="size-[18px]" />
        </button>
        <span className="inline-flex h-8 min-w-9 items-center justify-center rounded-md bg-white px-3.5 font-body text-[13px] font-bold leading-none text-fg-1 shadow-inset-rim">
          {page}
        </span>
        <span className="mx-1.5 font-body text-[13px] font-medium leading-none text-fg-3">of {totalPages}</span>
        <button
          type="button"
          aria-label="Halaman berikutnya"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex size-8 items-center justify-center rounded-md text-fg-2 transition-colors duration-200 ease-standard enabled:hover:bg-mist enabled:hover:text-secondary-700 disabled:cursor-not-allowed disabled:text-fg-4"
        >
          <ChevronRight className="size-[18px]" />
        </button>
      </div>
    </div>
  );
}
