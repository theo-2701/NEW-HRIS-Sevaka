import { createContext, useContext, useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LayoutGrid, LogOut, PanelLeftClose } from 'lucide-react';
import dikaLogo from '@/assets/brand/dika-logo-trim.png';
import { CompanyLogo } from '@/components/brand/CompanyLogo';
import { NAV, type NavLeaf, type NavSection } from '@/config/nav';
import { NavIcon } from '@/components/NavIcon';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

interface SidebarProps {
  expanded: boolean;
  onToggle: () => void;
}

/** Identitas perusahaan pemakai (pengganti switch company). */
const COMPANY_IDENTITY: Record<string, { name: string; sub: string; logo: string | null }> = {
  DIKA: { name: 'PT DIKA', sub: '1.284 karyawan', logo: dikaLogo },
};

/**
 * Permintaan membuka grup tertentu — dipakai saat ikon grup di sidebar ciut diklik: sidebar melebar,
 * section-nya terbuka, dan drop list grup itu langsung terbuka.
 */
const OpenRequest = createContext<string | null>(null);

const containsPath = (node: NavLeaf, path: string): boolean =>
  node.path === path || (node.children ?? []).some((child) => containsPath(child, path));

/** Pudar tipis di tepi atas/bawah area gulir — scrollbar disembunyikan, isi tetap terasa bisa digulir. */
const SCROLL_FADE = '[mask-image:linear-gradient(to_bottom,transparent,black_8px,black_calc(100%-20px),transparent)]';

/**
 * Sidebar — port `js/shell.js` + `css/dashboard.css`, dirapikan supaya tidak terlalu panjang:
 * - Identitas perusahaan pemakai (logo, nama, jumlah karyawan) + tombol collapse; switch company dihapus.
 *   Saat ciut, logo perusahaan sendiri yang menjadi tombol untuk melebarkan sidebar.
 * - Section bisa dilipat, **buka satu tutup satu**; grup di dalamnya juga akordeon antar-saudara.
 *   Isi section menjorok dengan garis pandu supaya hierarkinya tetap terbaca.
 * - Label yang terpotong tampil utuh saat di-hover; area menu digulir tanpa scrollbar.
 * Pohon menunya sendiri tidak berubah — hanya cara menampilkannya.
 * Collapsed 84px (hanya baris depth-1 sebagai ikon 44×44) ↔ expanded 264px.
 */
