import { Fragment } from 'react';
import { ChevronDown } from 'lucide-react';
import type { JobGrade } from '@/features/company/types';

/**
 * Chart View tab Grade (UIC-COMPANY 0.46 §2.4, CMP-2610241547 T38): bagan tangga baca-saja.
 * Satu baris per nomor tingkat (`sortOrder`), Grade setara sejajar urut kode, tingkat tertinggi
 * di atas; tiap tingkat tersambung ke seluruh Grade satu tingkat di bawahnya. Hanya Grade.
 */
export function GradeLadderChart({ grades, classCount }: { grades: JobGrade[]; classCount: (id: string) => number }) {
  const tiers = [...new Set(grades.map((row) => row.sortOrder))].sort((a, b) => b - a);
  if (!tiers.length) {
    return <p className="py-10 text-center font-body text-[13px] font-medium text-fg-3">Belum ada Grade.</p>;
  }

  return (
    <div role="list" aria-label="Grade ladder" className="flex flex-col items-center gap-1 overflow-x-auto py-4">
      {tiers.map((tier, index) => (
        <Fragment key={tier}>
          {index > 0 && <ChevronDown aria-hidden className="size-5 text-border-2" strokeWidth={1.75} />}
          <div className="flex items-stretch gap-3">
            <span className="flex w-20 items-center justify-end whitespace-nowrap font-body text-[11px] font-bold uppercase tracking-[0.06em] text-fg-4">
              Tingkat {tier}
            </span>
            {grades
              .filter((row) => row.sortOrder === tier)
              .sort((a, b) => a.gradeCode.localeCompare(b.gradeCode))
              .map((row) => (
                <div
                  role="listitem"
                  key={row.id}
                  className="flex min-w-[180px] flex-col gap-1 rounded-md border border-border-1 bg-bg-surface px-4 py-3 shadow-card-sm"
                >
                  <span className="font-body text-[13px] font-bold text-fg-1">{row.name}</span>
                  <span className="font-body text-xs font-medium text-fg-3">
                    <span className="font-mono">{row.gradeCode}</span> · {classCount(row.id)} Class
                  </span>
                </div>
              ))}
          </div>
        </Fragment>
      ))}
    </div>
  );
}
