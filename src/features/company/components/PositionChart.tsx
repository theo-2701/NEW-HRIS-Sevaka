import { Pencil } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { cn } from '@/lib/utils';
import type { GroupPosition } from '@/features/company/types';

/** Aksen atas per urutan level (1 = jenjang tertinggi); berulang bila level lebih dari lima. */
const LEVEL_ACCENT = [
  'border-t-secondary-700',
  'border-t-secondary-500',
  'border-t-success-600',
  'border-t-warning-600',
  'border-t-steel',
];

/** Jumlah orang (posisi terisi) di seluruh cabang di bawah sebuah posisi — tidak termasuk posisi itu sendiri. */
function peopleBelow(position: GroupPosition, positions: GroupPosition[]): number {
  return positions
    .filter((row) => row.parentId === position.id)
    .reduce((sum, child) => sum + (child.employeeId ? 1 : 0) + peopleBelow(child, positions), 0);
}

/**
 * Di luar dokumen kontrak — diminta pengguna 23 September 2026: bagan organisasi sederhana
 * untuk tab Position, sebagai alternatif Table View. Dibangun dari CSS murni (tanpa pustaka
 * bagan) karena posisi di sini sedikit; bukan pengganti Table View untuk data besar.
 *
 * UI review: tiap kartu memperlihatkan jumlah bawahan langsung dan jumlah orang di bawahnya;
 * `levelOrder` (opsional) memberi aksen warna per level. Edit langsung di bagan belum diputuskan —
 * yang ada tetap ikon pensil yang membuka form posisi.
 */
export function PositionChart({
  positions,
  levelName,
  levelOrder,
  onEdit,
}: {
  positions: GroupPosition[];
  levelName: (id: string) => string;
  levelOrder?: (id: string) => number;
  onEdit: (position: GroupPosition) => void;
}) {
  const roots = positions.filter((row) => !row.parentId || !positions.some((item) => item.id === row.parentId));

  if (roots.length === 0) {
    return <p className="font-body text-sm text-fg-4">Belum ada posisi pada group ini.</p>;
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex w-fit min-w-full justify-center gap-10 px-2">
        {roots.map((root) => (
          <PositionNode
            key={root.id}
            position={root}
            positions={positions}
            levelName={levelName}
            levelOrder={levelOrder}
            onEdit={onEdit}
          />
        ))}
      </div>
    </div>
  );
}

function PositionNode({
  position,
  positions,
  levelName,
  levelOrder,
  onEdit,
}: {
  position: GroupPosition;
  positions: GroupPosition[];
  levelName: (id: string) => string;
  levelOrder?: (id: string) => number;
  onEdit: (position: GroupPosition) => void;
}) {
  const children = positions.filter((row) => row.parentId === position.id);
  const people = peopleBelow(position, positions);
  const order = levelOrder?.(position.groupStructLevelId) ?? 0;
  const accent = order > 0 ? LEVEL_ACCENT[(order - 1) % LEVEL_ACCENT.length] : undefined;

  return (
    <div className="flex flex-col items-center">
      <div
        className={cn(
          'group relative flex w-[200px] flex-col gap-1 rounded-md border border-border-1 bg-white px-3 py-2.5 shadow-sm',
          position.canSignLetter && 'border-secondary-300',
          accent && cn('border-t-4', accent),
        )}
      >
        <button
          type="button"
          onClick={() => onEdit(position)}
          className="absolute right-2 top-2 text-fg-4 opacity-0 transition-opacity group-hover:opacity-100 hover:text-secondary-600"
          aria-label={`Ubah ${position.positionName}`}
        >
          <Pencil className="size-3.5" />
        </button>
        <span className="pr-4 font-body text-[13px] font-bold text-fg-1">{position.positionName}</span>
        <span className="font-body text-[11px] font-medium text-fg-4">{levelName(position.groupStructLevelId)}</span>
        <div className="flex items-center gap-1.5">
          {position.employeeInfo ? (
            <span className="truncate font-body text-[11px] font-semibold text-fg-2">{position.employeeInfo.nama}</span>
          ) : (
            <StatusBadge tone="warn">Belum terisi</StatusBadge>
          )}
          {position.canSignLetter && <StatusBadge tone="ok">TTD</StatusBadge>}
        </div>
        <div
          className="mt-1 flex items-center gap-2 border-t border-border-1 pt-1.5 font-body text-[11px] font-semibold text-fg-3"
          title={`${children.length} posisi bawahan langsung · ${people} orang terisi di seluruh posisi di bawahnya`}
        >
          <span>
            <b className="tabular-nums text-fg-1">{children.length}</b> bawahan
          </span>
          <span aria-hidden className="text-fog">
            ·
          </span>
          <span>
            <b className="tabular-nums text-fg-1">{people}</b> orang
          </span>
        </div>
      </div>

      {children.length > 0 && (
        <>
          <div className="h-4 w-px bg-border-1" />
          <div className="flex gap-8">
            {children.map((child) => (
              <div key={child.id} className="relative flex flex-col items-center pt-4">
                <div className="absolute top-0 h-4 w-px bg-border-1" />
                <PositionNode
                  position={child}
                  positions={positions}
                  levelName={levelName}
                  levelOrder={levelOrder}
                  onEdit={onEdit}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
