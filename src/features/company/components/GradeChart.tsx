import { Fragment, useState } from 'react';
import { Button } from '@/components/ui/button';
import { compareGradeCode } from '@/features/company/rules';
import type { JobGrade } from '@/features/company/types';

const ZOOMS = [0.6, 0.8, 1, 1.2, 1.4] as const;

/** Garis dari tiap Grade ke SELURUH Grade satu tingkat di bawahnya — kolom setara lebar, jadi titik tengahnya pasti. */
function Connector({ from, to }: { from: number; to: number }) {
  const center = (index: number, count: number) => ((index + 0.5) / count) * 100;
  return (
    <svg aria-hidden="true" viewBox="0 0 100 40" preserveAspectRatio="none" className="block h-10 w-full">
      {Array.from({ length: from }, (_, upper) =>
        Array.from({ length: to }, (_, lower) => (
          <line
            key={`${upper}-${lower}`}
            x1={center(upper, from)}
            y1={0}
            x2={center(lower, to)}
            y2={40}
            className="stroke-silver"
            strokeWidth={1.25}
            vectorEffect="non-scaling-stroke"
          />
        )),
      )}
    </svg>
  );
}

/**
 * Chart View tab Grade — FSD-COMPANY 0.59 §3 (`GC-1b`): bagan tangga tingkat baca-saja. Satu baris per nomor
 * tingkat (1 di atas), Grade setara sejajar urut kode, hanya Grade (tanpa Class), seluruh Grade aktif lepas dari
 * halaman/cari tabel. Bisa diperbesar/diperkecil; kotak tidak dapat diseret — penyuntingan tetap di Table View.
 */
export function GradeChart({ grades }: { grades: JobGrade[] }) {
  const [zoomIndex, setZoomIndex] = useState(2);
  const active = grades.filter((row) => row.parentId === null && row.isActive);
  if (active.length === 0) {
    return (
      <p className="m-0 rounded-lg border border-dashed border-border-1 py-10 text-center font-body text-[13px] font-medium text-fg-3">
        There are no active grades to show in the chart yet.
      </p>
    );
  }
  const levels = [...new Set(active.map((row) => row.sortOrder))].sort((a, b) => a - b);
  const rows = levels.map((level) =>
    active.filter((row) => row.sortOrder === level).sort((a, b) => compareGradeCode(a.gradeCode, b.gradeCode)),
  );
  const zoom = ZOOMS[zoomIndex];

  return (
    <div className="relative rounded-lg border border-border-1 bg-cloud">
      <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
        <Button variant="secondary" className="h-8 min-w-0 px-3" aria-label="Zoom out" disabled={zoomIndex === 0} onClick={() => setZoomIndex((i) => i - 1)}>
          −
        </Button>
        <Button variant="secondary" className="h-8 min-w-0 px-3" aria-label="Reset zoom" onClick={() => setZoomIndex(2)}>
          <span className="tabular-nums">{Math.round(zoom * 100)}%</span>
        </Button>
        <Button
          variant="secondary"
          className="h-8 min-w-0 px-3"
          aria-label="Zoom in"
          disabled={zoomIndex === ZOOMS.length - 1}
          onClick={() => setZoomIndex((i) => i + 1)}
        >
          +
        </Button>
      </div>
      <div className="max-h-[560px] overflow-auto px-6 pb-8 pt-16">
        <div className="mx-auto w-max min-w-full origin-top transition-transform duration-200 ease-standard" style={{ transform: `scale(${zoom})` }}>
          {rows.map((row, index) => (
            <Fragment key={row[0].sortOrder}>
              <div className="grid" style={{ gridTemplateColumns: `repeat(${row.length}, minmax(200px, 1fr))` }}>
                {row.map((grade) => (
                  <div key={grade.id} className="flex justify-center px-3">
                    <div className="flex w-[176px] flex-col gap-1 rounded-lg border border-primary-200 bg-bg-surface px-3.5 py-3 text-center shadow-card-sm">
                      <span className="font-display text-sm font-bold leading-tight text-fg-1">{grade.name}</span>
                      <span className="font-mono text-xs font-semibold text-secondary-700">{grade.gradeCode}</span>
                      <span className="font-body text-[11px] font-medium text-fg-3">Level {grade.sortOrder}</span>
                    </div>
                  </div>
                ))}
              </div>
              {index < rows.length - 1 && <Connector from={row.length} to={rows[index + 1].length} />}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
