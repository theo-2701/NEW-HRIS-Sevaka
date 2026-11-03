import { Link, Navigate, useParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead } from '@/components/Card';
import { NavIcon } from '@/components/NavIcon';
import { NAV_SETTINGS } from '@/config/nav';
import type { NavLeaf, SettingsSection } from '@/config/nav';

/** Leaf ber-path di dalam satu section (grup bersarang seperti System Log diratakan). */
function links(nodes: NavLeaf[]): NavLeaf[] {
  return nodes.flatMap((node) => (node.children ? links(node.children) : [node]));
}

function SectionCard({ section, wide }: { section: SettingsSection; wide?: boolean }) {
  return (
    <Card className={wide ? 'md:col-span-2' : undefined}>
      <CardHead
        title={
          wide ? (
            section.section
          ) : (
            <Link to={`/settings/${section.slug}`} className="hover:text-secondary-700 hover:underline">
              {section.section}
            </Link>
          )
        }
        sub={section.blurb}
      />
      <ul className="m-0 flex list-none flex-col p-0">
        {links(section.children).map((leaf) =>
          leaf.path ? (
            <li key={leaf.label}>
              <Link
                to={leaf.path}
                className="flex items-center gap-2.5 rounded-md px-2 py-2 font-body text-[13px] font-semibold text-secondary-700 transition-colors duration-200 ease-standard hover:bg-mist"
              >
                <NavIcon name={leaf.icon ?? 'settings'} className="size-4 shrink-0 text-fg-3" />
                <span className="flex-1">{leaf.label}</span>
                <ChevronRight className="size-4 text-fg-4" strokeWidth={1.75} />
              </Link>
            </li>
          ) : (
            <li
              key={leaf.label}
              className="flex items-center gap-2.5 px-2 py-2 font-body text-[13px] font-medium text-fg-4"
              title="No page yet"
            >
              <NavIcon name={leaf.icon ?? 'settings'} className="size-4 shrink-0" />
              <span className="flex-1">{leaf.label}</span>
              <span className="text-xs">Soon</span>
            </li>
          ),
        )}
      </ul>
    </Card>
  );
}

/**
 * Beranda Settings — `/settings` (semua modul) dan `/settings/:module` (satu modul). Master & setting
 * dipisah dari pekerjaan harian HR (keputusan Theo 3 Nov 2026, pola Talenta). Isinya dibaca dari
 * `NAV_SETTINGS`, jadi menambah setting cukup satu leaf di `nav.ts`.
 */
export function SettingsHomePage() {
  const { module } = useParams();
  const section = NAV_SETTINGS.find((row) => row.slug === module);
  if (module && !section) return <Navigate to="/settings" replace />;

  return (
    <PageShell
      crumbs={section ? [{ label: 'Settings', to: '/settings' }, { label: section.section }] : [{ label: 'Settings' }]}
      title={section ? `${section.section} settings` : 'Settings'}
      description={
        section
          ? section.blurb
          : 'Master data and rules that set how each module works. Usually managed by an administrator, not in day-to-day HR work.'
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {section ? (
          <SectionCard section={section} wide />
        ) : (
          NAV_SETTINGS.map((row) => <SectionCard key={row.slug} section={row} />)
        )}
      </div>
    </PageShell>
  );
}