export function Sidebar({ expanded, onToggle }: SidebarProps) {
  const location = useLocation();
  const companyId = useAuthStore((s) => s.companyId) ?? 'DIKA';
  const company = COMPANY_IDENTITY[companyId] ?? { name: companyId, sub: '', logo: null };

  const activeSection = NAV.find((section) =>
    section.children.some((node) => containsPath(node, location.pathname)),
  )?.section;
  const [openSection, setOpenSection] = useState<string | null>(activeSection ?? null);
  const [requested, setRequested] = useState<string | null>(null);
  useEffect(() => {
    if (activeSection) setOpenSection(activeSection);
  }, [activeSection]);
  // Permintaan buka-grup hanya berlaku sekali; pindah halaman menghapusnya.
  useEffect(() => {
    setRequested(null);
  }, [location.pathname]);

  /** Ikon grup di sidebar ciut: lebarkan sidebar lalu buka section + drop list grup itu. */
  const openFromRail = (section: string, label: string) => {
    setOpenSection(section);
    setRequested(label);
    onToggle();
  };

  const dashboardActive = location.pathname === '/';

  return (
    <aside
      className={cn(
        'sticky top-16 z-20 flex h-[calc(100vh-var(--topnav-h))] flex-col overflow-hidden border-r border-border-1 bg-bg-surface transition-[width,min-width] duration-300 ease-standard',
        expanded ? 'w-[264px] min-w-[264px]' : 'w-[84px] min-w-[84px]',
      )}
    >
      {/* ---- Header: identitas perusahaan + collapse ---- */}
      {expanded ? (
        <div className="flex min-h-16 flex-shrink-0 items-center gap-2 border-b border-border-1 py-3 pl-3.5 pr-2">
          <CompanyLogo name={company.name} src={company.logo} size="md" framed={false} />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span title={company.name} className="truncate font-body text-[13px] font-bold leading-tight text-fg-1">
              {company.name}
            </span>
            {company.sub && (
              <span title={company.sub} className="truncate font-body text-[11px] font-medium leading-tight text-fg-3">
                {company.sub}
              </span>
            )}
          </span>
          <button
            type="button"
            aria-label="Tutup sidebar"
            title="Tutup sidebar"
            onClick={onToggle}
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-fg-3 transition-colors duration-200 ease-standard hover:bg-bg-app hover:text-secondary-700"
          >
            <PanelLeftClose className="size-[18px]" strokeWidth={1.75} />
          </button>
        </div>
      ) : (
        <div className="flex flex-shrink-0 justify-center border-b border-border-1 px-2 py-3">
          <button
            type="button"
            aria-label="Buka sidebar"
            title={`${company.name} — buka sidebar`}
            onClick={onToggle}
            className="flex items-center justify-center rounded-lg p-1.5 transition-[background,transform] duration-200 ease-standard hover:scale-[1.04] hover:bg-bg-app"
          >
            <CompanyLogo name={company.name} src={company.logo} size="sm" framed={false} />
          </button>
        </div>
      )}

      {/* ---- Dashboard tile ---- */}
      <NavLink
        to="/"
        title={expanded ? undefined : 'Dashboard'}
        onClick={() => !expanded && onToggle()}
        className={cn(
          'relative flex flex-shrink-0 items-center gap-2 rounded-[10px] font-body text-sm font-bold capitalize leading-snug tracking-[0.04em] transition-[background,color,box-shadow] duration-200 ease-standard',
          expanded ? 'mx-4 mb-2 mt-3 h-11 px-[18px]' : 'mx-auto mb-2 mt-3 size-11 justify-center p-0',
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
          'scroll-none flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden pb-5 pt-2',
          SCROLL_FADE,
          expanded ? 'px-3' : 'px-2',
        )}
      >
        <OpenRequest.Provider value={requested}>
          {expanded
            ? NAV.map((section) => (
                <SidebarSection
                  key={section.section}
                  section={section}
                  open={openSection === section.section}
                  holdsActive={section.section === activeSection}
                  onToggle={() => {
                    setRequested(null);
                    setOpenSection((current) => (current === section.section ? null : section.section));
                  }}
                />
              ))
            : NAV.map((section, i) => (
                <div
                  key={section.section}
                  className={cn('flex flex-col', i > 0 && 'mt-1.5 border-t border-border-1 pt-1.5')}
                >
                  {section.children.map((node) => (
                    <SidebarNode
                      key={node.label}
                      node={node}
                      depth={1}
                      expanded={false}
                      open={false}
                      onToggle={() => openFromRail(section.section, node.label)}
                    />
                  ))}
                </div>
              ))}
        </OpenRequest.Provider>
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
          title="Keluar"
          className="flex size-9 items-center justify-center rounded-md text-fg-3 transition-colors duration-200 ease-standard hover:bg-bg-app hover:text-error-700"
        >
          <LogOut className="size-[18px]" />
        </button>
        {expanded && <span className="font-body text-[11px] font-medium text-fg-4">Company ID: {companyId}</span>}
      </footer>
    </aside>
  );
}

/** Judul section yang bisa dilipat; isinya menjorok dengan garis pandu supaya levelnya terbaca. */
function SidebarSection({
  section,
  open,
  holdsActive,
  onToggle,
}: {
  section: NavSection;
  open: boolean;
  holdsActive: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex flex-col">
      <button
        type="button"
        aria-expanded={open}
        title={section.section}
        onClick={onToggle}
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left font-body text-[13px] font-semibold transition-colors duration-200 ease-standard hover:bg-secondary-700/[0.06]',
          open ? 'text-secondary-800' : 'text-fg-3',
        )}
      >
        <span className="flex-1 truncate">{section.section}</span>
        {holdsActive && !open && <span className="size-1.5 shrink-0 rounded-full bg-secondary-500" aria-hidden />}
        <ChevronDown
          className={cn(
            'size-4 shrink-0 transition-transform duration-200 ease-standard',
            open ? 'rotate-180 text-secondary-700' : 'text-fg-4',
          )}
        />
      </button>
      {open && (
        <div className="mb-1.5 ml-4 flex flex-col border-l-[1.5px] border-secondary-700/15 pl-1.5">
          <NodeList nodes={section.children} depth={1} />
        </div>
      )}
    </div>
  );
}

/**
 * Saudara satu level berbagi satu `openKey` — membuka satu grup menutup grup lain. Grup yang diminta
 * dari sidebar ciut (`OpenRequest`) atau yang berisi halaman aktif terbuka lebih dulu.
 */
