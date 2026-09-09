import { Check } from 'lucide-react';
import { STEP_TITLES } from '@/features/new-joiner/addEmployee';
import { cn } from '@/lib/utils';

/**
 * Stepper horizontal — port `.stepper` / `.step`: bulatan bernomor + garis
 * penghubung, label "Step n" di atas nama langkah. Langkah yang sudah dilewati
 * bisa diklik untuk kembali; langkah di depan hanya lewat tombol Next supaya
 * validasi per langkah tidak terlewat.
 */
export function AddEmployeeStepper({
  current,
  onSelect,
}: {
  current: number;
  onSelect: (step: number) => void;
}) {
  return (
    <ol className="flex flex-wrap gap-x-2 gap-y-4">
      {STEP_TITLES.map((title, index) => {
        const done = index < current;
        const active = index === current;
        const last = index === STEP_TITLES.length - 1;

        return (
          <li key={title} className="flex min-w-[168px] flex-1 flex-col gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={index > current}
                onClick={() => onSelect(index)}
                className={cn(
                  'grid size-7 shrink-0 place-items-center rounded-full font-body text-xs font-bold transition-colors duration-200 ease-standard',
                  done && 'bg-success-500 text-white',
                  active && 'bg-secondary-500 text-white',
                  !done && !active && 'bg-vapor text-fg-3',
                  index > current && 'cursor-not-allowed',
                )}
                aria-current={active ? 'step' : undefined}
              >
                {done ? <Check className="size-4" /> : index + 1}
              </button>
              {!last && (
                <span className={cn('h-0.5 flex-1 rounded-pill', done ? 'bg-success-500' : 'bg-fog')} />
              )}
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-body text-[11px] font-bold uppercase tracking-[0.05em] text-fg-4">
                Step {index + 1}
              </span>
              <span
                className={cn(
                  'font-body text-[13px] font-bold',
                  active || done ? 'text-fg-1' : 'text-fg-3',
                )}
              >
                {title}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
