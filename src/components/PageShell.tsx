import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { House } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Crumb {
  label: string;
  to?: string;
}

/** Pemisah breadcrumb — port `.crumbs__sep`: garis miring Fog, bukan chevron. */
function CrumbSeparator() {
  return (
    <span aria-hidden="true" className="select-none font-body text-sm font-normal leading-none text-fog">
      /
    </span>
  );
}

/**
 * Breadcrumb standar — port `.crumbs`: jarak **8px** rata antar item dan
 * pemisah, item terakhir = halaman aktif (tebal). Setiap item yang bisa diklik
 * memakai garis bawah saat hover; item tanpa `to` hanya teks.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="mb-2.5 flex flex-wrap items-center gap-2" aria-label="Breadcrumb">
      <Link
        to="/"
        className="inline-flex items-center font-body text-[13px] font-semibold text-secondary-500 hover:text-secondary-800 hover:underline hover:underline-offset-[3px]"
      >
        <House className="size-4" />
        <span className="sr-only">Dashboard</span>
      </Link>
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <Fragment key={`${item.label}-${i}`}>
            <CrumbSeparator />
            {item.to && !last ? (
              <Link
                to={item.to}
                className="font-body text-[13px] font-semibold text-secondary-600 hover:text-secondary-800 hover:underline hover:underline-offset-[3px]"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={cn(
                  'font-body text-[13px]',
                  last ? 'font-bold text-secondary-800' : 'font-semibold text-secondary-600',
                )}
              >
                {item.label}
              </span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}

/**
 * Tautan "kembali ke layar sebelumnya" — standar `.crumb` design system:
 * teks 12/700 UPPERCASE Secondary-600, garis bawah saat hover, tanpa ikon.
 * Dipasang di atas judul halaman detail; dengan ini tidak perlu tombol
 * "Back" terpisah di bagian bawah.
 */
export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="mb-2.5 inline-block font-body text-xs font-bold uppercase leading-none tracking-[0.06em] text-secondary-600 transition-colors duration-200 ease-standard hover:text-secondary-800 hover:underline hover:underline-offset-[3px]"
    >
      {children}
    </Link>
  );
}

interface PageShellProps {
  crumbs?: Crumb[];
  title: string;
  description?: string;
  /** Aksi tingkat halaman — tombol TANPA ikon (kecuali pembuka dropdown). */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Kerangka halaman standar — port `.pg-shell` + `.crumbs`.
 * Semua halaman modul memakai ini supaya header, padding, dan radius seragam.
 */
export function PageShell({ crumbs, title, description, actions, children, className }: PageShellProps) {
  return (
    <div className={cn('overflow-hidden rounded-[14px] border border-border-1 bg-bg-surface shadow-card-sm', className)}>
      <header className="border-b border-border-1 px-[22px] pb-5 pt-[18px]">
        {crumbs && crumbs.length > 0 && <Breadcrumbs items={crumbs} />}
        {/* Aksi halaman sejajar dengan judul. Deskripsi dibatasi lebarnya supaya
            tidak mendorong tombol turun ke baris berikutnya. */}
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div className="min-w-0 flex-1 basis-[420px]">
            <h1 className="t-h2 m-0">{title}</h1>
            {description && (
              <p className="mt-1.5 max-w-[68ch] font-body text-[13px] font-medium text-fg-3">{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      </header>
      <div className="px-[22px] pb-[22px] pt-5">{children}</div>
    </div>
  );
}