function NodeList({ nodes, depth }: { nodes: NavLeaf[]; depth: number }) {
  const location = useLocation();
  const requested = useContext(OpenRequest);
  const requestedKey = nodes.some((node) => node.label === requested && node.children?.length) ? requested : null;
  const activeKey = nodes.find((node) => node.children?.length && containsPath(node, location.pathname))?.label ?? null;
  const [openKey, setOpenKey] = useState<string | null>(requestedKey ?? activeKey);
  useEffect(() => {
    if (activeKey) setOpenKey(activeKey);
  }, [activeKey]);
  useEffect(() => {
    if (requestedKey) setOpenKey(requestedKey);
  }, [requestedKey]);

  return (
    <>
      {nodes.map((node) => (
        <SidebarNode
          key={node.label}
          node={node}
          depth={depth}
          expanded
          open={openKey === node.label}
          onToggle={() => setOpenKey((current) => (current === node.label ? null : node.label))}
        />
      ))}
    </>
  );
}

function SidebarNode({
  node,
  depth,
  expanded,
  open,
  onToggle,
}: {
  node: NavLeaf;
  depth: number;
  expanded: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const hasKids = Boolean(node.children?.length);

  if (!expanded && depth > 1) return null;

  if (hasKids) {
    return (
      <div className="flex flex-col">
        <button
          type="button"
          aria-expanded={expanded ? open : undefined}
          title={node.label}
          onClick={onToggle}
          className={cn(
            'inline-flex w-full items-center gap-2.5 overflow-hidden whitespace-nowrap rounded-md border-none bg-transparent text-left font-body text-sm font-bold capitalize tracking-[0.04em] text-secondary-700 transition-colors duration-200 ease-standard hover:bg-secondary-700/[0.07]',
            expanded ? 'min-h-10 px-3 py-1.5' : 'mx-auto my-0.5 size-11 justify-center p-0',
          )}
        >
          <NavIcon name={node.icon} className={cn('shrink-0', expanded ? 'size-5' : 'size-[22px]')} />
          {expanded && (
            <>
              <span className="flex-1 overflow-hidden text-ellipsis">{node.label}</span>
              <ChevronDown
                className={cn(
                  'size-[18px] shrink-0 text-fg-4 transition-transform duration-200 ease-standard',
                  open && 'rotate-180 text-secondary-700',
                )}
              />
            </>
          )}
        </button>
        {expanded && open && (
          <div className="ml-[26px] flex flex-col border-l-[1.5px] border-secondary-700/20 pl-0.5">
            <NodeList nodes={node.children!} depth={depth + 1} />
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
        title={`${node.label} — belum ada halaman`}
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
      title={node.label}
      onClick={() => navigate(node.path!)}
      className={cn(
        'inline-flex w-full items-center gap-2.5 overflow-hidden whitespace-nowrap rounded-md border-none bg-transparent text-left font-body text-sm font-medium text-secondary-700 transition-colors duration-200 ease-standard hover:bg-secondary-700/[0.07]',
        expanded ? 'min-h-9 px-3 py-1.5' : 'mx-auto my-0.5 size-11 justify-center p-0',
        depth === 1 && 'min-h-10 font-bold',
        /* Baris aktif mempertahankan latarnya saat di-hover. Tanpa ini,
           `hover:bg-…` yang generik menang atas gradien dan menyisakan teks
           putih di atas latar nyaris putih. */
        isOn &&
          depth > 1 &&
          '-ml-0.5 rounded-l-none pl-3.5 text-cloud [background:linear-gradient(90deg,#026A9F_0%,#026A9F_34%,rgba(2,106,159,0)_100%)] hover:text-cloud hover:[background:linear-gradient(90deg,#01598A_0%,#01598A_34%,rgba(2,106,159,0)_100%)]',
        isOn &&
          depth === 1 &&
          'text-white [background:var(--bg-primary-btn)] [box-shadow:var(--shadow-primary)] hover:text-white hover:[background:var(--bg-primary-btn-hover)] hover:[box-shadow:var(--shadow-primary-hover)]',
      )}
    >
      <NavIcon name={node.icon} className={cn('shrink-0', expanded ? 'size-5' : 'size-[22px]')} />
      {expanded && <span className="flex-1 overflow-hidden text-ellipsis">{node.label}</span>}
    </button>
  );
}
