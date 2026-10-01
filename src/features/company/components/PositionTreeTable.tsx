import { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { RowActions } from '@/components/RowActions';
import { StatusBadge } from '@/components/StatusBadge';
import { usePagedRows } from '@/hooks/usePagedRows';
import { cn } from '@/lib/utils';
import type { GroupPosition } from '@/features/company/types';

interface TreeRow {
  position: GroupPosition;
  depth: number;
  hasChildren: boolean;
}

/**
 * Ratakan pohon posisi jadi baris tabel berurutan induk → anak (depth-first). Saat mencari, yang
 * tampil = posisi yang cocok + semua leluhurnya (supaya letaknya di struktur tetap terbaca), dan
 * semua cabang terbuka. Posisi yang induknya tidak ada di group ini diperlakukan sebagai akar.
 */
function flatten(positions: GroupPosition[], collapsed: Set<string>, query: string): TreeRow[] {
  const byId = new Map(positions.map((row) => [row.id, row]));
  const childrenOf = new Map<string | null, GroupPosition[]>();
  for (const row of positions) {
    const parent = row.parentId && byId.has(row.parentId) ? row.parentId : null;
    const siblings = childrenOf.get(parent) ?? [];
    siblings.push(row);
    childrenOf.set(parent, siblings);
  }

  let keep: Set<string> | null = null;
  if (query) {
    keep = new Set();
    for (const row of positions) {
      if (!row.positionName.toLowerCase().includes(query)) continue;
      let current: GroupPosition | undefined = row;
      while (current && !keep.has(current.id)) {
        keep.add(current.id);
        current = current.parentId ? byId.get(current.parentId) : undefined;
      }
    }
  }

  const out: TreeRow[] = [];
  const walk = (parent: string | null, depth: number) => {
    for (const row of childrenOf.get(parent) ?? []) {
      if (keep && !keep.has(row.id)) continue;
      const kids = (childrenOf.get(row.id) ?? []).filter((kid) => !keep || keep.has(kid.id));
      out.push({ position: row, depth, hasChildren: kids.length > 0 });
      if (kids.length && (keep || !collapsed.has(row.id))) walk(row.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

/**
 * Table View tab Position — tabel berbentuk pohon: posisi bawahan menjorok di bawah atasannya dan
 * cabangnya bisa dibuka-tutup (awal: semua terbuka), jadi kolom "Posisi atasan" tidak diperlukan
 * lagi. Paginasi berjalan atas baris yang sedang terlihat.
 */
export function PositionTreeTable({
  positions,
  loading,
  query,
  levelName,
  onEdit,
  onHistory,
  onDelete,
}: {
  positions: GroupPosition[];
  loading: boolean;
  /** Kata kunci nama posisi (sudah di-trim). */
  query: string;
  levelName: (id: string) => string;
  onEdit: (row: GroupPosition) => void;
  onHistory: (row: GroupPosition) => void;
  onDelete: (row: GroupPosition) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const searching = query.trim().length > 0;
  const rows = useMemo(
    () => flatten(positions, collapsed, query.trim().toLowerCase()),
    [positions, collapsed, query],
  );
  const paged = usePagedRows(rows);

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      <DataTable<TreeRow>
        rows={paged.rows}
        rowKey={(row) => row.position.id}
        loading={loading}
        empty={searching ? 'Tidak ada posisi yang cocok.' : 'Belum ada posisi pada group ini.'}
        columns={[
          {
            key: 'name',
            header: 'Posisi',
            strong: true,
            render: ({ position, depth, hasChildren }) => {
              const open = searching || !collapsed.has(position.id);
              return (
                <div className="flex items-center gap-1.5" style={{ paddingLeft: depth * 22 }}>
                  {hasChildren ? (
                    <button
                      type="button"
                      disabled={searching}
                      aria-expanded={open}
                      aria-label={open ? `Tutup bawahan ${position.positionName}` : `Buka bawahan ${position.positionName}`}
                      onClick={() => toggle(position.id)}
                      className="inline-flex size-6 shrink-0 items-center justify-center rounded-sm text-fg-3 transition-colors duration-200 ease-standard hover:text-secondary-700 disabled:cursor-default disabled:hover:text-fg-3 [&_svg]:size-4"
                    >
                      <ChevronRight className={cn('transition-transform duration-200 ease-standard', open && 'rotate-90')} />
                    </button>
                  ) : (
                    <span className="size-6 shrink-0" aria-hidden />
                  )}
                  <span>{position.positionName}</span>
                </div>
              );
            },
          },
          { key: 'level', header: 'Level', render: ({ position }) => levelName(position.groupStructLevelId) },
          {
            key: 'holder',
            header: 'Pengisi',
            render: ({ position }) =>
              position.employeeInfo ? position.employeeInfo.nama : <StatusBadge tone="warn">Lowong</StatusBadge>,
          },
          {
            key: 'nik',
            header: 'NIK',
            muted: true,
            nowrap: true,
            render: ({ position }) => <span className="font-mono text-xs">{position.employeeInfo?.nik ?? '—'}</span>,
          },
          {
            key: 'supervisor',
            header: 'Atasan saat ini',
            muted: true,
            render: ({ position }) => position.supervisorInfo?.nama ?? '—',
          },
          {
            key: 'sign',
            header: 'Tanda tangan surat',
            align: 'center',
            render: ({ position }) =>
              position.canSignLetter ? <StatusBadge tone="ok">Berwenang</StatusBadge> : <span className="text-fg-4">—</span>,
          },
        ]}
        actions={({ position }) => (
          <RowActions
            actions={[
              { label: 'Ubah', onSelect: () => onEdit(position) },
              { label: 'Riwayat', onSelect: () => onHistory(position) },
              { label: 'Hapus', danger: true, onSelect: () => onDelete(position) },
            ]}
          />
        )}
      />
      <Pagination
        page={paged.page}
        pageSize={paged.pageSize}
        total={paged.total}
        noun="positions"
        onPageChange={paged.setPage}
        onPageSizeChange={paged.setPageSize}
      />
    </>
  );
}
