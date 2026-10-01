import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { Card, CardHead } from '@/components/Card';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

type OrgLevel = 'Company' | 'Directorate' | 'Division' | 'Branch';

interface OrgNode {
  id: string;
  name: string;
  level: OrgLevel;
  head: string;
  headTitle?: string;
  /** Hanya simpul daun yang menyimpan jumlah orang; induk menjumlahkan anak-anaknya. */
  headcount?: number;
  children?: OrgNode[];
}

/**
 * DATA CONTOH — belum ada endpoint pohon organisasi. Nama unit cabang mengikuti `BRANCHES`
 * supaya cocok dengan filter Directory; nama kepala unit fiktif.
 */
const ORG: OrgNode = {
  id: 'co',
  name: 'PT Sevaka Nusantara',
  level: 'Company',
  head: 'Hendra Wijaya',
  headTitle: 'President Director',
  children: [
    {
      id: 'dir-ops',
      name: 'Operations',
      level: 'Directorate',
      head: 'Rina Kartika',
      children: [
        {
          id: 'div-network',
          name: 'Branch Network',
          level: 'Division',
          head: 'Budi Santoso',
          children: [
            { id: 'br-jkt', name: 'HO-Jakarta', level: 'Branch', head: 'Agus Pratama', headcount: 64 },
            { id: 'br-sby', name: 'BR-Surabaya', level: 'Branch', head: 'Dewi Lestari', headcount: 38 },
            { id: 'br-bdg', name: 'BR-Bandung', level: 'Branch', head: 'Yusuf Hidayat', headcount: 27 },
            { id: 'br-papua', name: 'BR-Papua', level: 'Branch', head: 'Maria Wonda', headcount: 15 },
          ],
        },
        { id: 'div-logistics', name: 'Logistics', level: 'Division', head: 'Fajar Nugroho', headcount: 22 },
      ],
    },
    {
      id: 'dir-fin',
      name: 'Finance',
      level: 'Directorate',
      head: 'Sari Anggraini',
      children: [
        { id: 'div-accounting', name: 'Accounting & Tax', level: 'Division', head: 'Indra Gunawan', headcount: 12 },
        { id: 'div-treasury', name: 'Treasury', level: 'Division', head: 'Lina Marlina', headcount: 6 },
      ],
    },
    {
      id: 'dir-hc',
      name: 'Human Capital',
      level: 'Directorate',
      head: 'Eka Putri',
      children: [
        { id: 'div-hr-ops', name: 'HR Operations', level: 'Division', head: 'Rudi Hartono', headcount: 9 },
        { id: 'div-talent', name: 'Talent & Learning', level: 'Division', head: 'Nadia Safitri', headcount: 5 },
      ],
    },
  ],
};

/** Aksen atas per level — palet yang sama dengan bagan posisi di Group Structure. */
const LEVEL_ACCENT: Record<OrgLevel, string> = {
  Company: 'border-t-secondary-700',
  Directorate: 'border-t-secondary-500',
  Division: 'border-t-success-600',
  Branch: 'border-t-warning-600',
};

/** Garis penghubung bagan. */
const LINE = 'bg-silver';

function total(node: OrgNode): number {
  return node.children ? node.children.reduce((sum, child) => sum + total(child), 0) : (node.headcount ?? 0);
}

function collectParents(node: OrgNode, into: string[] = []): string[] {
  if (node.children?.length) {
    into.push(node.id);
    node.children.forEach((child) => collectParents(child, into));
  }
  return into;
}

const ALL_PARENTS = collectParents(ORG);
/** Awalnya terbuka sampai level Directorate — bagan muat di layar tanpa digulir menyamping. */
const INITIAL_OPEN = [ORG.id];

