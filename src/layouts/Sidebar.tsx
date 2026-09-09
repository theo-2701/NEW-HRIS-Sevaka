import { useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Check, ChevronDown, LayoutGrid, LogOut, PanelLeft, Plus } from 'lucide-react';
import { NAV, type NavLeaf, type NavSection } from '@/config/nav';
import { NavIcon } from '@/components/NavIcon';
import { useAuthStore, type Company } from '@/store/auth.store';
import { cn } from '@/lib/utils';

/** Multi-tenant: satu akun bisa memegang beberapa perusahaan (port `COMPANIES`). */
const COMPANIES: Company[] = [
  { id: 'DIKA', short: 'DK', name: 'PT DIKA', sub: '1.284 karyawan', color: '#0284c7' },
  { id: 'BAHARI', short: 'BH', name: 'PT Bahari Logistik', sub: '642 karyawan', color: '#0e9488' },
  { id: 'SINAR', short: 'SA', name: 'PT Sinar Agro Lestari', sub: '389 karyawan', color: '#d97706' },
];

interface SidebarProps {
  expanded: boolean;
  onToggle: () => void;
}

/**
 * Sidebar — port `js/shell.js` + `css/dashboard.css`.
 * Collapsed 84px (hanya baris depth-1 sebagai ikon 44×44) ↔ expanded 264px
 * (label section, grup accordion, guide line per level).
 */
