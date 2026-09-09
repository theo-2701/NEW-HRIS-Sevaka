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

  const title = entry?.label ?? 'Halaman belum tersedia';
  const crumbs = entry ? entry.trail.slice(0, -1).map((label) => ({ label })) : [];

  return (
    <PageShell crumbs={[...crumbs, { label: title }]} title={title} description={entry?.section}>
      <EmptyState
        title="Layar ini belum dikonversi ke React"
        description={
          entry?.source
            ? `Acuan prototype: _prototype/${entry.source}. Ikuti docs/UI-STANDARDS.md dan pola modul auth/dashboard saat mengonversinya.`
            : 'Belum ada acuan prototype untuk route ini.'
        }
      />
    </PageShell>
  );
}