function UnitCard({ node }: { node: OrgNode }) {
  const units = node.children?.length ?? 0;
  return (
    <div
      className={cn(
        'flex w-[208px] flex-col gap-2 rounded-md border border-t-4 border-border-1 bg-bg-surface px-3 py-2.5 shadow-card-sm',
        LEVEL_ACCENT[node.level],
      )}
    >
      <div className="flex flex-col">
        <span className="font-body text-[13px] font-bold leading-tight text-fg-1">{node.name}</span>
        <span className="font-body text-[11px] font-medium text-fg-4">{node.level}</span>
      </div>
      <div className="flex items-center gap-2">
        <Avatar name={node.head} size="sm" />
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-body text-xs font-semibold text-fg-2">{node.head}</span>
          <span className="truncate font-body text-[11px] font-medium text-fg-4">{node.headTitle ?? 'Kepala unit'}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-border-1 pt-1.5 font-body text-[11px] font-semibold text-fg-3">
        <span>
          <b className="tabular-nums text-fg-1">{formatNumber(total(node))}</b> orang
        </span>
        {units > 0 && (
          <>
            <span aria-hidden className="text-fog">
              ·
            </span>
            <span>
              <b className="tabular-nums text-fg-1">{units}</b> unit
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function ChartNode({ node, open, onToggle }: { node: OrgNode; open: Set<string>; onToggle: (id: string) => void }) {
  const children = node.children ?? [];
  const expanded = open.has(node.id);

  return (
    <div className="flex flex-col items-center">
      <UnitCard node={node} />
      {children.length > 0 && (
        <>
          <div className={cn('h-3 w-px', LINE)} />
          <button
            type="button"
            aria-expanded={expanded}
            aria-label={expanded ? `Tutup unit di bawah ${node.name}` : `Buka ${children.length} unit di bawah ${node.name}`}
            onClick={() => onToggle(node.id)}
            className="inline-flex h-6 min-w-6 items-center justify-center gap-0.5 rounded-pill border border-silver bg-bg-surface px-1.5 font-body text-[11px] font-bold text-secondary-700 transition-colors duration-200 ease-standard hover:bg-mist [&_svg]:size-3"
          >
            {expanded ? <Minus /> : <Plus />}
            {!expanded && children.length}
          </button>
        </>
      )}
      {children.length > 0 && expanded && (
        <>
          <div className={cn('h-3 w-px', LINE)} />
          <div className="flex">
            {children.map((child, index) => (
              <div key={child.id} className="relative flex flex-col items-center px-3 pt-4">
                {index > 0 && <span aria-hidden className={cn('absolute left-0 right-1/2 top-0 h-px', LINE)} />}
                {index < children.length - 1 && (
                  <span aria-hidden className={cn('absolute left-1/2 right-0 top-0 h-px', LINE)} />
                )}
                <span aria-hidden className={cn('absolute left-1/2 top-0 h-4 w-px', LINE)} />
                <ChartNode node={child} open={open} onToggle={onToggle} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Tab Organization — bagan pohon organisasi baca-saja (dummy) sampai company-service menyediakan
 * strukturnya: kartu per unit (kepala unit, jumlah orang, jumlah sub-unit) dihubungkan garis, dan
 * tiap cabang bisa dibuka-tutup. Tabel berbentuk pohon untuk posisi ada di Group Structure ›
 * Position › Table View.
 */
export function OrganizationTree() {
  const [open, setOpen] = useState<Set<string>>(() => new Set(INITIAL_OPEN));
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allOpen = open.size === ALL_PARENTS.length;

  return (
    <Card>
      <CardHead
        title="Struktur organisasi"
        sub="Baca-saja · data contoh sampai struktur dari company-service tersedia. Jumlah orang = total semua unit di bawahnya."
        action={
          <Button variant="ghost" onClick={() => setOpen(new Set(allOpen ? INITIAL_OPEN : ALL_PARENTS))}>
            {allOpen ? 'Collapse all' : 'Expand all'}
          </Button>
        }
      />
      <div className="overflow-x-auto pb-4">
        <div className="flex w-fit min-w-full justify-center px-2 pt-2">
          <ChartNode node={ORG} open={open} onToggle={toggle} />
        </div>
      </div>
    </Card>
  );
}