export function Sidebar({ expanded, onToggle }: SidebarProps) {
  const location = useLocation();
  const [companyOpen, setCompanyOpen] = useState(false);
  const companyId = useAuthStore((s) => s.companyId);
  const setCompany = useAuthStore((s) => s.setCompany);
  const active = COMPANIES.find((c) => c.id === companyId) ?? COMPANIES[0];

  const dashboardActive = location.pathname === '/';

  return (
    <aside
      className={cn(
        'sticky top-16 z-20 flex h-[calc(100vh-var(--topnav-h))] flex-col overflow-hidden border-r border-border-1 bg-bg-surface transition-[width,min-width] duration-300 ease-standard',
        expanded ? 'w-[264px] min-w-[264px]' : 'w-[84px] min-w-[84px]',
      )}
    >
      {/* ---- Header: company switcher + toggle ---- */}
      <div
        className={cn(
          'relative flex min-h-16 flex-shrink-0 items-center gap-1.5 border-b border-border-1 p-2.5',
          expanded ? 'justify-between p-3' : 'justify-center',
        )}
      >
        <div className={cn('relative min-w-0', expanded && 'flex-1')}>
          <button
            type="button"
            title="Ganti perusahaan"
            onClick={() => setCompanyOpen((v) => !v)}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-[10px] border-none bg-transparent text-left transition-colors duration-200 ease-standard hover:bg-bg-app',
              expanded ? 'p-1.5' : 'justify-center p-0',
              companyOpen && 'bg-bg-app',
            )}
          >
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-[9px] font-body text-[13px] font-extrabold leading-none tracking-[0.02em] text-white shadow-card-sm"
              style={{ background: active.color }}
            >
              {active.short}
            </span>
            {expanded && (
              <>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate font-body text-[13px] font-bold leading-tight text-fg-1">{active.name}</span>
                  <span className="font-body text-[11px] font-medium leading-tight text-fg-3">{active.sub}</span>
                </span>
                <ChevronDown
                  className={cn(
                    'size-[15px] shrink-0 text-fg-3 transition-transform duration-200 ease-standard',
                    companyOpen && 'rotate-180 text-secondary-500',
                  )}
                />
              </>
            )}
          </button>

          {companyOpen && (
            <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[60] rounded-xl border border-border-1 bg-bg-surface p-1.5 shadow-overlay">
              <div className="px-2.5 pb-1.5 pt-2 t-label text-fg-4">Perusahaan Anda</div>
              {COMPANIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setCompany(c.id);
                    setCompanyOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-md p-2 text-left hover:bg-bg-app',
                    c.id === active.id && 'bg-primary-200',
                  )}
                >
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-md font-body text-xs font-extrabold text-white"
                    style={{ background: c.color }}
                  >
                    {c.short}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate font-body text-[13px] font-bold leading-tight text-fg-1">{c.name}</span>
                    <span className="font-body text-[11px] font-medium leading-snug text-fg-3">{c.sub}</span>
                  </span>
                  {c.id === active.id && <Check className="size-4 shrink-0 text-secondary-500" />}
                </button>
              ))}
              <div className="mt-1 border-t border-border-1 pt-1">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2.5 font-body text-xs font-semibold text-secondary-700 hover:bg-bg-app"
                >
                  <Plus className="size-4" />
                  Tambah Perusahaan
                </button>
              </div>
            </div>
          )}
        </div>

        {expanded && (
          <button
            type="button"
            aria-label="Tutup sidebar"
            onClick={onToggle}
            className="flex size-10 items-center justify-center rounded-md text-fg-3 transition-colors duration-200 ease-standard hover:bg-bg-app hover:text-secondary-700"
          >
            <PanelLeft className="size-5" />
          </button>
        )}
      </div>

      {/* ---- Dashboard tile ---- */}
      <NavLink
        to="/"
        onClick={() => !expanded && onToggle()}
        className={cn(
          'relative flex items-center gap-2 rounded-[10px] font-body text-sm font-bold capitalize leading-snug tracking-[0.04em] transition-[background,color,box-shadow] duration-200 ease-standard',
          expanded ? 'mx-4 mb-3 mt-4 h-12 px-[18px]' : 'mx-auto mb-2 mt-3 size-11 justify-center p-0',
          dashboardActive
            ? 'text-white [background:var(--bg-primary-btn)] [box-shadow:var(--shadow-primary)]'
            : 'border border-border-1 bg-bg-surface text-secondary-700 shadow-card-sm hover:bg-bg-app',
        )}
      >
        {expanded && <span className="flex-1 text-left">Dashboard</span>}
        <LayoutGrid className={cn('shrink-0', expanded ? 'size-5' : 'size-[22px]')} />
      </NavLink>

      {/* ---- Nav tree ---- */}
      <nav
        className={cn(
          'scroll-thin flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden pb-3 pt-1',
          expanded ? 'px-4' : 'px-2',
        )}
      >
        {NAV.map((section, i) => (
          <SidebarSection key={section.section} section={section} expanded={expanded} first={i === 0} />
        ))}
      </nav>

      {/* ---- Footer ---- */}
      <footer
        className={cn(
          'flex flex-shrink-0 items-center gap-2 border-t border-border-1 p-3',
          expanded ? 'justify-between' : 'justify-center',
        )}
      >
        <button
          type="button"
          aria-label="Keluar"
          className="flex size-9 items-center justify-center rounded-md text-fg-3 transition-colors duration-200 ease-standard hover:bg-bg-app hover:text-error-700"
        >
          <LogOut className="size-[18px]" />
        </button>
        {expanded && <span className="font-body text-[11px] font-medium text-fg-4">Company ID: {active.id}</span>}
      </footer>
    </aside>
  );
}

function SidebarSection({
  section,
  expanded,
  first,
}: {
  section: NavSection;
  expanded: boolean;
  first: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col',
        !expanded && !first && 'mt-1.5 border-t border-border-1 pt-1.5',
      )}
    >
      {expanded && (
        <div className={cn('px-3 pb-1.5 font-body text-sm font-medium text-[#90A1B9]', first ? 'pt-1.5' : 'pt-4')}>
          {section.section}
        </div>
      )}
      {section.children.map((node) => (
        <SidebarNode key={node.label} node={node} depth={1} expanded={expanded} />
      ))}
    </div>
  );
}

