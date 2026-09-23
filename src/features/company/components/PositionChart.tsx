import { Pencil } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { cn } from '@/lib/utils';
import type { GroupPosition } from '@/features/company/types';

/**
 * Di luar dokumen kontrak — diminta pengguna 23 September 2026: bagan organisasi sederhana
 * untuk tab Position, sebagai alternatif Table View. Dibangun dari CSS murni (tanpa pustaka
 * bagan) karena posisi di sini sedikit; bukan pengganti Table View untuk data besar.
 */
export function PositionChart({
  positions,
  levelName,
  onEdit,
}: {
  positions: GroupPosition[];
  levelName: (id: string) => string;
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
          <PositionNode key={root.id} position={root} positions={positions} levelName={levelName} onEdit={onEdit} />
        ))}
      </div>
    </div>
  );
}

function PositionNode({
  position,
  positions,
  levelName,
  onEdit,
}: {
  position: GroupPosition;
  positions: GroupPosition[];
  levelName: (id: string) => string;
  onEdit: (position: GroupPosition) => void;
}) {
  const children = positions.filter((row) => row.parentId === position.id);

  return (
    <div className="flex flex-col items-center">
      <div
        className={cn(
          'group relative flex w-[190px] flex-col gap-1 rounded-md border border-border-1 bg-white px-3 py-2.5 shadow-sm',
          position.canSignLetter && 'border-secondary-300',
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
      </div>

      {children.length > 0 && (
        <>
          <div className="h-4 w-px bg-border-1" />
          <div className="flex gap-8">
            {children.map((child) => (
              <div key={child.id} className="relative flex flex-col items-center pt-4">
                <div className="absolute top-0 h-4 w-px bg-border-1" />
                <PositionNode position={child} positions={positions} levelName={levelName} onEdit={onEdit} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
