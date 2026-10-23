import { useLocation } from 'react-router-dom';
import { PageShell } from '@/components/PageShell';
import { EmptyState } from '@/components/Card';
import { findNavByPath } from '@/config/nav';

/**
 * Halaman sementara untuk route yang BELUM dikonversi dari prototype.
 * Router memasang ini otomatis untuk setiap leaf nav ber-`path` yang belum
 * punya komponen, jadi navigasi tetap hidup selama konversi berjalan.
 *
 * Cara mengganti: buat modul di `src/features/<modul>/`, daftarkan route-nya
 * di `src/app/routes.tsx`, lalu ubah `status` leaf terkait di
 * `src/config/nav.ts` menjadi `'done'`.
 */
export function PlaceholderPage() {
  const { pathname } = useLocation();
  const entry = findNavByPath(pathname);

  const title = entry?.label ?? 'Page not available yet';
  const crumbs = entry ? entry.trail.slice(0, -1).map((label) => ({ label })) : [];

  return (
    <PageShell crumbs={[...crumbs, { label: title }]} title={title} description={entry?.section}>
      <EmptyState
        title="This screen hasn't been converted to React yet"
        description={
          entry?.source
            ? `Prototype reference: _prototype/${entry.source}. Follow docs/UI-STANDARDS.md and the auth/dashboard module patterns when converting it.`
            : 'No prototype reference for this route yet.'
        }
      />
    </PageShell>
  );
}