function SidebarNode({ node, depth, expanded }: { node: NavLeaf; depth: number; expanded: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const hasKids = Boolean(node.children?.length);

  /** Grup terbuka otomatis bila salah satu turunannya adalah halaman aktif. */
  const containsActive = useMemo(() => {
    const walk = (n: NavLeaf): boolean => {
      if (n.path && n.path === location.pathname) return true;
      return (n.children ?? []).some(walk);
    };
    return (node.children ?? []).some(walk);
  }, [node, location.pathname]);

  const [open, setOpen] = useState(containsActive);
  const isOpen = open || containsActive;

  if (!expanded && depth > 1) return null;

  if (hasKids) {
    return (
      <div className="flex flex-col">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'inline-flex w-full items-center gap-2.5 overflow-hidden whitespace-nowrap rounded-md border-none bg-transparent text-left font-body text-sm font-bold capitalize tracking-[0.04em] text-secondary-700 transition-colors duration-200 ease-standard hover:bg-secondary-700/[0.07]',
            expanded ? 'min-h-11 px-3 py-1.5' : 'mx-auto my-0.5 size-11 justify-center p-0',
          )}
        >
          <NavIcon name={node.icon} className={cn('shrink-0', expanded ? 'size-5' : 'size-[22px]')} />
          {expanded && (
            <>
              <span className="flex-1 overflow-hidden text-ellipsis">{node.label}</span>
              <ChevronDown
                className={cn(
                  'size-[18px] shrink-0 text-[#90A1B9] transition-transform duration-200 ease-standard',
                  isOpen && 'rotate-180 text-secondary-700',
                )}
              />
            </>
          )}
        </button>
        {expanded && isOpen && (
          <div className="ml-[26px] flex flex-col border-l-[1.5px] border-secondary-700/20 pl-0.5">
            {node.children!.map((child) => (
              <SidebarNode key={child.label} node={child} depth={depth + 1} expanded={expanded} />
            ))}
          </div>
        )}
      </div>
    );
  }

  /* Leaf tanpa route = placeholder menu di kontrak; tampil tapi tidak bisa diklik. */
  if (!node.path) {
    return (
      <span
        className={cn(
          'inline-flex w-full cursor-default items-center gap-2.5 overflow-hidden whitespace-nowrap rounded-md px-3 py-1.5 font-body text-sm text-fg-4',
          expanded ? 'min-h-10' : 'mx-auto my-0.5 size-11 justify-center p-0',
        )}
        title="Belum ada halaman"
      >
        <NavIcon name={node.icon} className={cn('shrink-0', expanded ? 'size-5' : 'size-[22px]')} />
        {expanded && <span className="flex-1 overflow-hidden text-ellipsis">{node.label}</span>}
      </span>
    );
  }

  const isOn = location.pathname === node.path;

  return (
    <button
      type="button"
      onClick={() => navigate(node.path!)}
      className={cn(
        'inline-flex w-full items-center gap-2.5 overflow-hidden whitespace-nowrap rounded-md border-none bg-transparent text-left font-body text-sm font-medium text-secondary-700 transition-colors duration-200 ease-standard hover:bg-secondary-700/[0.07]',
        expanded ? 'min-h-10 px-3 py-1.5' : 'mx-auto my-0.5 size-11 justify-center p-0',
        depth === 1 && 'min-h-11 font-bold',
        isOn &&
          depth > 1 &&
          '-ml-0.5 rounded-l-none pl-3.5 text-cloud [background:linear-gradient(90deg,#026A9F_0%,#026A9F_34%,rgba(2,106,159,0)_100%)] hover:text-cloud',
        isOn &&
          depth === 1 &&
          'text-white [background:var(--bg-primary-btn)] [box-shadow:var(--shadow-primary)] hover:text-white',
      )}
    >
      <NavIcon name={node.icon} className={cn('shrink-0', expanded ? 'size-5' : 'size-[22px]')} />
      {expanded && <span className="flex-1 overflow-hidden text-ellipsis">{node.label}</span>}
    </button>
  );
}
