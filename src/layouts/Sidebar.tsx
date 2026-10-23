import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LayoutGrid, LogOut, PanelLeftClose, Search, X } from 'lucide-react';
import { flattenNav, navForPath, type NavLeaf, type NavPathEntry, type NavSection } from '@/config/nav';
import { NavIcon } from '@/components/NavIcon';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';
import { useLogout } from '@/features/auth/hooks/useAuth';

interface SidebarProps {
  expanded: boolean;
  onToggle: () => void;
}

/**
 * Cari menu: setiap kata harus muncul di rantai label (section › grup › menu), tanpa peduli huruf
 * besar/kecil — "time req" menemukan Time Management › Time Off › Time Off Request. Hanya menu yang
 * punya halaman yang ikut dicari.
 */
function searchNav(nav: NavSection[], query: string): NavPathEntry[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return flattenNav(nav).filter((entry) => {
    const haystack = entry.trail.join(' ').toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
}

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
 * - Kepala sidebar = kotak "Cari menu" + tombol collapse (logo perusahaan dihapus atas permintaan Theo,
 *   8 Okt 2026). Mengetik mengganti pohon menu dengan daftar hasil; Enter membuka hasil pertama, Esc
 *   mengosongkan. Saat ciut, ikon cari melebarkan sidebar lalu langsung fokus ke kotak cari.
 * - Section bisa dilipat, **buka satu tutup satu**; grup di dalamnya juga akordeon antar-saudara.
 *   Isi section menjorok dengan garis pandu supaya hierarkinya tetap terbaca. Section `flat`
 *   (produk satu-section, mis. Performance) langsung menampilkan menunya tanpa judul section.
 * - Label yang terpotong tampil utuh saat di-hover; area menu digulir tanpa scrollbar.
 * Pohon menunya sendiri tidak berubah — hanya cara menampilkannya.
 * Collapsed 84px (hanya baris depth-1 sebagai ikon 44×44) ↔ expanded 264px.
 */
export function Sidebar({ expanded, onToggle }: SidebarProps) {
  const location = useLocation();
  const logout = useLogout();
  const navigate = useNavigate();
  const companyId = useAuthStore((s) => s.companyId) ?? 'DIKA';

  const nav = navForPath(location.pathname);

  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  /** Ikon cari di sidebar ciut: lebarkan dulu, baru fokus ke kotak cari. */
  const focusOnExpand = useRef(false);
  useEffect(() => {
    if (expanded && focusOnExpand.current) {
      focusOnExpand.current = false;
      searchRef.current?.focus();
    }
  }, [expanded]);
  const results = useMemo(() => searchNav(nav, query), [nav, query]);
  const searching = expanded && query.trim().length > 0;
  const openResult = (path: string) => {
    setQuery('');
    navigate(path);
  };
  const activeSection = nav.find((section) =>
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
      {/* ---- Header: cari menu + collapse ---- */}
      {expanded ? (
        <div className="flex min-h-16 flex-shrink-0 items-center gap-1.5 border-b border-border-1 py-3 pl-3.5 pr-2">
          <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border border-silver bg-cloud px-2.5 transition-[border-color,box-shadow] duration-200 ease-standard focus-within:border-secondary-500 focus-within:shadow-[0_0_0_4px_rgba(2,132,199,.16)]">
            <Search className="size-4 shrink-0 text-fg-3" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setQuery('');
                if (event.key === 'Enter' && results[0]) openResult(results[0].path);
              }}
              placeholder="Search menu"
              aria-label="Search menu"
              className="min-w-0 flex-1 border-none bg-transparent font-body text-[13px] font-medium leading-[1.4] text-fg-2 outline-none placeholder:text-fg-4 [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setQuery('');
                  searchRef.current?.focus();
                }}
                className="inline-flex size-4 shrink-0 items-center justify-center text-fg-4 transition-colors duration-200 ease-standard hover:text-fg-2 [&_svg]:size-3.5"
              >
                <X />
              </button>
            )}
          </label>
          <button
            type="button"
            aria-label="Close sidebar"
            title="Close sidebar"
            onClick={onToggle}
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-fg-3 transition-colors duration-200 ease-standard hover:bg-bg-app hover:text-secondary-700"
          >
            <PanelLeftClose className="size-[18px]" strokeWidth={1.75} />
          </button>
        </div>
      ) : (
        <div className="flex min-h-16 flex-shrink-0 items-center justify-center border-b border-border-1 px-2 py-3">
          <button
            type="button"
            aria-label="Search menu"
            title="Search menu"
            onClick={() => {
              focusOnExpand.current = true;
              onToggle();
            }}
            className="flex size-11 items-center justify-center rounded-[10px] text-secondary-700 transition-colors duration-200 ease-standard hover:bg-bg-app"
          >
            <Search className="size-[22px]" />
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
          {searching ? (
            <SearchResults results={results} query={query} activePath={location.pathname} onOpen={openResult} />
          ) : expanded ? (
            nav.map((section) =>
              section.flat ? (
                <div key={section.section} className="flex flex-col">
                  <NodeList nodes={section.children} depth={1} />
                </div>
              ) : (
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
              ),
            )
          ) : (
            nav.map((section, i) => (
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
            ))
          )}
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
          onClick={() => logout.mutate()}
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
        title={`${node.label} — no page yet`}
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

/** Hasil cari menu — label tebal + jejak induknya; menu yang sedang dibuka ditandai. */
function SearchResults({
  results,
  query,
  activePath,
  onOpen,
}: {
  results: NavPathEntry[];
  query: string;
  activePath: string;
  onOpen: (path: string) => void;
}) {
  if (!results.length) {
    return (
      <p className="m-0 px-3 py-6 text-center font-body text-[13px] font-medium text-fg-3">
        No menu matches &ldquo;{query.trim()}&rdquo;.
      </p>
    );
  }
  return (
    <>
      <span className="px-3 pb-1 font-body text-[11px] font-semibold text-fg-4">{results.length} menus found</span>
      {results.map((entry) => (
        <button
          key={entry.path}
          type="button"
          onClick={() => onOpen(entry.path)}
          className={cn(
            'flex w-full flex-col items-start gap-0.5 rounded-md px-3 py-2 text-left transition-colors duration-200 ease-standard hover:bg-secondary-700/[0.07]',
            entry.path === activePath && 'bg-primary-50',
          )}
        >
          <span className="font-body text-sm font-bold text-secondary-700">{entry.label}</span>
          <span className="font-body text-[11px] font-medium leading-snug text-fg-3">
            {entry.trail.slice(0, -1).join(' › ')}
          </span>
        </button>
      ))}
    </>
  );
}
